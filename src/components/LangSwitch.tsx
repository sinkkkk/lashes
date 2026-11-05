"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LangSwitch({ lang }: { lang: "et" | "en" }) {
  const path = usePathname();
  const other = lang === "et" ? "en" : "et";
  const href = path.replace(/^\/(et|en)(?=\/|$)/, `/${other}`);
  return (
    <Link href={href} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold tracking-wide uppercase text-muted on-dark:border-white/30 on-dark:text-white/80" aria-label={other === "en" ? "English" : "Eesti keel"}>
      {other}
    </Link>
  );
}
