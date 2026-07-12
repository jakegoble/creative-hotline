import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sandbox builds hit EPERM unlinking .next on FUSE mounts — let CI/sandbox
  // point the build dir elsewhere. Vercel ignores this (env unset → ".next").
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [
      // Free POV tool — static page lives at public/pov/index.html.
      { source: "/pov", destination: "/pov/index.html" },
    ];
  },
  async redirects() {
    return [
      { source: "/conversions", destination: "/conversion-paths", permanent: true },
      // V2: clean URL for the Morning Prep dashboard.
      { source: "/morning-prep", destination: "/templates-v2/morning-prep.html", permanent: false },
    ];
  },
};

export default nextConfig;
