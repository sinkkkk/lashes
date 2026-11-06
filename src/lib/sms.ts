/**
 * SMS through Messente (Estonian provider, https://messente.com).
 * Phase 2: it stays switched off until MESSENTE_USER and MESSENTE_PASSWORD are set.
 */
export const smsEnabled = () => Boolean(process.env.MESSENTE_USER && process.env.MESSENTE_PASSWORD);

export function normalizePhone(raw: string) {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (!p.startsWith("+")) p = `+372${p}`; // Estonian number without country code
  return p;
}

export async function sendSms(to: string, text: string) {
  if (!smsEnabled() || !to) return;
  const auth = Buffer.from(`${process.env.MESSENTE_USER}:${process.env.MESSENTE_PASSWORD}`).toString("base64");
  const res = await fetch("https://api.messente.com/v1/omnimessage", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to: normalizePhone(to),
      messages: [{ channel: "sms", sender: process.env.MESSENTE_SENDER || "HilleLiis", text }],
    }),
  });
  if (!res.ok) console.error("Messente error", res.status, await res.text());
}
