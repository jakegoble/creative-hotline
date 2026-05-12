import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/conversions", destination: "/conversion-paths", permanent: true },
      // V2: clean URL for the Morning Prep dashboard.
      { source: "/morning-prep", destination: "/templates-v2/morning-prep.html", permanent: false },
    ];
  },
};

export default nextConfig;
