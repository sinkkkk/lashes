import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { deleteAvailability, saveAvailability } from "@/lib/availability";

const Save = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  replaceId: z.string().uuid().optional(),
});

/** Create a block, or move/resize one (with replaceId). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const parsed = Save.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { start, end, replaceId } = parsed.data;
  if (new Date(end) <= new Date(start)) return new Response("Bad range", { status: 400 });
  const row = await saveAvailability(new Date(start), new Date(end), replaceId);
  return Response.json(row);
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return new Response("Bad request", { status: 400 });
  await deleteAvailability(id);
  return new Response(null, { status: 204 });
}
