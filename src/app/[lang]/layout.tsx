import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LangSwitch } from "@/components/LangSwitch";
import { LashMark } from "@/components/LashMark";
import { dict, isLang } from "@/lib/i18n";
import { site } from "@/lib/site";
import { display, inter } from "../fonts";
import "../globals.css";

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const t = dict[isLang(lang) ? lang : "et"];
  return {
    title: { default: `${site.name} · ${t.bookNow}`, template: `%s · ${site.name}` },
    description: t.tagline,
    metadataBase: new URL(site.url),
    openGraph: { title: site.name, description: t.tagline, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#faf6f3", width: "device-width", initialScale: 1 };

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict[lang];
  return (
    <html lang={lang} className={`${inter.variable} ${display.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col">
          <header className="flex items-center justify-between px-5 pt-5 pb-2">
            <Link href={`/${lang}`} className="flex items-center gap-2">
              <LashMark className="h-4 w-8 text-rose" />
              <span className="font-display text-xl font-semibold tracking-wide">{site.name}</span>
            </Link>
            <LangSwitch lang={lang} />
          </header>
          <main className="flex-1">{children}</main>
          <footer className="px-5 pt-10 pb-8 text-center text-xs text-muted">
            <nav className="mb-3 flex justify-center gap-5">
              <Link href={`/${lang}/reviews`}>{t.reviews}</Link>
              <Link href={`/${lang}/terms`}>{t.terms}</Link>
              {site.instagram && <a href={site.instagram}>Instagram</a>}
            </nav>
            {site.address && <p>{site.address}</p>}
            <p className="mt-1">© {new Date().getFullYear()} {site.name}</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
