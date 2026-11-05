import { getSettings } from "@/lib/db";
import { googleConfigured } from "@/lib/gcal";
import { disconnectGoogleAction, saveSettingsAction } from "../../actions";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const s = await getSettings();
  const { google } = await searchParams;
  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="font-semibold">Google kalender</h2>
        <p className="mt-1 text-sm text-muted">Iga uus broneering lisatakse sinu Google kalendrisse ja telefon annab teada.</p>
        {google === "ok" && <p className="mt-2 text-sm text-emerald-700">Ühendatud!</p>}
        {google === "error" && <p className="mt-2 text-sm text-rose">Ühendamine ebaõnnestus, proovi uuesti.</p>}
        {!googleConfigured() ? (
          <p className="mt-3 text-sm text-rose">GOOGLE_CLIENT_ID ja GOOGLE_CLIENT_SECRET on seadistamata (vt README).</p>
        ) : s.google_refresh_token ? (
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

      <form action={saveSettingsAction} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line">
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
        <button className="w-full rounded-full bg-ink py-3 font-semibold text-white">Salvesta</button>
      </form>
    </div>
  );
}
