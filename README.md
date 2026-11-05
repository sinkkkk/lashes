# Liisu Lashes: booking website

A mobile-first booking site for a one-person lash studio.

**Customers:** pick a service → pick a free time → enter details and accept the terms → done.
They get a confirmation email with an "Add to calendar" file and a link to cancel. The day
before, they get a reminder, and after the visit an email asking for a review.

**You (`/admin`):**
- **Kalender** – a Google-Calendar-style week view. Drag on empty space to add free time
  (on a phone: hold your finger, then drag). Drag a block's edge to change it, tap it to delete.
  Pink blocks are bookings; tap one to call, SMS or cancel. "Kopeeri" copies this week's free
  time to next week.
- **Broneeringud** – upcoming and past bookings.
- **Teenused** – services with price, length, buffer (cleanup time) and photo.
- **Arvustused** – approve reviews before they appear on the site.
- **Seaded** – booking rules, terms text, and connecting your Google Calendar.

Free times are calculated automatically: a service can start at any time where its full
length fits inside your free time and doesn't overlap another booking (plus buffer).
The database itself makes double bookings impossible, even if two people press
"Confirm" at the same moment.

Tech: Next.js 16, Tailwind, Postgres (Supabase), Resend email, Google Calendar API,
FullCalendar, optional Messente SMS. Runs on Vercel's free plan.

---

## Going live (about 1 hour, all free tiers)

### 1. Database: Supabase
1. Create an account at [supabase.com](https://supabase.com) → **New project** (region: Frankfurt / eu-central-1).
2. Open **SQL Editor**, paste all of [`db/schema.sql`](db/schema.sql), press **Run**.
3. Optional: paste [`db/seed.sql`](db/seed.sql) and run it for example services and terms (edit them later in `/admin`).
4. **Project Settings → Database → Connection string → Transaction pooler**. Copy it; this is your `DATABASE_URL`.

### 2. Email: Resend
1. Create an account at [resend.com](https://resend.com) → **API Keys** → create one → `RESEND_API_KEY`.
2. **Domains** → add your domain and add the DNS records it shows. Then set
   `EMAIL_FROM=Liisu Lashes <broneering@yourdomain.ee>`.
   (Until the domain is verified, Resend only lets you send to your own email.)

### 3. Hosting: Vercel
1. Put this code on GitHub (already done if you're reading this there).
2. At [vercel.com](https://vercel.com) → **Add New → Project** → import the repository.
3. Add the environment variables from [`.env.example`](.env.example) (at least the "Required" ones,
   plus `RESEND_API_KEY`, `EMAIL_FROM` and a random `CRON_SECRET`).
4. **Deploy**. Then **Settings → Domains** → add your domain (e.g. `liisulashes.ee`) and set
   `NEXT_PUBLIC_SITE_URL` to it.

The daily job (reminders + review requests) is already set in `vercel.json` and runs at 16:00 UTC (18:00/19:00 in Tallinn).

### 4. Google Calendar (optional, recommended)
1. [console.cloud.google.com](https://console.cloud.google.com) → create a project →
   **APIs & Services → Library** → enable **Google Calendar API**.
2. **OAuth consent screen** → External → fill in the app name and your email → add yourself as a
   **test user**, then press **Publish app** (otherwise access expires after 7 days).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorized redirect URI: `https://YOUR-DOMAIN/api/google/callback`.
4. Put the client ID and secret into Vercel as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy.
5. In `/admin` → **Seaded** → **Ühenda Google kalender**.

From then on every booking appears in your Google Calendar, and your phone notifies you.

### 5. SMS (phase 2, optional)
Create an account at [messente.com](https://messente.com), add `MESSENTE_USER`,
`MESSENTE_PASSWORD` and (for your own alerts) `NEXT_PUBLIC_PHONE`. SMS switches on
automatically: customers get a booking SMS and a reminder, and you get an SMS for each booking.

### Photos
- Service photos: in `/admin` → Teenused, paste an image link (for example, upload the photo
  to Supabase → Storage → a public bucket, and copy its URL). Square photos look best.
- Home page photo: put `hero.jpg` in the `public` folder and set `NEXT_PUBLIC_HERO_IMAGE=/hero.jpg`.

### Colours
Change the brand colours at the top of [`src/app/globals.css`](src/app/globals.css).

---

## Running on your computer

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, ADMIN_PASSWORD, AUTH_SECRET
npm run dev                  # http://localhost:3000, admin at /admin
npm test                     # tests for the free-time calculation
```

Without `RESEND_API_KEY`, emails are only printed in the terminal, so you can test safely.

## Where things are

| What | File |
| --- | --- |
| Free-time calculation | `src/lib/slots.ts` (+ tests) |
| Creating bookings | `src/lib/booking.ts`, `src/app/api/bookings/route.ts` |
| Emails, SMS, Google sync | `src/lib/notify.ts` |
| Customer booking flow | `src/components/BookingWizard.tsx` |
| Texts (Estonian / English) | `src/lib/i18n.ts` |
| Admin calendar | `src/app/admin/(panel)/AdminCalendar.tsx` |
| Database tables | `db/schema.sql` |
