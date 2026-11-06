import type { Metadata, Viewport } from "next";
import { display, inter } from "../fonts";
import { connection } from "next/server";
import { site } from "@/lib/site";
import { getTheme, themeCss } from "@/lib/theme";
import "../globals.css";

export const metadata: Metadata = {
  title: `Admin · ${site.name}`,
  robots: { index: false },
  // Home-screen app: lash icon, short name under the icon, opens full screen without Safari's bars.
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Hille Liis", statusBarStyle: "default" },
};
// viewportFit "cover" lets the page know where the iPhone's home bar and notch are, so the bottom
// tab bar can stay clear of them (env(safe-area-inset-…)).
export const viewport: Viewport = { themeColor: "#faf6f3", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  await connection(); // always render with the current colour, never a copy from build time
  const theme = await getTheme();
  return (
    <html lang="et" className={`${inter.variable} ${display.variable} antialiased`}>
      <head>
        <style>{themeCss(theme)}</style>
      </head>
      <body className="admin-theme tinted min-h-dvh font-sans">{children}</body>
    </html>
  );
}
