// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: false,
  serverExternalPackages: ['harperdb'],
  cacheHandler: import.meta.resolve("./lib/cache-handler.cjs").replace("file://", ""),
  cacheMaxMemorySize: 0,
};

export default nextConfig;
