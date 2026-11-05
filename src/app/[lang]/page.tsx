import type { Viewport } from "next";
import Link from "next/link";
import { ServiceImage } from "@/components/ServiceImage";
import { Stars } from "@/components/Stars";
import { getServices } from "@/lib/db";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { getApprovedReviews, getRatingSummary } from "@/lib/reviews";
import { getTheme } from "@/lib/theme";
import { formatDuration, formatPrice } from "@/lib/time";

// Dark status bar on iPhone, so it blends into the background photo.
export const viewport: Viewport = { themeColor: "#140d08" };

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const t = dict[lang];
  const [services, reviews, rating, theme] = await Promise.all([
    getServices(),
    getApprovedReviews(3),
    getRatingSummary(),
    getTheme(),
  ]);

  return (
    <div data-dark-page className="px-5 pb-32 text-white">
      {/* Background photo (chosen in /admin → Seaded → Välimus) with a darkening layer on top */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-[#21140c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={theme.bgUrl} alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgb(0 0 0 / ${theme.bgDarkness * 0.6}%), rgb(0 0 0 / ${theme.bgDarkness}%) 45%, rgb(0 0 0 / ${Math.min(95, theme.bgDarkness + 20)}%))`,
          }}
        />
      </div>

      {/* Hero */}
      <section className="flex min-h-[46dvh] flex-col justify-end pt-10 pb-4">
        <h1 className="font-display text-[2.6rem] leading-[1.08] font-semibold text-[#fbf3ec] drop-shadow-[0_2px_12px_rgb(0_0_0/0.45)]">
          {t.tagline}
        </h1>
        {rating.count > 0 && (
          <Link href={`/${lang}/reviews`} className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <Stars value={rating.avg} />
            <span>
              {rating.avg.toFixed(1)} · {t.basedOn(rating.count)}
            </span>
          </Link>
        )}
      </section>

      {/* Services */}
      <h2 className="mt-8 mb-4 font-display text-2xl font-semibold text-[#fbf3ec]">{t.services}</h2>
      <ul className="space-y-3">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/${lang}/book?service=${s.id}`}
              className="flex items-center gap-4 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-md active:scale-[.99] active:bg-white/15"
            >
              <ServiceImage src={s.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{lang === "et" ? s.name_et : s.name_en}</p>
                <p className="text-sm text-white/65">{formatDuration(s.duration_min, lang)}</p>
              </div>
              <p className="pr-1 font-semibold text-accent-light">{formatPrice(s.price_eur)}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Reviews */}
      {reviews.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 font-display text-2xl font-semibold text-[#fbf3ec]">{t.reviews}</h2>
          <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5">
            {reviews.map((r) => (
              <figure key={r.id} className="w-72 shrink-0 snap-start rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-md">
                <Stars value={r.rating} />
                {r.text && <blockquote className="mt-2 line-clamp-4 text-[15px] text-white/90">“{r.text}”</blockquote>}
                <figcaption className="mt-3 text-sm text-white/60">— {r.name_display}</figcaption>
              </figure>
            ))}
          </div>
          <Link href={`/${lang}/reviews`} className="mt-3 inline-block text-sm font-semibold text-accent-light">
            {t.seeAllReviews} →
          </Link>
        </>
      )}

      {/* Sticky call to action, always in thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Link
          href={`/${lang}/book`}
          className="block rounded-full bg-accent-light py-4 text-center text-lg font-semibold text-ink shadow-lg shadow-black/30 active:scale-[.99]"
        >
          {t.bookNow}
        </Link>
      </div>
    </div>
  );
}
