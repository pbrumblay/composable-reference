// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	cacheComponents: true,
	serverExternalPackages: ['harperdb'],
	cacheHandler: require.resolve('./lib/cache/isr-cache-handler.mjs'),
	cacheHandlers: {
		default: require.resolve('./lib/cache/use-cache-handler.mjs'),
	},
	cacheMaxMemorySize: 0,
	logging: {
		fetches: { fullUrl: true },
	},
};

export default nextConfig;
