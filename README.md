# Lashes by Hille Liis: booking website

A mobile-first booking site for a one-person lash studio.

**Customers:** pick a service → pick a free time → enter details and accept the terms → done.
They get a confirmation email with an "Add to calendar" file and a link to cancel. The day
before, they get a reminder, and after the visit an email asking for a review.

**You (`/admin`):**
- **Kalender** – a Google-Calendar-style week view. Drag on empty space to add free time
  (on a phone: hold your finger, then drag). Drag a block's edge to change it, tap it to delete.
  Coloured blocks are bookings; tap one to call, SMS or cancel. Switch between day, 3-day, week
  and month view, swipe sideways to change period, and tap "Täna" to jump to today.
- **Broneeringud** – upcoming and past bookings.
- **Teenused** – services with price, length, buffer (cleanup time) and photo.
- **Arvustused** – approve reviews before they appear on the site.
- **Seaded** – booking rules, terms text, and connecting your Google Calendar.

Free times are calculated automatically: a service can start at any time where its full
length fits inside your free time and doesn't overlap another booking (plus buffer).
The database itself makes double bookings impossible, even if two people press
"Confirm" at the same moment.

Tech: Next.js 16, Tailwind, Postgres (Supabase), Resend email, Apple/iCal calendar feed (optional Google Calendar API),
FullCalendar, optional Messente SMS. Runs on Vercel's free plan.

---

## Going live (about 1 hour, all free tiers)

### 1. Database: Supabase
1. Create an account at [supabase.com](https://supabase.com) → **New project** (region: Frankfurt / eu-central-1).
2. Open **SQL Editor**, paste all of [`db/schema.sql`](db/schema.sql), press **Run**.
3. Optional: paste [`db/seed.sql`](db/seed.sql) and run it for example services and terms (edit them later in `/admin`).
4. Click the green **Connect** button at the top → **Connection String** → set the method to
   **Transaction pooler** (port 6543, host ends in `pooler.supabase.com`). Copy it and replace
   `[YOUR-PASSWORD]` (including the brackets) with your database password. This is your `DATABASE_URL`.
   Use a password with only letters and numbers, because symbols like `@ # /` break the address.
   (Forgot it? **Project Settings → Database → Reset database password**.)

### 2. Email: Resend
1. Create an account at [resend.com](https://resend.com) → **API Keys** → create one → `RESEND_API_KEY`.
2. **Domains** → add your domain and add the DNS records it shows. Then set
   `EMAIL_FROM=Lashes by Hille Liis <broneering@yourdomain.ee>`.
   (Until the domain is verified, Resend only lets you send to your own email.)

### 3. Hosting: Cloudflare Workers (Workers Paid, $5/month)
The site runs on Cloudflare Workers through the [OpenNext adapter](https://opennext.js.org/cloudflare).
The settings are in [`wrangler.jsonc`](wrangler.jsonc).
1. In Cloudflare, buy **Workers Paid** (the free plan's 10 ms CPU limit is too small for this app).
2. **Workers & Pages → Create → Import a repository** → GitHub → pick this repository.
   Build command `npx opennextjs-cloudflare build`, deploy command `npx opennextjs-cloudflare deploy`.
3. **Settings → Variables and Secrets**: add the values from [`.env.example`](.env.example) (at least the
   "Required" ones, plus `RESEND_API_KEY`, a random `CRON_SECRET`, and `NTFY_TOPIC` if you use phone
   notifications). Store the passwords and keys as **Secret**.
4. **Database connection (Hyperdrive):** Cloudflare can't open an SSL connection to Supabase directly, so
   the site connects through Hyperdrive. **Storage & databases → Hyperdrive → Create configuration**: paste
   `DATABASE_URL` with the port changed from `6543` to `5432` (Supabase's session pooler) and switch
   **caching off**. Put its ID in [`wrangler.jsonc`](wrangler.jsonc) under `hyperdrive`.
5. **Settings → Domains & Routes → Add → Custom domain**: add `hilleliis.ee` and `www.hilleliis.ee`
   (the domain's DNS must be on Cloudflare). HTTPS is set up automatically.

The daily job (reminders + review requests) is a Cron Trigger in `wrangler.jsonc` that calls `/api/cron`
through [`cloudflare-worker.js`](cloudflare-worker.js). It runs at 16:00 UTC (18:00/19:00 in Tallinn).

To try the Cloudflare build on your computer: put the variables in `.dev.vars`, point `localConnectionString`
in `wrangler.jsonc` at a local database, then run `npm run cf:preview`.

*(The project also still builds on Netlify ([`netlify.toml`](netlify.toml)) and Vercel ([`vercel.json`](vercel.json)).
Only one host should be live at a time, or the daily emails are sent twice.)*

### 4. Apple Calendar (built in, nothing to set up)
On your iPhone, open `/admin` → **Seaded** → **Lisa Apple kalendrisse** → **Subscribe**.
All bookings appear in your calendar and update by themselves; cancelled ones disappear.
On a Mac, set the calendar's **Auto-refresh** to every 5 minutes (right-click it → Get Info).
The same link works in Google Calendar and Outlook too ("Add calendar from URL").

The iPhone refreshes subscribed calendars on its own schedule (usually within 15 minutes to an hour),
so the new-booking email is your instant alert.

**Optional: direct Google Calendar sync.** If you use Google Calendar instead, set up an OAuth app:
[console.cloud.google.com](https://console.cloud.google.com) → enable **Google Calendar API** →
**OAuth consent screen** (External, add yourself, **Publish app**) → **Credentials → OAuth client ID →
Web application** with redirect URI `https://YOUR-DOMAIN/api/google/callback`. Add
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel, redeploy, then connect it in `/admin` → **Seaded**.

### 5. Instant phone notifications (free)
1. Install **ntfy** on your phone (App Store / Google Play).
2. Tap **+**, enter a secret topic name such as `hilleliis-a1b2c3d4e5f6` (hard to guess: anyone who
   knows it can read the notifications), and subscribe.
3. In Vercel add `NTFY_TOPIC` with the same name, then **Redeploy**.
4. `/admin` → **Seaded** → **Telefoni teavitused** → **Saada testteade**.

You then get a push for every new booking and customer cancellation; tapping it opens the admin.

### 6. SMS (phase 2, optional)
Create an account at [messente.com](https://messente.com), add `MESSENTE_USER`,
`MESSENTE_PASSWORD` and (for your own alerts) `PHONE`. SMS switches on
automatically: customers get a booking SMS and a reminder, and you get an SMS for each booking.

### Photos
- Service photos: in `/admin` → Teenused, paste an image link (for example, upload the photo
  to Supabase → Storage → a public bucket, and copy its URL). Square photos look best.
- Home page background: `/admin` → **Seaded** → **Välimus** → **Vaheta taustapilt** (see below).

### Change the look (no code)
`/admin` → **Seaded** → **Välimus**:
- **Põhivärv** (accent colour): pick a preset or any colour. Buttons, links, stars, prices and the
  admin calendar all follow it; lighter shades are mixed from it automatically.
- **Vaheta taustapilt**: upload a new landing-page background from your phone (it is shrunk
  automatically). **Taasta algne** brings back the original photo.
- **Taustapildi tumedus**: darken the photo so the white text stays readable.

One-time setup for this: in Supabase → **SQL Editor**, run [`db/migrations/002_appearance.sql`](db/migrations/002_appearance.sql).
(New installs get it from `schema.sql` automatically.) Until then the site uses the built-in copper look.

The built-in photo is `public/brand/background.webp`; the default colour is in `src/lib/theme.ts`.

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
| Calendar feed for Apple Calendar | `src/app/api/calendar/[token]/route.ts`, `src/lib/ics.ts` |
| Customer booking flow | `src/components/BookingWizard.tsx` |
| Texts (Estonian / English) | `src/lib/i18n.ts` |
| Admin calendar | `src/app/admin/(panel)/AdminCalendar.tsx` |
| Database tables | `db/schema.sql` |
