import { headers } from "next/headers";
import { feedUrls } from "@/lib/calendarFeed";
import { dict } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import { googleConfigured } from "@/lib/gcal";
import { pushEnabled } from "@/lib/push";
import { ACCENT_PRESETS, DEFAULT_BG, getTheme } from "@/lib/theme";
import { disconnectGoogleAction } from "../../actions";
import { AppearanceForm } from "./AppearanceForm";
import { CopyLink } from "./CopyLink";
import { PushTest } from "./PushTest";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const [s, theme] = await Promise.all([getSettings(), getTheme()]);
  const { google } = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const feed = feedUrls(host ? `${proto}://${host}` : undefined);
  return (
    <div className="max-w-2xl space-y-6">
      <AppearanceForm
        accent={theme.accent}
        darkness={theme.bgDarkness}
        bgUrl={theme.bgUrl}
        isDefaultBg={theme.bgUrl === DEFAULT_BG}
        presets={ACCENT_PRESETS}
        tagline={theme.tagline}
        iconColor={theme.iconColor}
        defaultTagline={{ et: dict.et.tagline, en: dict.en.tagline }}
      />

      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="font-semibold">Apple kalender</h2>
        <p className="mt-1 text-sm text-muted">
          Kõik broneeringud ilmuvad sinu iPhone&apos;i ja Maci kalendrisse ning uuenevad ise. Tühistatud ajad kaovad ära.
        </p>
        <a href={feed.webcal} className="mt-4 block rounded-full bg-ink py-3.5 text-center font-semibold text-white">
          Lisa Apple kalendrisse
        </a>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Ava see leht oma iPhone&apos;is (või Macis) ja vajuta nuppu ülal.</li>
          <li>Vajuta <b>Telli / Subscribe</b> ja siis <b>Lisa / Add</b>.</li>
          <li>
            Macis: Kalender → paremklõps kalendril &quot;broneeringud&quot; → <b>Get Info</b> → Auto-refresh: <b>Every 5 minutes</b>.
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          iPhone uuendab tellitud kalendrit iseseisvalt (tavaliselt 15 min – 1 h jooksul). Uuest broneeringust saad kohe teada e-kirjaga.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input readOnly value={feed.https} className="input min-w-0 flex-1 truncate text-xs" aria-label="Kalendri link" />
          <CopyLink url={feed.https} />
        </div>
        <p className="mt-2 text-xs text-muted">Link sobib ka Google&apos;i ja Outlooki kalendrisse. Ära jaga seda teistega: see näitab klientide andmeid.</p>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="font-semibold">Telefoni teavitused</h2>
        <p className="mt-1 text-sm text-muted">
          Iga uue broneeringu ja tühistamise kohta tuleb kohe teade telefoni (rakendus <b>ntfy</b>).
        </p>
        {pushEnabled() ? (
          <>
            <p className="mt-3 text-sm font-semibold text-emerald-700">● Sisse lülitatud</p>
            <PushTest />
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Välja lülitatud. Lisa Vercelis seade <code>NTFY_TOPIC</code> ja tee Redeploy (vt README).
          </p>
        )}
      </section>

      {googleConfigured() && (
      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="font-semibold">Google kalender</h2>
        <p className="mt-1 text-sm text-muted">Iga uus broneering lisatakse sinu Google kalendrisse ja telefon annab teada.</p>
        {google === "ok" && <p className="mt-2 text-sm text-emerald-700">Ühendatud!</p>}
        {google === "error" && <p className="mt-2 text-sm text-accent">Ühendamine ebaõnnestus, proovi uuesti.</p>}
        {s.google_refresh_token ? (
          <form action={disconnectGoogleAction} className="mt-3 flex items-center gap-3">
            <span className="text-sm font-semibold text-emerald-700">● Ühendatud</span>
            <button className="text-sm text-muted underline">Katkesta ühendus</button>
          </form>
        ) : (
          // This goes to an API route that redirects to Google, so a plain link is right.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/api/google/connect" className="mt-3 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            Ühenda Google kalender
          </a>
        )}
      </section>
      )}

      <SettingsForm>
        <h2 className="font-semibold">Broneerimine</h2>
        <div className="grid grid-cols-3 gap-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">Aegade samm (min)</span>
            <select name="slot_step_min" defaultValue={s.slot_step_min} className="input">
              {[15, 30, 60].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">Vähemalt (h) ette</span>
            <input name="min_notice_hours" type="number" min={0} defaultValue={s.min_notice_hours} className="input" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">Max päevi ette</span>
            <input name="max_days_ahead" type="number" min={1} defaultValue={s.max_days_ahead} className="input" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Tingimused (eesti)</span>
          <textarea name="terms_et" rows={7} defaultValue={s.terms_et} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Terms (English)</span>
          <textarea name="terms_en" rows={7} defaultValue={s.terms_en} className="input" />
        </label>
        </SettingsForm>
    </div>
  );
}
