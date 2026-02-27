import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/conversions", destination: "/conversion-paths", permanent: true },
    ];
  },
};

export default nextConfig;
