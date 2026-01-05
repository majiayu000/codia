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
};

export default nextConfig;
