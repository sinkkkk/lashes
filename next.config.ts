import type { NextConfig } from "next";

// Every page here shows live data (free times, bookings), so pages render on
// request instead of using Cache Components.
const nextConfig: NextConfig = {
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
