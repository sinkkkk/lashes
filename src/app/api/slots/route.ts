import { getSlots } from "@/lib/booking";
import { getService } from "@/lib/db";
import { dayKey, fmt } from "@/lib/time";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("service") ?? "";
  const service = await getService(id);
  if (!service || !service.active) return Response.json({ error: "not_found" }, { status: 404 });
  const slots = await getSlots(service);
  return Response.json(
    { slots: slots.map((s) => ({ iso: s.toISOString(), day: dayKey(s), time: fmt(s, "HH:mm") })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
