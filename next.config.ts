import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── API Versioning ─────────────────────────────────────────────────────────
  // /api/v1/:path* is an alias for /api/:path*.
  // Clients can call either form — both resolve to the same handlers.
  // Future breaking changes ship as /api/v2/:path* while /api/v1/* stays intact.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};

export default nextConfig;
