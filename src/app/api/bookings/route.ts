import { after } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking";
import { getService } from "@/lib/db";
import { onBookingCreated } from "@/lib/notify";
import { site } from "@/lib/site";

const Body = z.object({
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(5)
    .max(25)
    .regex(/^[+\d][\d\s()-]+$/),
  email: z.string().trim().email().max(120),
  note: z.string().trim().max(500).default(""),
  lang: z.enum(["et", "en"]),
  acceptTerms: z.literal(true),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const b = parsed.data;
  const service = await getService(b.serviceId);
  if (!service || !service.active) return Response.json({ error: "invalid" }, { status: 400 });

  const result = await createBooking({
    service,
    startsAt: new Date(b.startsAt),
    name: b.name,
    phone: b.phone,
    email: b.email.toLowerCase(),
    note: b.note,
    lang: b.lang,
  });
  if (!result.ok) return Response.json({ error: "taken" }, { status: 409 });

  // Emails, SMS and Google Calendar run after the answer is sent, so the customer isn't kept waiting.
  after(() => onBookingCreated(result.booking, service));
  // The full address is shared only with someone who has just booked (not shown on public pages).
  return Response.json({ token: result.booking.token, address: site.address });
}
