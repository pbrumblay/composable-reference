import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: false,
  serverExternalPackages: ['harperdb'],
  cacheHandler: import.meta.resolve("./lib/cache-handler.cjs").replace("file://", ""),
  cacheMaxMemorySize: 0,
  webpack: (config) => {
    // HarperDB is provided at runtime by the HarperDB process, not from node_modules.
    // Mark it external so webpack doesn't try to resolve/bundle it.
    config.externals.push({ harperdb: 'commonjs harperdb' });
    return config;
  },
};

export default nextConfig;
