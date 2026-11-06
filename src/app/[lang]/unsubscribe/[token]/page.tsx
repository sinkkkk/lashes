import { notFound } from "next/navigation";
import { getBookingByToken } from "@/lib/booking";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { UnsubscribeButton } from "./UnsubscribeButton";

export const metadata = { robots: { index: false } };

/** Opened from the review request email. Needs a tap, so email scanners can't unsubscribe by accident. */
export default async function UnsubscribePage({ params }: PageProps<"/[lang]/unsubscribe/[token]">) {
  const { lang: l, token } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const t = dict[lang];
  const b = await getBookingByToken(token);
  if (!b) notFound();
  return (
    <div className="px-5 pt-4">
      <h1 className="font-display text-3xl font-semibold">{t.unsubscribeTitle}</h1>
      <p className="mt-3 text-muted">{t.unsubscribeText(b.email)}</p>
      <UnsubscribeButton token={token} label={t.unsubscribeButton} done={t.unsubscribeDone} error={t.error} />
    </div>
  );
}
