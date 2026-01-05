import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow VRM files to be served from public folder
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/octet-stream",
          },
        ],
      },
    ];
  },

  // Use Turbopack (Next.js 16 default)
  turbopack: {},

  // Disable strict mode to prevent double rendering in dev
  reactStrictMode: false,
};

export default nextConfig;
