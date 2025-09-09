import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Configure for reverse proxy setup
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:3001/api/:path*',
      },
    ];
  },
  
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  
  // Handle image optimization in Docker
  images: {
    unoptimized: false,
  },
  
  // Set output file tracing root to avoid lockfile warnings
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
