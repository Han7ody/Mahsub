import type { NextConfig } from 'next';

// Trigger restart

const nextConfig: NextConfig = {
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
