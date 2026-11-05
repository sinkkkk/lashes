import Link from "next/link";
import { LashMark } from "@/components/LashMark";
import { ServiceImage } from "@/components/ServiceImage";
import { Stars } from "@/components/Stars";
import { getServices } from "@/lib/db";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { getApprovedReviews, getRatingSummary } from "@/lib/reviews";
import { formatDuration, formatPrice } from "@/lib/time";

const hero = process.env.NEXT_PUBLIC_HERO_IMAGE || "";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const t = dict[lang];
  const [services, reviews, rating] = await Promise.all([getServices(), getApprovedReviews(3), getRatingSummary()]);

  return (
    <div className="px-5 pb-28">
      {/* Hero */}
      <section className="relative mt-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-blush via-sand to-cream">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="h-72 w-full object-cover" />
        ) : (
          <div className="flex h-56 items-center justify-center">
            <LashMark className="h-16 w-32 text-rose" />
          </div>
        )}
        <div className="bg-white/70 p-6 backdrop-blur">
          <h1 className="font-display text-[2rem] leading-tight font-semibold">{t.tagline}</h1>
          {rating.count > 0 && (
            <Link href={`/${lang}/reviews`} className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Stars value={rating.avg} />
              <span>
                {rating.avg.toFixed(1)} · {t.basedOn(rating.count)}
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Services */}
      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">{t.services}</h2>
      <ul className="space-y-3">
        {services.map((s) => (
          <li key={s.id}>
            <Link href={`/${lang}/book?service=${s.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-line active:scale-[.99]">
              <ServiceImage src={s.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{lang === "et" ? s.name_et : s.name_en}</p>
                <p className="text-sm text-muted">{formatDuration(s.duration_min, lang)}</p>
              </div>
              <p className="pr-1 font-semibold">{formatPrice(s.price_eur)}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Reviews */}
      {reviews.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">{t.reviews}</h2>
          <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5">
            {reviews.map((r) => (
              <figure key={r.id} className="w-72 shrink-0 snap-start rounded-2xl bg-white p-5 ring-1 ring-line">
                <Stars value={r.rating} />
                {r.text && <blockquote className="mt-2 line-clamp-4 text-[15px]">“{r.text}”</blockquote>}
                <figcaption className="mt-3 text-sm text-muted">— {r.name_display}</figcaption>
              </figure>
            ))}
          </div>
          <Link href={`/${lang}/reviews`} className="mt-3 inline-block text-sm font-semibold text-rose">
            {t.seeAllReviews} →
          </Link>
        </>
      )}

      {/* Sticky call to action, always in thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md bg-gradient-to-t from-cream via-cream/95 to-transparent px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Link href={`/${lang}/book`} className="block rounded-full bg-ink py-4 text-center text-lg font-semibold text-white shadow-lg active:scale-[.99]">
          {t.bookNow}
        </Link>
      </div>
    </div>
  );
}
