import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')?.[1] ?? 'Mahsub';
const basePath = isGitHubPages ? `/${repoName}` : undefined;

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export',
        trailingSlash: true,
        basePath,
        assetPrefix: basePath,
      }
    : {}),
  // Enable gzip compression for response payloads (~60-70% reduction in size)
  compress: true,
  // Allow cross-origin requests from local network devices during development
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.1.5:3000',
    'http://192.168.1.5:3001',
    'http://192.168.1.6:3000',
    'http://192.168.1.*:3000',
  ],
  // Image optimization for Supabase Storage
  images: {
    ...(isGitHubPages ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
