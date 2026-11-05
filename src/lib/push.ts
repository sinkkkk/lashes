/**
 * Instant phone notifications for the owner through ntfy (https://ntfy.sh, free app).
 * She subscribes to a secret topic in the app; the site posts to it on every booking.
 * Switched off until NTFY_TOPIC is set.
 */
export const pushEnabled = () => Boolean(process.env.NTFY_TOPIC);

export async function sendPush(msg: { title: string; message: string; tags?: string[]; click?: string; priority?: 1 | 2 | 3 | 4 | 5 }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
  try {
    // JSON publishing keeps Estonian letters and emoji intact.
    const res = await fetch(server, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, title: msg.title, message: msg.message, tags: msg.tags, click: msg.click, priority: msg.priority ?? 4 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("ntfy error", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("ntfy error", e);
    return false;
  }
}
