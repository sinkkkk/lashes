import Link from "next/link";
import { db } from "@/lib/db";
import { dayKey, fmt } from "@/lib/time";
import { OwnerCancel } from "./OwnerCancel";

type Row = {
  id: string;
  starts_at: Date;
  ends_at: Date;
  customer_name: string;
  phone: string;
  email: string;
  note: string;
  status: string;
  service: string;
  price_eur: string;
  created_at: Date;
};

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const { show } = await searchParams;
  const past = show === "past";
  const rows = (past
    ? await db()`select b.*, s.name_et as service, s.price_eur from bookings b join services s on s.id = b.service_id
                 where b.starts_at < now() order by b.starts_at desc limit 200`
    : await db()`select b.*, s.name_et as service, s.price_eur from bookings b join services s on s.id = b.service_id
                 where b.ends_at >= now() and b.status = 'confirmed' order by b.starts_at`) as unknown as Row[];

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = dayKey(r.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const today = dayKey(new Date());
  const total = rows.filter((r) => r.status === "confirmed").reduce((sum, r) => sum + Number(r.price_eur), 0);

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/bookings" className={`rounded-full px-4 py-2 ${!past ? "bg-ink text-white" : "ring-1 ring-line"}`}>Tulevased</Link>
        <Link href="/admin/bookings?show=past" className={`rounded-full px-4 py-2 ${past ? "bg-ink text-white" : "ring-1 ring-line"}`}>Möödunud</Link>
      </div>
      {!past && rows.length > 0 && (
        <p className="mb-4 text-sm text-muted">
          {rows.length} broneeringut · kokku {total.toFixed(0)} €
        </p>
      )}
      {rows.length === 0 && <p className="py-10 text-center text-muted">Broneeringuid pole.</p>}
      <div className="space-y-6">
        {[...groups].map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-2 text-sm font-semibold text-muted first-letter:uppercase">
              {day === today ? "Täna · " : ""}
              {fmt(list[0].starts_at, "EEEE, d. MMMM")}
            </h2>
            <ul className="space-y-2">
              {list.map((b) => (
                <li key={b.id} className={`rounded-2xl bg-white p-4 ring-1 ring-line ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {fmt(b.starts_at, "HH:mm")}–{fmt(b.ends_at, "HH:mm")} · {b.customer_name}
                        {b.status === "cancelled" && <span className="ml-2 text-xs text-rose">tühistatud</span>}
                      </p>
                      <p className="text-sm text-muted">{b.service} · {Number(b.price_eur)} €</p>
                      {b.note && <p className="mt-1 text-sm">📝 {b.note}</p>}
                      <p className="mt-1 text-sm">
                        <a href={`tel:${b.phone}`} className="font-medium text-rose">{b.phone}</a>
                        <span className="text-muted"> · </span>
                        <a href={`mailto:${b.email}`} className="text-muted underline">{b.email}</a>
                      </p>
                    </div>
                    {!past && b.status === "confirmed" && <OwnerCancel id={b.id} name={b.customer_name} />}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
