import { db } from "@/lib/db";

/** The background photo uploaded in /admin. The ?v= in the link changes on every upload. */
export async function GET(req: Request) {
  try {
    const [a] = await db()`select content_type, data from assets where key = 'background'`;
    if (a) {
      return new Response(new Uint8Array(a.data as Buffer), {
        headers: { "Content-Type": a.content_type, "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }
  } catch {
    // assets table not created yet
  }
  return Response.redirect(new URL("/brand/background.webp", req.url), 302);
}
