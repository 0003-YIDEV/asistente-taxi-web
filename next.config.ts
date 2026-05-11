import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/asistente-taxi-web',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
