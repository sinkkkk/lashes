import { db, type Review } from "./db";

export async function getApprovedReviews(limit = 50): Promise<Review[]> {
  return (await db()`
    select * from reviews where approved order by created_at desc limit ${limit}`) as unknown as Review[];
}

export async function getRatingSummary(): Promise<{ avg: number; count: number }> {
  const [r] = await db()`select coalesce(avg(rating), 0)::float8 as avg, count(*)::int as count from reviews where approved`;
  return { avg: Number(r.avg), count: Number(r.count) };
}
