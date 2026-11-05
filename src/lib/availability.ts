import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { db } from "./db";
import { TZ } from "./time";

/**
 * Saves a free-time block. Any blocks it overlaps or touches are joined into
 * one, so the calendar never shows messy stacked blocks.
 * `replaceId` is the block being moved or resized (it is replaced).
 */
export async function saveAvailability(start: Date, end: Date, replaceId?: string) {
  if (!(end > start)) throw new Error("end must be after start");
  return db().begin(async (sql) => {
    if (replaceId) await sql`delete from availability where id = ${replaceId}`;
    const touching = await sql`
      delete from availability
      where starts_at <= ${end}::timestamptz and ends_at >= ${start}::timestamptz
      returning starts_at, ends_at`;
    let s = start;
    let e = end;
    for (const r of touching) {
      if (r.starts_at < s) s = r.starts_at;
      if (r.ends_at > e) e = r.ends_at;
    }
    const [row] = await sql`
      insert into availability (starts_at, ends_at) values (${s}::timestamptz, ${e}::timestamptz)
      returning id, starts_at, ends_at`;
    return row;
  });
}

export async function deleteAvailability(id: string) {
  await db()`delete from availability where id = ${id}`;
}

/** Copies all free time from one week to the week after it. */
export async function copyWeek(weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000);
  const rows = await db()`
    select starts_at, ends_at from availability
    where starts_at >= ${weekStart}::timestamptz and starts_at < ${weekEnd}::timestamptz`;
  for (const r of rows) {
    // Same wall-clock time a week later, also across a daylight-saving change.
    await saveAvailability(addWeekLocal(r.starts_at), addWeekLocal(r.ends_at));
  }
  return rows.length;
}

function addWeekLocal(d: Date) {
  const wall = toZonedTime(d, TZ); // Tallinn wall-clock time
  wall.setDate(wall.getDate() + 7);
  return fromZonedTime(wall, TZ);
}
