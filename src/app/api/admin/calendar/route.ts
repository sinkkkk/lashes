import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Free-time blocks and bookings for the admin week calendar. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const p = new URL(req.url).searchParams;
  const start = new Date(p.get("start") ?? "");
  const end = new Date(p.get("end") ?? "");
  if (isNaN(+start) || isNaN(+end)) return new Response("Bad range", { status: 400 });
  const sql = db();
  const [availability, bookings] = await Promise.all([
    sql`select id, starts_at, ends_at from availability
        where ends_at > ${start}::timestamptz and starts_at < ${end}::timestamptz`,
    sql`select b.id, b.starts_at, b.ends_at, b.customer_name, b.phone, b.email, b.note,
               s.name_et as service, s.price_eur
        from bookings b join services s on s.id = b.service_id
        where b.status = 'confirmed' and b.ends_at > ${start}::timestamptz and b.starts_at < ${end}::timestamptz`,
  ]);
  return Response.json({ availability, bookings }, { headers: { "Cache-Control": "no-store" } });
}
