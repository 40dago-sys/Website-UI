import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/aws/:path*',
        destination: 'http://13.214.202.126/:path*', // Mengarahkan diam-diam ke AWS
      },
    ]
  },
};

export default nextConfig;