import { Stars } from "@/components/Stars";
import { db, type Review } from "@/lib/db";
import { site } from "@/lib/site";
import { fmt } from "@/lib/time";
import { CopyLink } from "../settings/CopyLink";
import { deleteReviewAction, setReviewApproved } from "../../actions";

export default async function AdminReviews() {
  const reviews = (await db()`select * from reviews order by approved, created_at desc`) as unknown as Review[];
  const pending = reviews.filter((r) => !r.approved).length;
  return (
    <div className="max-w-2xl">
      <section className="mb-5 rounded-2xl bg-white p-4 ring-1 ring-line">
        <p className="text-sm font-semibold">Sinu reviews link</p>
        <p className="mt-0.5 text-xs text-muted">Jaga seda Instagramis, sõnumiga või QR-koodina. Iga review ootab enne lehele ilmumist sinu kinnitust.</p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={`${site.url}/reviews`} className="input min-w-0 flex-1 truncate text-sm" aria-label="Reviews link" />
          <CopyLink url={`${site.url}/reviews`} />
        </div>
      </section>
      <p className="mb-4 text-sm text-muted">
        {pending ? `${pending} ${pending === 1 ? "review ootab" : "reviews ootavad"} kinnitamist. ` : ""}Reviews ilmuvad lehele alles pärast kinnitamist.
      </p>
      {reviews.length === 0 && <p className="py-10 text-center text-muted">Reviews veel pole.</p>}
      <ul className="space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className={`rounded-2xl bg-white p-4 ring-1 ${r.approved ? "ring-line" : "ring-accent/50"}`}>
            <div className="flex items-center justify-between gap-2">
              <Stars value={r.rating} />
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className={`rounded-full px-2 py-0.5 font-medium ${r.booking_id ? "bg-emerald-50 text-emerald-800" : "bg-sand"}`}>
                  {r.booking_id ? "✓ Broneeringust" : "Avalik link"}
                </span>
                {fmt(r.created_at, "d.MM.yyyy")}
              </span>
            </div>
            {r.text && <p className="mt-2">{r.text}</p>}
            <p className="mt-1 text-sm text-muted">— {r.name_display}</p>
            <div className="mt-3 flex gap-2">
              <form action={setReviewApproved.bind(null, r.id, !r.approved)}>
                <button className={`rounded-full px-4 py-1.5 text-sm font-semibold ${r.approved ? "ring-1 ring-line" : "bg-ink text-white"}`}>
                  {r.approved ? "Peida" : "Kinnita"}
                </button>
              </form>
              <form action={deleteReviewAction.bind(null, r.id)}>
                <button className="rounded-full px-4 py-1.5 text-sm text-accent">Kustuta</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
