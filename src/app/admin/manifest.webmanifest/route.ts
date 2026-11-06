/** Makes /admin installable as a home-screen app with the lash icon. */
export function GET() {
  return Response.json(
    {
      name: "Liisu Lashes Admin",
      short_name: "Liisu Admin",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#faf6f3",
      theme_color: "#faf6f3",
      icons: [
        { src: "/api/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
