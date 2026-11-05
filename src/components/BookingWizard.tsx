"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { ServiceImage } from "./ServiceImage";

export type WizardService = {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  photo: string;
  nextFree: string | null;
};

type Slot = { iso: string; day: string; time: string };
type Step = "service" | "time" | "details" | "done";
const ORDER: Step[] = ["service", "time", "details", "done"];
const TZ = "Europe/Tallinn";

export function BookingWizard(props: { lang: Lang; services: WizardService[]; terms: string; initialServiceId: string | null }) {
  const { lang, services, terms } = props;
  const t = dict[lang];
  const locale = lang === "et" ? "et-EE" : "en-GB";

  const [step, setStep] = useState<Step>(props.initialServiceId ? "time" : "service");
  const [serviceId, setServiceId] = useState<string | null>(props.initialServiceId);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  // Contact details are remembered on this phone for the next booking.
  const [form, setForm] = useState(() => {
    const empty = { name: "", phone: "", email: "", note: "", website: "" };
    if (typeof window === "undefined") return empty;
    try {
      const saved = JSON.parse(localStorage.getItem("contact") || "null");
      return saved ? { ...empty, name: saved.name ?? "", phone: saved.phone ?? "", email: saved.email ?? "" } : empty;
    } catch {
      return empty;
    }
  });
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;

  // Make the phone's back button go one step back instead of leaving the page.
  const go = useCallback((next: Step) => {
    setError(null);
    setStep(next);
    window.history.pushState({ step: next }, "");
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    window.history.replaceState({ step }, "");
    const onPop = (e: PopStateEvent) => {
      const s = (e.state?.step as Step) ?? "service";
      setStep((cur) => (cur === "done" ? cur : s));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fresh free times every time the time step is shown.
  useEffect(() => {
    if (!serviceId || step !== "time") return;
    let alive = true;
    fetch(`/api/slots?service=${serviceId}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ slots: Slot[] }>) : { slots: [] }))
      .catch(() => ({ slots: [] as Slot[] }))
      .then((data) => {
        if (!alive) return;
        setSlots(data.slots);
        setDay((d) => (d && data.slots.some((s) => s.day === d) ? d : (data.slots[0]?.day ?? null)));
        setSlot((cur) => (cur && data.slots.some((s) => s.iso === cur.iso) ? cur : null));
      });
    return () => {
      alive = false;
    };
  }, [serviceId, step]);

  // Days shown in the strip: from today to the last day with a free time (at least 2 weeks).
  const days = useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
    const last = slots?.at(-1)?.day ?? today;
    const out: string[] = [];
    const d = new Date(`${today}T12:00:00Z`);
    for (let i = 0; i < 120; i++) {
      const key = d.toISOString().slice(0, 10);
      out.push(key);
      if (key >= last && i >= 13) break;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }, [slots]);
  const daysWithSlots = useMemo(() => new Set(slots?.map((s) => s.day)), [slots]);
  const daySlots = slots?.filter((s) => s.day === day) ?? [];

  const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(new Date(`${key}T12:00:00Z`));
  const slotLabel = (s: Slot) =>
    `${dayLabel(s.day, { weekday: "short", day: "numeric", month: "short" })}, ${s.time}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !slot || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, startsAt: slot.iso, ...form, acceptTerms: accepted, lang }),
      });
      if (res.status === 409) {
        setSlot(null);
        setSlots(null);
        go("time");
        setError(t.taken);
        return;
      }
      if (!res.ok) {
        setError(res.status === 400 ? t.invalid : t.error);
        return;
      }
      const data = (await res.json()) as { token: string };
      try {
        localStorage.setItem("contact", JSON.stringify({ name: form.name, phone: form.phone, email: form.email }));
      } catch {}
      setToken(data.token);
      setStep("done");
      window.history.replaceState({ step: "done" }, "");
      window.scrollTo({ top: 0 });
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = ORDER.indexOf(step);
  const titles: Record<Step, string> = { service: t.stepService, time: t.stepTime, details: t.stepDetails, done: "" };

  return (
    <div className="px-5 pb-32">
      {step !== "done" && (
        <div className="mt-2 mb-5">
          <div className="flex items-center gap-3">
            {stepIndex > 0 ? (
              <button onClick={() => window.history.back()} className="-ml-2 rounded-full p-2 text-muted" aria-label={t.back}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            ) : (
              <Link href={`/${lang}`} className="-ml-2 rounded-full p-2 text-muted" aria-label={t.back}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </Link>
            )}
            <h1 className="font-display text-[1.7rem] font-semibold">{titles[step]}</h1>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-ink" : "bg-line"}`} />
            ))}
          </div>
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-rose/10 p-3 text-sm text-rose" role="alert">{error}</p>}

      {/* 1. Service */}
      {step === "service" && (
        <ul className="space-y-3">
          {services.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => {
                  if (s.id !== serviceId) {
                    setSlot(null);
                    setSlots(null);
                  }
                  setServiceId(s.id);
                  go("time");
                }}
                className="flex w-full gap-4 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-line active:scale-[.99]"
              >
                <ServiceImage src={s.photo} alt="" className="h-24 w-24 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{s.name}</p>
                    <p className="font-semibold whitespace-nowrap">{s.price}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
                    <span className="text-muted">⏱ {s.duration}</span>
                    <span className={s.nextFree ? "font-semibold text-emerald-700" : "text-muted"}>
                      {s.nextFree ? `● ${t.nextFree}: ${s.nextFree}` : t.noFreeTimes}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 2. Time */}
      {step === "time" && service && (
        <>
          <button onClick={() => window.history.back()} className="mb-5 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-line">
            <span>
              <span className="block font-semibold">{service.name}</span>
              <span className="text-sm text-muted">{service.duration} · {service.price}</span>
            </span>
            <span className="text-sm font-semibold text-rose">{lang === "et" ? "Muuda" : "Change"}</span>
          </button>

          {slots === null ? (
            <p className="py-10 text-center text-muted">{t.loading}</p>
          ) : slots.length === 0 ? (
            <p className="py-10 text-center text-muted">{t.noFreeTimes}</p>
          ) : (
            <>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
                {days.map((key) => {
                  const has = daysWithSlots.has(key);
                  const active = key === day;
                  return (
                    <button
                      key={key}
                      disabled={!has}
                      onClick={() => setDay(key)}
                      className={`flex w-[3.6rem] shrink-0 flex-col items-center rounded-2xl py-2.5 transition ${
                        active ? "bg-ink text-white" : has ? "bg-white ring-1 ring-line" : "text-muted/40"
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase">{dayLabel(key, { weekday: "short" })}</span>
                      <span className="text-xl font-semibold">{Number(key.slice(8))}</span>
                      <span className="text-[10px]">{dayLabel(key, { month: "short" })}</span>
                    </button>
                  );
                })}
              </div>

              {day && (
                <p className="mt-4 mb-3 text-sm font-medium text-muted first-letter:uppercase">
                  {dayLabel(day, { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
              {daySlots.length === 0 ? (
                <p className="py-6 text-center text-muted">{t.noTimesThisDay}</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {daySlots.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setSlot(s)}
                      className={`rounded-xl py-3 text-[15px] font-semibold transition ${
                        slot?.iso === s.iso ? "bg-ink text-white" : "bg-white ring-1 ring-line active:bg-sand"
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <BottomBar>
            <button
              disabled={!slot}
              onClick={() => go("details")}
              className="w-full rounded-full bg-ink py-4 text-lg font-semibold text-white shadow-lg transition disabled:bg-line disabled:text-muted disabled:shadow-none"
            >
              {slot ? `${t.continue} · ${slotLabel(slot)}` : t.continue}
            </button>
          </BottomBar>
        </>
      )}

      {/* 3. Details */}
      {step === "details" && service && slot && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="font-semibold">{service.name}</p>
            <p className="text-sm text-muted first-letter:uppercase">
              {dayLabel(slot.day, { weekday: "long", day: "numeric", month: "long" })}, {slot.time} · {service.duration}
            </p>
            <p className="mt-1 font-semibold">{service.price}</p>
          </div>

          <Field label={t.name}>
            <input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label={t.phone}>
            <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="+372 5xx xxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          </Field>
          <Field label={t.email}>
            <input required type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label={t.note}>
            <textarea rows={2} maxLength={500} placeholder={t.notePlaceholder} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input resize-none" />
          </Field>
          {/* Honeypot for spam bots, hidden from people */}
          <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />

          <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
            <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-ink" />
            <span className="text-[15px]">
              {t.acceptTerms1}
              <button type="button" onClick={() => setShowTerms(true)} className="font-semibold text-rose underline underline-offset-2">
                {t.acceptTerms2}
              </button>
            </span>
          </label>

          <BottomBar>
            <button type="submit" disabled={busy || !accepted} className="w-full rounded-full bg-ink py-4 text-lg font-semibold text-white shadow-lg transition disabled:bg-line disabled:text-muted disabled:shadow-none">
              {busy ? t.sending : t.confirm}
            </button>
          </BottomBar>
        </form>
      )}

      {/* 4. Done */}
      {step === "done" && service && slot && token && (
        <div className="pt-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">{t.doneTitle}</h1>
          <p className="mt-2 text-muted">{t.doneText}</p>
          <div className="mt-6 rounded-2xl bg-white p-5 text-left ring-1 ring-line">
            <p className="font-semibold">{service.name}</p>
            <p className="text-muted first-letter:uppercase">
              {dayLabel(slot.day, { weekday: "long", day: "numeric", month: "long" })}, {slot.time}
            </p>
            <p className="mt-1 font-semibold">{service.price}</p>
          </div>
          <a href={`/api/bookings/${token}/ics`} className="mt-6 block rounded-full bg-ink py-4 text-lg font-semibold text-white">
            📅 {t.addToCalendar}
          </a>
          <Link href={`/${lang}/booking/${token}`} className="mt-4 block text-sm font-semibold text-muted underline underline-offset-2">
            {t.manageBooking}
          </Link>
        </div>
      )}

      {showTerms && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setShowTerms(false)}>
          <div className="mx-auto max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 font-display text-2xl font-semibold">{t.terms}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-line">{terms}</p>
            <button
              onClick={() => {
                setAccepted(true);
                setShowTerms(false);
              }}
              className="mt-6 w-full rounded-full bg-ink py-4 font-semibold text-white"
            >
              {lang === "et" ? "Nõustun" : "I accept"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-cream via-cream/95 to-transparent px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
