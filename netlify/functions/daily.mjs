/**
 * Daily job on Netlify (replaces Vercel Cron): every day at 16:00 UTC (18:00 / 19:00 in Tallinn)
 * it calls the site's own /api/cron, which sends tomorrow's reminders and the review requests.
 */
export default async function daily() {
  const base = process.env.URL; // the site's main address, set by Netlify
  const res = await fetch(`${base}/api/cron`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log("daily job:", res.status, await res.text());
  return new Response(null, { status: res.ok ? 200 : 500 });
}

export const config = { schedule: "0 16 * * *" };
