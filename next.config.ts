import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "**.fal.ai",
      },
      {
        protocol: "https",
        hostname: "www.agenticboard.xyz",
      },
    ],
  },
};

export default nextConfig;
