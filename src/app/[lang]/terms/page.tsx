import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { dict, isLang, type Lang } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[isLang(lang) ? lang : "et"].terms };
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const s = await getSettings();
  return (
    <div className="px-5 pt-4">
      <h1 className="font-display text-3xl font-semibold">{dict[lang].terms}</h1>
      <p className="mt-5 leading-relaxed whitespace-pre-line">{lang === "et" ? s.terms_et : s.terms_en}</p>
    </div>
  );
}
