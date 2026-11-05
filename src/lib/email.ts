type Attachment = { filename: string; content: string /* plain text */ };

/**
 * Sends email through Resend (https://resend.com). Without RESEND_API_KEY,
 * emails are only printed to the server log, which is handy while developing.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; attachments?: Attachment[] }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Liisu Lashes <onboarding@resend.dev>";
  if (!msg.to) return;
  if (!key) {
    console.log(`[email not sent: no RESEND_API_KEY] to=${msg.to} subject="${msg.subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      // When a customer answers the confirmation email, the reply goes to the owner.
      ...(process.env.OWNER_EMAIL && msg.to !== process.env.OWNER_EMAIL ? { reply_to: process.env.OWNER_EMAIL } : {}),
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
      })),
    }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}
