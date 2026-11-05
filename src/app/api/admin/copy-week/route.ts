import { isAdmin } from "@/lib/auth";
import { copyWeek } from "@/lib/availability";

export async function POST(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { weekStart } = (await req.json().catch(() => ({}))) as { weekStart?: string };
  const d = new Date(weekStart ?? "");
  if (isNaN(+d)) return new Response("Bad request", { status: 400 });
  return Response.json({ copied: await copyWeek(d) });
}
