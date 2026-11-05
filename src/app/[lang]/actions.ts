"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getBookingByToken } from "@/lib/booking";
import { db } from "@/lib/db";
import { onBookingCancelled } from "@/lib/notify";

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
