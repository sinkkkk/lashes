import type { Metadata } from "next";
import Link from "next/link";
import { Stars } from "@/components/Stars";
import { PublicReviewForm } from "./PublicReviewForm";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { getApprovedReviews, getRatingSummary } from "@/lib/reviews";
import { fmt } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/[lang]/reviews">): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[isLang(lang) ? lang : "et"].reviews };
}

export default async function ReviewsPage({ params }: PageProps<"/[lang]/reviews">) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const t = dict[lang];
  const [reviews, rating] = await Promise.all([getApprovedReviews(), getRatingSummary()]);

  return (
    <div className="px-5 pt-4 pb-10">
      <h1 className="font-display text-3xl font-semibold">{t.reviews}</h1>
      {rating.count > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-4xl font-semibold">{rating.avg.toFixed(1)}</span>
          <div>
            <Stars value={rating.avg} className="text-lg" />
            <p className="text-sm text-muted">{t.basedOn(rating.count)}</p>
          </div>
        </div>
      )}
      <PublicReviewForm lang={lang} />
      {reviews.length === 0 && <p className="mt-6 text-muted">{t.noReviewsYet}</p>}
      <ul className="mt-6 space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <span className="text-xs text-muted">{fmt(r.created_at, "d.MM.yyyy")}</span>
            </div>
            {r.text && <p className="mt-2 text-[15px]">{r.text}</p>}
            <p className="mt-2 text-sm text-muted">— {r.name_display}</p>
          </li>
        ))}
      </ul>
      <Link href={`/${lang}/book`} className="mt-8 block rounded-full bg-ink py-4 text-center text-lg font-semibold text-white">
        {t.bookNow}
      </Link>
    </div>
  );
}
