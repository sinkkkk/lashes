import type { Metadata, Viewport } from "next";
import { display, inter } from "../fonts";
import { getTheme, themeCss } from "@/lib/theme";
import "../globals.css";

export const metadata: Metadata = { title: "Admin · Liisu Lashes", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#faf6f3", width: "device-width", initialScale: 1 };

export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  return (
    <html lang="et" className={`${inter.variable} ${display.variable} antialiased`}>
      <head>
        <style>{themeCss(theme)}</style>
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
