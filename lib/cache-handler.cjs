/* SPDX-License-Identifier: AGPL-3.0-or-later */
/**
 * Next.js ISR cache handler — backed by HarperDB (IsrCache / IsrCacheTag tables).
 * Required by next.config via cacheHandler. Uses lazy require via Function to bypass
 * Turbopack's static analysis (which fails to resolve 'harperdb' at build time since
 * harperdb is a virtual module provided by HarperDB at runtime).
 *
 * Cache keys are the full pathname (e.g. /index, /product/foo-123). Next.js normalizes
 * them; we store and retrieve by that key so each route has its own entry.
 */
const requireHarperDb = new Function('r', 'return r("harperdb")');
let tables = null;

function getTables() {
  if (tables === null) {
    const mod = requireHarperDb(require);
    tables = mod?.tables ?? null;
  }
  return tables;
}

function tagId(cacheKey, tag) {
  return `${cacheKey}#${tag}`;
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

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key, _ctx) {
    console.log('CacheHandler CJS get', { key, _ctx });
    const isrCache = getTables()?.IsrCache;
    if (!isrCache) return null;
    const row = await isrCache.get(key);
    if (!row || typeof row.data !== 'string') return null;
    let parsed;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      return null;
    }
    if (parsed?.value) {
      parsed.value = deserializeValue(parsed.value);
    }
    return parsed;
  }

  async set(key, data, ctx) {
    const IsrCache = getTables()?.IsrCache;
    const IsrCacheTag = getTables()?.IsrCacheTag;
    if (!IsrCache || !IsrCacheTag) return;

    const tags = Array.isArray(ctx?.tags) ? ctx.tags : [];
    const valueToStore = serializeValue(data);
    const entry = {
      value: valueToStore,
      lastModified: Date.now(),
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
  }

  async revalidateTag(tagOrTags) {
    const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags];
    const IsrCache = getTables()?.IsrCache;
    const IsrCacheTag = getTables()?.IsrCacheTag;
    if (!IsrCache || !IsrCacheTag) return;

    const keysToDelete = new Set();
    for (const tag of tags) {
      for await (const row of IsrCacheTag.search({ conditions: [{ attribute: 'tag', value: tag }] })) {
        keysToDelete.add(row.cacheKey);
      }
    }
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
};
