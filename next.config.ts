import type { NextConfig } from "next";

// Every page here shows live data (free times, bookings), so pages render on
// request instead of using Cache Components.
const nextConfig: NextConfig = {
  // Room for a background photo uploaded from /admin (it is shrunk in the browser first).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async redirects() {
    return [{ source: "/", destination: "/et", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
