import type { Metadata } from "next";
import { BookingWizard, type WizardService } from "@/components/BookingWizard";
import { getSlots } from "@/lib/booking";
import { getServices, getSettings } from "@/lib/db";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { site } from "@/lib/site";
import { fmt, formatDuration, formatPrice } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/[lang]/book">): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[isLang(lang) ? lang : "et"].bookNow };
}

export default async function BookPage({ params, searchParams }: PageProps<"/[lang]/book">) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const { service } = await searchParams;
  const [services, settings] = await Promise.all([getServices(), getSettings()]);
  const nextFree = await Promise.all(services.map((s) => getSlots(s, settings).then((x) => x[0])));

  const list: WizardService[] = services.map((s, i) => ({
    id: s.id,
    name: lang === "et" ? s.name_et : s.name_en,
    description: lang === "et" ? s.description_et : s.description_en,
    duration: formatDuration(s.duration_min, lang),
    durationMin: s.duration_min,
    price: formatPrice(s.price_eur),
    photo: s.photo_url,
    color: s.color,
    nextFree: nextFree[i] ? fmt(nextFree[i], lang === "et" ? "EEEEEE d. MMM HH:mm" : "EEE d MMM HH:mm", lang) : null,
  }));

  return (
    <BookingWizard
      lang={lang}
      services={list}
      terms={lang === "et" ? settings.terms_et : settings.terms_en}
      businessName={site.name}
      address={site.address}
      initialServiceId={typeof service === "string" && list.some((s) => s.id === service) ? service : null}
    />
  );
}
