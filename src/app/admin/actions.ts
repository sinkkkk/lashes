"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/auth";
import { db, type Booking } from "@/lib/db";
import { cleanColor } from "@/lib/colors";
import { ensureSchema } from "@/lib/migrate";
import { onBookingCancelled } from "@/lib/notify";

export async function loginAction(_prev: unknown, form: FormData) {
  // Small delay makes password guessing slow.
  await new Promise((r) => setTimeout(r, 400));
  if (!passwordMatches(String(form.get("password") ?? ""))) return { error: "Vale parool" };
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

export async function cancelBookingByOwner(id: string, notifyCustomer: boolean) {
  await requireAdmin();
  const [b] = await db()`
    update bookings set status = 'cancelled' where id = ${id} and status = 'confirmed'
    returning *, (select row_to_json(s) from services s where s.id = service_id) as service`;
  if (b) {
    const booking = b as unknown as Booking & { service: { name_et: string; name_en: string } };
    after(async () => {
      if (notifyCustomer) await onBookingCancelled(booking, booking.service, "owner");
      else await (await import("@/lib/gcal")).deleteCalendarEvent(booking.gcal_event_id);
    });
  }
  revalidatePath("/admin", "layout");
}

const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "").replace(",", "."));
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveServiceAction(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const v = {
    name_et: str(form, "name_et"),
    name_en: str(form, "name_en") || str(form, "name_et"),
    description_et: str(form, "description_et"),
    description_en: str(form, "description_en"),
    duration_min: Math.round(num(form, "duration_min")),
    buffer_min: Math.round(num(form, "buffer_min") || 0),
    price_eur: num(form, "price_eur"),
    photo_url: str(form, "photo_url"),
    sort: Math.round(num(form, "sort") || 0),
    active: form.get("active") === "on",
    color: cleanColor(form.get("color")),
  };
  if (!v.name_et || !(v.duration_min >= 15) || !(v.price_eur >= 0)) return;
  await ensureSchema();
  const sql = db();
  if (id) await sql`update services set ${sql(v)} where id = ${id}`;
  else await sql`insert into services ${sql(v)}`;
  revalidatePath("/", "layout");
}

/**
 * Deletes a service. If it has bookings (even old or cancelled ones) it is archived instead:
 * gone from the admin list and the site, but kept so those bookings still show its name.
 */
export async function deleteServiceAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await ensureSchema();
  const sql = db();
  try {
    const [used] = await sql`select 1 from bookings where service_id = ${id} limit 1`;
    if (used) await sql`update services set archived = true, active = false where id = ${id}`;
    else await sql`delete from services where id = ${id}`;
  } catch (e) {
    console.error("deleteService", e);
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setReviewApproved(id: string, approved: boolean) {
  await requireAdmin();
  await db()`update reviews set approved = ${approved} where id = ${id}`;
  revalidatePath("/", "layout");
}

export async function deleteReviewAction(id: string) {
  await requireAdmin();
  await db()`delete from reviews where id = ${id}`;
  revalidatePath("/", "layout");
}

export async function saveSettingsAction(_prev: unknown, form: FormData): Promise<{ ok: boolean; at: number }> {
  await requireAdmin();
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x || lo)));
  try {
    await db()`
      update settings set
        slot_step_min = ${clamp(num(form, "slot_step_min"), 5, 120)},
        min_notice_hours = ${clamp(num(form, "min_notice_hours"), 0, 336)},
        max_days_ahead = ${clamp(num(form, "max_days_ahead"), 1, 365)},
        terms_et = ${str(form, "terms_et")},
        terms_en = ${str(form, "terms_en")}
      where id = 1`;
  } catch (e) {
    console.error("saveSettings", e);
    return { ok: false, at: Date.now() };
  }
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
}

export async function disconnectGoogleAction() {
  await requireAdmin();
  await db()`update settings set google_refresh_token = null where id = 1`;
  revalidatePath("/admin/settings");
}

// ---- Look (Välimus): accent colour, background photo, darkness ----------------

type LookResult = { ok: true } | { ok: false; error: "migration" | "invalid" | "too_big" };

const needsMigration = (e: unknown) => ["42703", "42P01"].includes((e as { code?: string }).code ?? "");

/** Landing page text; an empty field means "use the built-in text". */
export async function saveTaglineAction(et: string, en: string): Promise<LookResult> {
  await requireAdmin();
  const clean = (x: string) => (String(x ?? "").trim().slice(0, 200) || null);
  await ensureSchema();
  try {
    await db()`update settings set tagline_et = ${clean(et)}, tagline_en = ${clean(en)} where id = 1`;
  } catch (e) {
    if (needsMigration(e)) return { ok: false, error: "migration" };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveAppearanceAction(accent: string, darkness: number): Promise<LookResult> {
  await requireAdmin();
  await ensureSchema();
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return { ok: false, error: "invalid" };
  const d = Math.min(90, Math.max(0, Math.round(Number(darkness) || 0)));
  try {
    await db()`update settings set accent_color = ${accent.toLowerCase()}, bg_darkness = ${d} where id = 1`;
  } catch (e) {
    if (needsMigration(e)) return { ok: false, error: "migration" };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadBackgroundAction(form: FormData): Promise<LookResult> {
  await requireAdmin();
  await ensureSchema();
  const file = form.get("photo");
  if (!(file instanceof File) || !IMAGE_TYPES.includes(file.type)) return { ok: false, error: "invalid" };
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: "too_big" };
  const data = Buffer.from(await file.arrayBuffer());
  try {
    await db()`
      insert into assets (key, content_type, data, updated_at)
      values ('background', ${file.type}, ${data}, now())
      on conflict (key) do update set content_type = excluded.content_type, data = excluded.data, updated_at = now()`;
  } catch (e) {
    if (needsMigration(e)) return { ok: false, error: "migration" };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetBackgroundAction(): Promise<LookResult> {
  await requireAdmin();
  try {
    await db()`delete from assets where key = 'background'`;
  } catch (e) {
    if (needsMigration(e)) return { ok: true }; // nothing uploaded yet
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Removes a booking for good (test or spam bookings). No emails are sent.
 * Reviews linked to it are kept (they can be removed in Arvustused).
 */
export async function deleteBookingAction(id: string) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const [b] = await db()`delete from bookings where id = ${id} returning gcal_event_id`;
  if (b?.gcal_event_id) {
    after(async () => (await import("@/lib/gcal")).deleteCalendarEvent(b.gcal_event_id as string));
  }
  revalidatePath("/admin", "layout");
}

export async function sendTestPushAction(): Promise<boolean> {
  await requireAdmin();
  const { sendPush } = await import("@/lib/push");
  return sendPush({
    title: "💅 Testteade",
    message: "Kõik töötab! Nii näeb välja teade, kui keegi aja broneerib.",
    tags: ["white_check_mark"],
    click: `${(await import("@/lib/site")).site.url}/admin`,
  });
}
