import { Stars } from "@/components/Stars";
import { db, type Review } from "@/lib/db";
import { fmt } from "@/lib/time";
import { deleteReviewAction, setReviewApproved } from "../../actions";

export default async function AdminReviews() {
  const reviews = (await db()`select * from reviews order by approved, created_at desc`) as unknown as Review[];
  const pending = reviews.filter((r) => !r.approved).length;
  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-muted">
        {pending ? `${pending} arvustust ootab kinnitamist. ` : ""}Arvustused ilmuvad lehele alles pärast kinnitamist.
      </p>
      {reviews.length === 0 && <p className="py-10 text-center text-muted">Arvustusi veel pole.</p>}
      <ul className="space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className={`rounded-2xl bg-white p-4 ring-1 ${r.approved ? "ring-line" : "ring-accent/50"}`}>
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <span className="text-xs text-muted">{fmt(r.created_at, "d.MM.yyyy")}</span>
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
