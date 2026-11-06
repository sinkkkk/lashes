import type { NextConfig } from "next";

// Every page here shows live data (free times, bookings), so pages render on
// request instead of using Cache Components.
const nextConfig: NextConfig = {
  // Room for a background photo uploaded from /admin (it is shrunk in the browser first).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Not bundled by Next, so the Cloudflare build picks the driver's own Workers version
  // (Cloudflare sockets with TLS) instead of the Node.js one.
  serverExternalPackages: ["postgres"],
  // Fonts read at run time by the review image route; make sure Vercel ships them.
  outputFileTracingIncludes: { "/api/admin/review-image/**": ["./public/fonts/**"] },
  async redirects() {
    return [
      { source: "/", destination: "/et", permanent: false },
      // Short public link for leaving a review: hilleliis.ee/reviews
      { source: "/reviews", destination: "/et/reviews", permanent: false },
    ];
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
