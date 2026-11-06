import { db, type Booking, type Service } from "./db";
import { sendEmail } from "./email";
import { createCalendarEvent, deleteCalendarEvent } from "./gcal";
import { makeIcs } from "./ics";
import { site } from "./site";
import { sendPush } from "./push";
import { sendSms } from "./sms";
import { fmt, formatPrice } from "./time";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(body: string, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#faf6f3;font-family:Helvetica,Arial,sans-serif;color:#2b2523">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:.5px;margin-bottom:24px">${esc(site.name)}</div>
    <div style="background:#fff;border-radius:16px;padding:24px;line-height:1.55">${body}</div>
    <div style="font-size:12px;color:#8a7f7a;margin-top:20px">${esc(site.address)}${footer}</div>
  </div></body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#2b2523;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">${esc(label)}</a>`;
}

const serviceName = (s: Pick<Service, "name_et" | "name_en">, lang: "et" | "en") => (lang === "et" ? s.name_et : s.name_en);
const when = (b: Pick<Booking, "starts_at" | "lang">) =>
  fmt(b.starts_at, b.lang === "et" ? "EEEE, d. MMMM 'kell' HH:mm" : "EEEE d MMMM 'at' HH:mm", b.lang);
const manageUrl = (b: Booking) => `${site.url}/${b.lang}/booking/${b.token}`;

export async function onBookingCreated(b: Booking, s: Service) {
  const lang = b.lang;
  const name = serviceName(s, lang);
  const ics = makeIcs({
    uid: `${b.id}@liisulashes`,
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    title: `${name} – ${site.name}`,
    description: manageUrl(b),
    location: site.address,
  });

  const customer =
    lang === "et"
      ? {
          subject: `Broneering kinnitatud: ${when(b)}`,
          html: layout(`<h2 style="margin-top:0">Aitäh, ${esc(b.customer_name)}!</h2>
            <p>Sinu aeg on broneeritud.</p>
            <p><b>${esc(name)}</b><br>${esc(when(b))}<br>${formatPrice(s.price_eur)}</p>
            ${site.address ? `<p>📍 ${esc(site.address)}</p>` : ""}
            <p style="font-size:14px;color:#6b605b">Palun tule ilma silmameigita. Kui sa ei saa tulla, tühista vähemalt 24h ette.</p>
            <p>${button(manageUrl(b), "Vaata või tühista")}</p>`),
        }
      : {
          subject: `Booking confirmed: ${when(b)}`,
          html: layout(`<h2 style="margin-top:0">Thank you, ${esc(b.customer_name)}!</h2>
            <p>Your appointment is booked.</p>
            <p><b>${esc(name)}</b><br>${esc(when(b))}<br>${formatPrice(s.price_eur)}</p>
            ${site.address ? `<p>📍 ${esc(site.address)}</p>` : ""}
            <p style="font-size:14px;color:#6b605b">Please come without eye makeup. If you can't make it, cancel at least 24h ahead.</p>
            <p>${button(manageUrl(b), "View or cancel")}</p>`),
        };

  const ownerText = `${b.customer_name} · ${s.name_et}\n${fmt(b.starts_at, "EEEE d. MMM HH:mm")}–${fmt(b.ends_at, "HH:mm")}\nTel: ${b.phone}\nE-post: ${b.email}${b.note ? `\nMärkus: ${b.note}` : ""}`;

  const jobs: Promise<unknown>[] = [
    sendEmail({ to: b.email, ...customer, attachments: [{ filename: "broneering.ics", content: ics }] }),
    sendEmail({
      to: site.ownerEmail,
      subject: `Uus broneering: ${s.name_et}, ${fmt(b.starts_at, "EEEE d. MMM HH:mm")}`,
      html: layout(`<h2 style="margin-top:0">Uus broneering 🎉</h2><p style="white-space:pre-line">${esc(ownerText)}</p>
        <p>${button(`${site.url}/admin`, "Ava kalender")}</p>`),
    }),
    sendSms(
      b.phone,
      lang === "et"
        ? `${site.name}: aeg broneeritud ${when(b)}. Tühistamine: ${manageUrl(b)}`
        : `${site.name}: booked for ${when(b)}. Cancel: ${manageUrl(b)}`,
    ),
    sendSms(site.phone, `Uus broneering: ${ownerText}`),
    sendPush({
      title: `💅 Uus broneering: ${b.customer_name}`,
      message: `${s.name_et}\n${fmt(b.starts_at, "EEEE d. MMMM HH:mm")}–${fmt(b.ends_at, "HH:mm")} · ${formatPrice(s.price_eur)}\nTel: ${b.phone}${b.note ? `\n📝 ${b.note}` : ""}`,
      tags: ["calendar"],
      click: `${site.url}/admin/bookings`,
    }),
    createCalendarEvent({
      start: new Date(b.starts_at),
      end: new Date(b.ends_at),
      summary: `💅 ${b.customer_name} – ${s.name_et}`,
      description: ownerText,
    }).then((id) => (id ? db()`update bookings set gcal_event_id = ${id} where id = ${b.id}` : null)),
  ];
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("notify error", r.reason);
}

export async function onBookingCancelled(b: Booking, s: Pick<Service, "name_et" | "name_en">, by: "customer" | "owner") {
  const jobs: Promise<unknown>[] = [deleteCalendarEvent(b.gcal_event_id)];
  if (by === "customer") {
    jobs.push(
      sendPush({
        title: `❌ Tühistatud: ${b.customer_name}`,
        message: `${s.name_et}\n${fmt(b.starts_at, "EEEE d. MMMM HH:mm")}\nAeg on jälle vaba.`,
        click: `${site.url}/admin`,
      }),
    );
    jobs.push(
      sendEmail({
        to: site.ownerEmail,
        subject: `Tühistatud: ${b.customer_name}, ${fmt(b.starts_at, "EEEE d. MMM HH:mm")}`,
        html: layout(`<p><b>${esc(b.customer_name)}</b> tühistas aja.</p><p>${esc(s.name_et)}<br>${esc(fmt(b.starts_at, "EEEE, d. MMMM HH:mm"))}</p><p>Aeg on jälle vaba.</p>`),
      }),
    );
  }
  const subject = b.lang === "et" ? "Broneering tühistatud" : "Booking cancelled";
  const text =
    b.lang === "et"
      ? `Sinu aeg (${serviceName(s, "et")}, ${when(b)}) on tühistatud.`
      : `Your appointment (${serviceName(s, "en")}, ${when(b)}) has been cancelled.`;
  jobs.push(
    sendEmail({
      to: b.email,
      subject,
      html: layout(`<p>${esc(text)}</p><p>${button(`${site.url}/${b.lang}/book`, b.lang === "et" ? "Broneeri uus aeg" : "Book a new time")}</p>`),
    }),
  );
  await Promise.allSettled(jobs);
}

export async function sendReminder(b: Booking, s: Service) {
  const et = b.lang === "et";
  await Promise.allSettled([
    sendEmail({
      to: b.email,
      subject: et ? `Meeldetuletus: homme ${fmt(b.starts_at, "HH:mm")}` : `Reminder: tomorrow at ${fmt(b.starts_at, "HH:mm")}`,
      html: layout(
        et
          ? `<p>Tere, ${esc(b.customer_name)}! Näeme homme.</p><p><b>${esc(s.name_et)}</b><br>${esc(when(b))}</p><p style="font-size:14px;color:#6b605b">Palun tule ilma silmameigita.</p><p>${button(manageUrl(b), "Vaata broneeringut")}</p>`
          : `<p>Hi ${esc(b.customer_name)}! See you tomorrow.</p><p><b>${esc(s.name_en)}</b><br>${esc(when(b))}</p><p style="font-size:14px;color:#6b605b">Please come without eye makeup.</p><p>${button(manageUrl(b), "View booking")}</p>`,
      ),
    }),
    sendSms(b.phone, et ? `${site.name}: näeme homme kell ${fmt(b.starts_at, "HH:mm")}!` : `${site.name}: see you tomorrow at ${fmt(b.starts_at, "HH:mm")}!`),
  ]);
}

export async function sendReviewRequest(b: Booking) {
  const et = b.lang === "et";
  const url = `${site.url}/${b.lang}/review/${b.token}`;
  const stop = `${site.url}/${b.lang}/unsubscribe/${b.token}`;
  const footer = et
    ? `<br><br><a href="${stop}" style="color:#8a7f7a">Ära saada mulle rohkem tagasiside palveid</a>`
    : `<br><br><a href="${stop}" style="color:#8a7f7a">Don't send me feedback requests</a>`;
  await sendEmail({
    to: b.email,
    subject: et ? "Kuidas ripsmed meeldivad? 💕" : "How do you like your lashes? 💕",
    html: layout(
      et
        ? `<p>Tere, ${esc(b.customer_name)}! Aitäh, et käisid.</p><p>Kas leiaksid hetke, et anda tagasisidet? See võtab 20 sekundit.</p><p style="font-size:28px;letter-spacing:6px">★★★★★</p><p>${button(url, "Anna hinnang")}</p>`
        : `<p>Hi ${esc(b.customer_name)}! Thank you for visiting.</p><p>Could you leave a quick review? It takes 20 seconds.</p><p style="font-size:28px;letter-spacing:6px">★★★★★</p><p>${button(url, "Leave a review")}</p>`,
      footer,
    ),
  });
}
