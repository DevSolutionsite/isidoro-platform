import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
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
