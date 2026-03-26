import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Crucial for TerraNode: Ensure caching of static assets for offline rural use
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config: Configuration, { isServer }) => {
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          path: false,
          crypto: false,
          os: false,
        },
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
