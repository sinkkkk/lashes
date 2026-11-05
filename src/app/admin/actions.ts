"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/auth";
import { db, type Booking } from "@/lib/db";
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
  };
  if (!v.name_et || !(v.duration_min >= 15) || !(v.price_eur >= 0)) return;
  const sql = db();
  if (id) await sql`update services set ${sql(v)} where id = ${id}`;
  else await sql`insert into services ${sql(v)}`;
  revalidatePath("/", "layout");
}

export async function deleteServiceAction(id: string) {
  await requireAdmin();
  const sql = db();
  const [used] = await sql`select 1 from bookings where service_id = ${id} limit 1`;
  // Services with booking history are hidden instead of deleted, so history stays intact.
  if (used) await sql`update services set active = false where id = ${id}`;
  else await sql`delete from services where id = ${id}`;
  revalidatePath("/", "layout");
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

export async function saveSettingsAction(form: FormData) {
  await requireAdmin();
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x || lo)));
  await db()`
    update settings set
      slot_step_min = ${clamp(num(form, "slot_step_min"), 5, 120)},
      min_notice_hours = ${clamp(num(form, "min_notice_hours"), 0, 336)},
      max_days_ahead = ${clamp(num(form, "max_days_ahead"), 1, 365)},
      terms_et = ${str(form, "terms_et")},
      terms_en = ${str(form, "terms_en")}
    where id = 1`;
  revalidatePath("/", "layout");
}

export async function disconnectGoogleAction() {
  await requireAdmin();
  await db()`update settings set google_refresh_token = null where id = 1`;
  revalidatePath("/admin/settings");
}
