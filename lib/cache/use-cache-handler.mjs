/* SPDX-License-Identifier: AGPL-3.0-or-later */
/**
 * Next.js useCache cache handler — backed by HarperDB (NextJsUseCache table).
 * Loaded by next.config via "cacheHandlers" (plural). Used for cache() and fetch() under
 * useCache/React Cache API. Implements the Next.js cache provider interface.
 *
 * Cache keys are the full pathname (e.g. /index, /product/foo-123) or tag-based ids.
 * Each entry is a simple stringified JSON object, as we do not use Buffer/Map structures.
 *
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

const LOG_PREFIX = '[NextJsUseCacheHandler]';
function debug(what, keyOrTags, extra = '') {
    const ts = performance.now().toFixed(2);
    console.log(`${LOG_PREFIX} +${ts}ms ${what} ${keyOrTags} ${extra}`.trim());
}

const useCacheHandler = {
    async get(cacheKey, softTags) {
        debug(`${LOG_PREFIX} GET cacheKey=`, cacheKey);
        const tables = getTables();
        const useCache = tables?.NextJsUseCache;
        if (!useCache) {
            console.error(`${LOG_PREFIX} get: NextJsUseCache table not found`);
            debug('MISS', cacheKey, '(no NextJsUseCache)');
            return undefined;
        }

        const entry = await useCache.get(cacheKey);

        if (!entry) {
            debug('MISS', cacheKey, '(no row)');
            return undefined;
        }

        // Deserialize the entry
        let parsed;
        try {
            parsed = JSON.parse(entry.data);
        } catch {
            debug('MISS', cacheKey, '(parse error)');
            return null;
        }

        debug('HIT', cacheKey, `TAGS: ${parsed.tags} EXPIRE: ${parsed.expire}, REVALIDATE: ${parsed.revalidate}`);

        // Reconstruct the ReadableStream from stored data
        return {
            value: new ReadableStream({
                start(controller) {
                    controller.enqueue(Buffer.from(parsed.value, 'base64'))
                    controller.close()
                },
            }),
            stale: parsed.stale,
            timestamp: parsed.timestamp,
            expire: parsed.expire,
            revalidate: parsed.revalidate,
            tags: entry.tags,
        }
    },

    async set(cacheKey, pendingEntry) {
        debug(`${LOG_PREFIX} SET cacheKey=`, cacheKey);
        const tables = getTables();
        const useCache = tables?.NextJsUseCache;
        if (!useCache) {
            console.error(`${LOG_PREFIX} set: NextJsUseCache not found`);
            return;
        }

        const entry = await pendingEntry;

        // Read the stream to get the data
        const reader = entry.value.getReader();
        const chunks = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }

        // Combine chunks and serialize for storage
        const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

        await useCache.put({
            id: cacheKey,
            data: JSON.stringify({
                value: buffer.toString('base64'),
                stale: entry.stale,
                timestamp: entry.timestamp,
                expire: entry.expire,
                revalidate: entry.revalidate,                
            }),
            tags: entry.tags,
        });

        debug(`${LOG_PREFIX} SET COMPLETE`, cacheKey);
    },

    async refreshTags() {
        // No-op for basic implementation
    },

    async getExpiration(tags) {
        // Return 0 to indicate we're not tracking tag revalidation
        return 0;
    },

    async updateTags(tags, durations) {
        if (!Array.isArray(tags) || tags.length === 0) return;

        const tables = getTables();
        const useCache = tables?.NextJsUseCache;
        if (!useCache) {
            console.error(`${LOG_PREFIX} updateTags: NextJsUseCache table not found`);
            return;
        }

        const idsToDelete = new Set();
        for (const tag of tags) {
            try {
                for await (const row of useCache.search({
                    conditions: [{ attribute: 'tags', value: tag }],
                })) {
                    if (row?.id != null) idsToDelete.add(row.id);
                }
            } catch (err) {
                console.error(`${LOG_PREFIX} updateTags search for tag "${tag}":`, err);
            }
        }

        for (const id of idsToDelete) {
            try {
                await useCache.delete(id);
                debug('updateTags deleted', id);
            } catch (err) {
                console.error(`${LOG_PREFIX} updateTags delete "${id}":`, err);
            }
        }
    },
};

export default useCacheHandler;
