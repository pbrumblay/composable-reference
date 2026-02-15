/* SPDX-License-Identifier: AGPL-3.0-or-later */
/**
 * Next.js ISR cache handler — backed by HarperDB (NextJsIsrCache table).
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

const LOG_PREFIX = '[NextJsIsrCacheHandler]';
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
		out.segmentData = new Map(value.segmentData.entries.map(([path, b64]) => [path, Buffer.from(b64, 'base64')]));
	}
	if (value.rscData?.__type === 'Buffer' && typeof value.rscData.base64 === 'string') {
		out.rscData = Buffer.from(value.rscData.base64, 'base64');
	}
	return out;
}

export default class NextJsIsrCacheHandler {
	constructor(options) {
		this.options = options;
	}

	async get(key, _ctx) {
		debug(`${LOG_PREFIX} GET key=`, key);
		const tables = getTables();
		const isrCache = tables?.NextJsIsrCache;
		if (!isrCache) {
			console.error(`${LOG_PREFIX} get: NextJsIsrCache table not found`);
			debug('MISS', key, '(no NextJsIsrCache)');
			return null;
		}
		const row = await isrCache.get(key);

		if (!row) {
			debug('MISS', key, '(no row)');
			return null;
		}
		if (typeof row.data !== 'string') {
			debug('MISS', key, '(invalid data)');
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

	async set(key, data) {
		debug('SET key=', key);
		const tables = getTables();
		const NextJsIsrCache = tables?.NextJsIsrCache;

		const valueToStore = serializeValue(data);
		const entry = {
			value: valueToStore,
		};
		await NextJsIsrCache.put({
			id: key,
			data: JSON.stringify(entry),
		});
		debug('SET', key);
	}

	async revalidateTag() {
		// No-op for tags - tags are not used for this ISR cache implementation
	}

	resetRequestCache() {
		// No request-scoped in-memory cache
	}
}
