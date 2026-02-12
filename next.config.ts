// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ['harperdb'],
  cacheHandler: require.resolve('./lib/cache-handler.mjs'),
  cacheMaxMemorySize: 0,
};

export default nextConfig;
