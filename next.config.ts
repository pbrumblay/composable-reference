// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextConfig } from 'next';

console.log('[next.config] cwd:', process.cwd());

const nextConfig: NextConfig = {
	cacheComponents: true,
	serverExternalPackages: ['harperdb'],
	cacheHandler: './lib/cache/isr-cache-handler.mjs',
	cacheHandlers: {
		default: './lib/cache/use-cache-handler.mjs',
	},
	cacheMaxMemorySize: 0,
	logging: {
		fetches: { fullUrl: true },
	},
};

export default nextConfig;
