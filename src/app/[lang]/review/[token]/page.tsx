import { notFound } from "next/navigation";
import { getBookingByToken } from "@/lib/booking";
import { db } from "@/lib/db";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { ReviewForm } from "./ReviewForm";

export const metadata = { robots: { index: false } };

export default async function ReviewPage({ params }: PageProps<"/[lang]/review/[token]">) {
  const { lang: l, token } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const t = dict[lang];
  const b = await getBookingByToken(token);
  if (!b) notFound();
  const [existing] = await db()`select 1 from reviews where booking_id = ${b.id}`;

  return (
    <div className="px-5 pt-4">
      <h1 className="font-display text-3xl font-semibold">{t.leaveReview}</h1>
      {existing ? (
        <p className="mt-6 text-muted">{t.alreadyReviewed}</p>
      ) : (
        <>
          <p className="mt-2 text-muted">{t.reviewIntro}</p>
          <ReviewForm token={token} lang={lang} defaultName={b.customer_name.split(" ")[0]} />
        </>
      )}
    </div>
  );
}
