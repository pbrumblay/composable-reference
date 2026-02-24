import { join } from 'node:path';
import type { NextConfig } from 'next';
console.log('[next.config] cwd:', process.cwd());
console.log('[next.config] dirname:', import.meta.dirname);

const nextConfig: NextConfig = {
    cacheComponents: true,
    serverExternalPackages: ['harperdb'],
    cacheHandler: join(import.meta.dirname, 'lib/cache/isr-cache-handler.mjs'),
    cacheHandlers: {
        default: join(import.meta.dirname, 'lib/cache/use-cache-handler.mjs'),
    },
    cacheMaxMemorySize: 0,
    logging: {
        fetches: { fullUrl: true },
    },
};

export default nextConfig;