import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gfazzmjcqfzoyyimbtrk.supabase.co',
        pathname: '/storage/v1/object/public/product-images/**',
        search: '',
      },
      {
        protocol: 'https',
        hostname: 'gfazzmjcqfzoyyimbtrk.supabase.co',
        pathname: '/storage/v1/object/public/hero-images/**',
        search: '',
      },
    ],
  },
};

export default nextConfig;
