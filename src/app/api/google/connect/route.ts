import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { googleAuthUrl, googleConfigured } from "@/lib/gcal";

export async function GET() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!googleConfigured()) redirect("/admin/settings?google=missing");
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("g_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  redirect(googleAuthUrl(state));
}
