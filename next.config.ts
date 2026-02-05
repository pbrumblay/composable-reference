import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: false,
  serverExternalPackages: ['harperdb']
};

export default nextConfig;
