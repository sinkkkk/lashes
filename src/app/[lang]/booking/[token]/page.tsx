import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingByToken } from "@/lib/booking";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { site } from "@/lib/site";
import { fmt, formatPrice } from "@/lib/time";
import { CancelButton } from "./CancelButton";

export const metadata = { robots: { index: false } };

export default async function BookingPage({ params }: PageProps<"/[lang]/booking/[token]">) {
  const { lang: l, token } = await params;
  const lang: Lang = isLang(l) ? l : "et";
  const t = dict[lang];
  const b = await getBookingByToken(token);
  if (!b) notFound();
  const past = new Date(b.starts_at) <= new Date();
  const cancelled = b.status === "cancelled";

  return (
    <div className="px-5 pt-4">
      <h1 className="font-display text-3xl font-semibold">{t.yourBooking}</h1>
      <div className={`mt-5 rounded-2xl bg-white p-5 ring-1 ring-line ${cancelled ? "opacity-60" : ""}`}>
        <p className="text-lg font-semibold">{lang === "et" ? b.name_et : b.name_en}</p>
        <p className="text-muted first-letter:uppercase">
          {fmt(b.starts_at, lang === "et" ? "EEEE, d. MMMM, HH:mm" : "EEEE d MMMM, HH:mm", lang)}–{fmt(b.ends_at, "HH:mm")}
        </p>
        <p className="mt-1 font-semibold">{formatPrice(Number(b.price_eur))}</p>
        {site.address && <p className="mt-3 text-sm text-muted">📍 {site.address}</p>}
      </div>

      {cancelled ? (
        <>
          <p className="mt-6 text-center font-semibold text-accent">{t.cancelled}</p>
          <Link href={`/${lang}/book`} className="mt-4 block rounded-full bg-ink py-4 text-center font-semibold text-white">
            {t.bookAgain}
          </Link>
        </>
      ) : past ? (
        <p className="mt-6 text-center text-muted">{t.pastBooking}</p>
      ) : (
        <>
          <a href={`/api/bookings/${token}/ics`} className="mt-6 block rounded-full bg-ink py-4 text-center font-semibold text-white">
            📅 {t.addToCalendar}
          </a>
          <CancelButton token={token} label={t.cancelBooking} confirmText={t.cancelConfirm} />
        </>
      )}
    </div>
  );
}
