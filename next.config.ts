import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["better-auth"],
  turbopack: {
    root: "/home/z/my-project/danielou",
  },
};

export default nextConfig;
