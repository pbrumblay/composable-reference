/* SPDX-License-Identifier: AGPL-3.0-or-later */
/**
 * Next.js ISR cache handler — backed by HarperDB (IsrCache / IsrCacheTag tables).
 * Loaded by next.config via cacheHandler. Turbopack analyzes this file from config
 * and tries to resolve imports; the virtual 'harperdb' module isn't resolvable at
 * build time, so we hide the module name (see getTables) and require at runtime.
 * Expects to run under Harper Fabric / harperdb-nextjs.
 *
 * Cache keys are the full pathname (e.g. /index, /product/foo-123). Next.js normalizes
 * them; we store and retrieve by that key so each route has its own entry.
 */
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const requireHarperDb = new Function('r', 'return r("harperdb")');
let tablesCache = null;

function getTables() {
  if (tablesCache === null) {
    const mod = requireHarperDb(require);
    tablesCache = mod?.tables ?? null;
  }
  return tablesCache;
}

function tagId(cacheKey, tag) {
  return `${cacheKey}#${tag}`;
}

const LOG_PREFIX = '[CacheHandler]';
function debug(what, keyOrTags, extra = '') {
  const ts = performance.now().toFixed(2);
  console.log(`${LOG_PREFIX} +${ts}ms ${what} ${keyOrTags} ${extra}`.trim());
}


// Next.js passes value.segmentData as a Map(segmentPath -> Buffer). JSON.stringify
// turns Map into {}, so we must serialize/deserialize it so segmentData.get() works.
function serializeValue(value) {
  if (!value || typeof value !== 'object') return value;
  const out = { ...value };
  if (value.segmentData instanceof Map) {
    const entries = [];
    for (const [path, buf] of value.segmentData) {
      const b64 = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
      entries.push([path, b64]);
    }
    out.segmentData = { __type: 'Map', entries };
  }
  if (Buffer.isBuffer(value.rscData)) {
    out.rscData = { __type: 'Buffer', base64: value.rscData.toString('base64') };
  }
  return out;
}

function deserializeValue(value) {
  if (!value || typeof value !== 'object') return value;
  const out = { ...value };
  if (value.segmentData?.__type === 'Map' && Array.isArray(value.segmentData.entries)) {
    out.segmentData = new Map(
      value.segmentData.entries.map(([path, b64]) => [path, Buffer.from(b64, 'base64')])
    );
  }
  if (value.rscData?.__type === 'Buffer' && typeof value.rscData.base64 === 'string') {
    out.rscData = Buffer.from(value.rscData.base64, 'base64');
  }
  return out;
}

export default class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key, _ctx) {
    debug('[CacheHandler] GET key=', key);
    const tables = getTables();
    const isrCache = tables?.IsrCache;
    if (!isrCache) {
      console.error(`${LOG_PREFIX} get: IsrCache not found`);
      debug('MISS', key, '(no IsrCache)');
      return null;
    }
    const row = await isrCache.get(key);
    if (!row || typeof row.data !== 'string') {
      debug('MISS', key, '(no row or invalid data)');
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      debug('MISS', key, '(parse error)');
      return null;
    }
    if (parsed?.value) {
      parsed.value = deserializeValue(parsed.value);
    }
    const lastModified = parsed?.lastModified ?? row?.lastModified ?? '?';
    debug('HIT', key, `lastModified=${lastModified}`);
    return parsed;
  }

  async set(key, data, ctx) {
    const tables = getTables();
    const IsrCache = tables?.IsrCache;
    const IsrCacheTag = tables?.IsrCacheTag;
    if (!IsrCache || !IsrCacheTag) {
      console.error(`${LOG_PREFIX} set: tables not found`);
      return;
    }

    const tags = Array.isArray(ctx?.tags) ? ctx.tags : [];
    const valueToStore = serializeValue(data);
    const entry = {
      value: valueToStore,
      lastModified: performance.now(),
      tags,
    };
    await IsrCache.put({
      id: key,
      data: JSON.stringify(entry),
      lastModified: entry.lastModified,
    });
    for (const tag of tags) {
      await IsrCacheTag.put({ id: tagId(key, tag), cacheKey: key, tag });
    }
    debug('SET', key, tags.length ? `tags=[${tags.join(', ')}]` : '');
  }

  async revalidateTag(tagOrTags) {
    const tables = getTables();
    const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags];
    const IsrCache = tables?.IsrCache;
    const IsrCacheTag = tables?.IsrCacheTag;
    if (!IsrCache || !IsrCacheTag) {
      console.error(`${LOG_PREFIX} revalidateTag: tables not found`);
      return;
    }

    const keysToDelete = new Set();
    for (const tag of tags) {
      for await (const row of IsrCacheTag.search({ conditions: [{ attribute: 'tag', value: tag }] })) {
        keysToDelete.add(row.cacheKey);
      }
    }
    debug('REVALIDATE', `tags=[${tags.join(', ')}]`, `keys=[${[...keysToDelete].join(', ')}]`);
    for (const key of keysToDelete) {
      await IsrCache.delete(key);
      for await (const row of IsrCacheTag.search({ conditions: [{ attribute: 'cacheKey', value: key }] })) {
        await IsrCacheTag.delete(row.id);
      }
    }
  }

  resetRequestCache() {
    // No request-scoped in-memory cache
  }
}

