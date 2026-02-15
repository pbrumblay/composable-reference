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
	async get(key) {
		debug(`${LOG_PREFIX} GET key=`, key);
		const tables = getTables();
		const useCache = tables?.NextJsUseCache;
		if (!useCache) {
			console.error(`${LOG_PREFIX} get: NextJsUseCache table not found`);
			debug('MISS', key, '(no NextJsUseCache)');
			return undefined;
		}

		const row = await useCache.get(key);

		if (!row) {
			debug('MISS', key, '(no row)');
			return undefined;
		}
		if (typeof row.data !== 'string') {
			debug('MISS', key, '(invalid data)');
			return undefined;
		}

		// Deserialize the entry
		let parsed;
		try {
			parsed = JSON.parse(row.data);
		} catch {
			debug('MISS', key, '(parse error)');
			return null;
		}

		debug('HIT', key);

		// Reconstruct the ReadableStream from stored data
		return {
			value: new ReadableStream({
				start(controller) {
					controller.enqueue(Buffer.from(parsed.value, 'base64'));
					controller.close();
				},
			}),
		};
	},

	async set(key, pendingEntry) {
		debug(`${LOG_PREFIX} SET key=`, key);
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
		const data = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

		await useCache.put({
			id: key,
			data: JSON.stringify({
				value: data.toString('base64'),
			}),
		});

		debug(`${LOG_PREFIX} SET COMPLETE`, key);
	},

	async refreshTags() {
		// No-op for basic implementation
	},

	async getExpiration(tags) {
		// Return 0 to indicate no tags have been revalidated
		return 0;
	},

	async updateTags(tags, durations) {
		// Could iterate over keys with matching tags and delete them
	},
};

export default useCacheHandler;
