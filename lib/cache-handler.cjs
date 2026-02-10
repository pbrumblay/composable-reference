/**
 * Next.js ISR cache handler — backed by HarperDB (IsrCache / IsrCacheTag tables).
 * Required by next.config via cacheHandler. Uses dynamic import('harperdb') so it works
 * when run under harperdb-nextjs where harperdb is provided at runtime.
 *
 * Cache keys are the full pathname (e.g. /index, /product/foo-123). Next.js normalizes
 * them; we store and retrieve by that key so each route has its own entry.
 */

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
    let mod;
    try {
      mod = await import('harperdb');
    } catch (err) {
      console.error('CacheHandler: import(harperdb) failed', err);
      return null;
    }
    const isrCache = mod?.tables?.IsrCache;
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
    let mod;
    try {
      mod = await import('harperdb');
    } catch (err) {
      console.error('CacheHandler: import(harperdb) failed', err);
      return;
    }
    const IsrCache = mod?.tables?.IsrCache;
    const IsrCacheTag = mod?.tables?.IsrCacheTag;
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
    const { tables } = await import('harperdb');
    const IsrCache = tables?.IsrCache;
    const IsrCacheTag = tables?.IsrCacheTag;
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
