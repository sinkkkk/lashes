import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { exchangeCode } from "@/lib/gcal";

export async function GET(req: Request) {
  if (!(await isAdmin())) redirect("/admin/login");
  const url = new URL(req.url);
  const jar = await cookies();
  const state = jar.get("g_state")?.value;
  jar.delete("g_state");
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) redirect("/admin/settings?google=error");
  let ok = true;
  try {
    await exchangeCode(code);
  } catch (e) {
    console.error(e);
    ok = false;
  }
  redirect(`/admin/settings?google=${ok ? "ok" : "error"}`);
}
