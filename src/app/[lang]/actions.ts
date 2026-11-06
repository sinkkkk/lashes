"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getBookingByToken } from "@/lib/booking";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";
import { onBookingCancelled } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { site } from "@/lib/site";

export async function cancelBookingAction(token: string) {
  const b = await getBookingByToken(token);
  if (!b || b.status !== "confirmed" || new Date(b.starts_at) <= new Date()) return;
  await db()`update bookings set status = 'cancelled' where id = ${b.id}`;
  after(() => onBookingCancelled(b, b, "customer"));
  revalidatePath(`/${b.lang}/booking/${token}`);
}

export async function submitReviewAction(token: string, _prev: unknown, form: FormData) {
  const b = await getBookingByToken(token);
  if (!b) return { error: true };
  const rating = Number(form.get("rating"));
  const text = String(form.get("text") ?? "").trim().slice(0, 1000);
  const name = String(form.get("name") ?? "").trim().slice(0, 40) || b.customer_name.split(" ")[0];
  if (!(rating >= 1 && rating <= 5)) return { error: true };
  await db()`
    insert into reviews (booking_id, rating, text, name_display)
    values (${b.id}, ${rating}, ${text}, ${name})
    on conflict (booking_id) do nothing`;
  return { done: true };
}

/**
 * Review from the public link hilleliis.ee/reviews (no booking needed). It waits for the
 * owner's approval in admin → Reviews, so nothing appears on the site by itself.
 */
export async function submitPublicReviewAction(_prev: unknown, form: FormData) {
  if (String(form.get("website") ?? "")) return { done: true }; // spam bot filled the hidden field
  const rating = Number(form.get("rating"));
  const text = String(form.get("text") ?? "").trim().slice(0, 1000);
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  if (!(rating >= 1 && rating <= 5) || name.length < 2) return { error: true };
  await db()`insert into reviews (booking_id, rating, text, name_display) values (null, ${rating}, ${text}, ${name})`;
  after(() =>
    sendPush({
      title: `⭐ Uus review: ${name}, ${rating}★`,
      message: text ? text.slice(0, 200) : "Ootab sinu kinnitust.",
      click: `${site.url}/admin/reviews`,
    }),
  );
  revalidatePath("/admin/reviews");
  return { done: true };
}

/** "Don't send me feedback requests" (link in the review request email). */
export async function unsubscribeAction(token: string) {
  const b = await getBookingByToken(token);
  if (!b) return { ok: false };
  await ensureSchema();
  await db()`insert into email_optouts (email) values (${b.email.toLowerCase()}) on conflict (email) do nothing`;
  return { ok: true };
}
