import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'codex-resets.com',
      },
    ],
  },
};

export default nextConfig;
