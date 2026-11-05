"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { resetBackgroundAction, saveAppearanceAction, uploadBackgroundAction } from "../../actions";

type Preset = { name: string; hex: string };

const MESSAGES = {
  migration: "Enne seda lisa andmebaasi uued väljad: Supabase → SQL Editor → kleebi faili db/migrations/002_appearance.sql sisu → Run.",
  invalid: "See fail ei sobi. Kasuta JPG, PNG või WebP pilti.",
  too_big: "Pilt on liiga suur. Proovi teist pilti.",
} as const;

/** Shrinks a photo in the browser so uploads are quick and the page stays fast. */
async function shrink(file: File, maxWidth = 1200): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.78));
    let blob = await toBlob("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg"); // older iPhones
    if (!blob) throw new Error("could not encode");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AppearanceForm(props: { accent: string; darkness: number; bgUrl: string; isDefaultBg: boolean; presets: Preset[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [accent, setAccent] = useState(props.accent);
  const [darkness, setDarkness] = useState(props.darkness);
  const [bgUrl, setBgUrl] = useState(props.bgUrl);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = accent !== props.accent || darkness !== props.darkness;

  const show = (r: { ok: true } | { ok: false; error: keyof typeof MESSAGES }, okText: string) => {
    setMessage(r.ok ? { ok: true, text: okText } : { ok: false, text: MESSAGES[r.error] });
    if (r.ok) router.refresh();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    start(async () => {
      try {
        const blob = await shrink(file);
        const form = new FormData();
        form.set("photo", new File([blob], blob.type === "image/webp" ? "background.webp" : "background.jpg", { type: blob.type }));
        const r = await uploadBackgroundAction(form);
        if (r.ok) setBgUrl(URL.createObjectURL(blob));
        show(r, "Uus taustapilt on lehel!");
      } catch {
        setMessage({ ok: false, text: MESSAGES.invalid });
      }
    });
  };

  // The preview uses the chosen colour before it is saved.
  const previewVars = {
    "--color-accent": accent,
    "--color-accent-light": `color-mix(in oklab, ${accent} 62%, white)`,
  } as React.CSSProperties;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="font-semibold">Välimus</h2>
      <p className="mt-1 text-sm text-muted">Vali põhivärv ja avalehe taustapilt. Muudatus on kohe lehel näha.</p>

      {/* Preview: landing page (dark) next to a booking step (light) */}
      <div className="mt-4 grid grid-cols-2 gap-3" style={previewVars}>
        <div className="relative h-56 overflow-hidden rounded-xl bg-[#21140c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgb(0 0 0 / ${darkness}%)` }} />
          <div className="relative flex h-full flex-col justify-end p-3">
            <p className="font-display text-lg leading-tight text-[#fbf3ec]">Ripsmepikendused, mis püsivad</p>
            <p className="mt-1 text-xs text-accent-light">★★★★★</p>
            <div className="mt-2 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] text-white ring-1 ring-white/15">
              Volüümripsmed <span className="float-right text-accent-light">65 €</span>
            </div>
            <div className="mt-2 rounded-full bg-accent-light py-1.5 text-center text-xs font-semibold text-ink">Broneeri aeg</div>
          </div>
        </div>
        <div className="flex h-56 flex-col rounded-xl bg-cream p-3 ring-1 ring-line">
          <p className="text-xs font-semibold">Hübriidripsmed</p>
          <p className="text-[11px] text-accent">Muuda</p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {["10:00", "10:30", "11:00", "12:00", "12:30", "13:00"].map((x, i) => (
              <span key={x} className={`rounded-md py-1 text-center text-[10px] ${i === 2 ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                {x}
              </span>
            ))}
          </div>
          <div className="mt-auto rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-white">13:00 Mari · Volüüm</div>
          <p className="mt-1 text-center text-[10px] text-muted">admini kalender</p>
        </div>
      </div>

      {/* Accent colour */}
      <p className="mt-5 mb-2 text-xs font-medium text-muted">Põhivärv</p>
      <div className="flex flex-wrap items-center gap-2">
        {props.presets.map((p) => (
          <button
            key={p.hex}
            type="button"
            onClick={() => setAccent(p.hex)}
            title={p.name}
            aria-label={p.name}
            className={`h-10 w-10 rounded-full ring-offset-2 ${accent === p.hex ? "ring-2 ring-ink" : "ring-1 ring-line"}`}
            style={{ background: p.hex }}
          />
        ))}
        <label className="flex h-10 items-center gap-2 rounded-full px-3 text-sm ring-1 ring-line">
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
          Muu
        </label>
      </div>

      {/* Darkness */}
      <label className="mt-5 block">
        <span className="mb-2 flex justify-between text-xs font-medium text-muted">
          <span>Taustapildi tumedus</span>
          <span>{darkness}%</span>
        </span>
        <input type="range" min={0} max={80} step={5} value={darkness} onChange={(e) => setDarkness(Number(e.target.value))} className="w-full accent-ink" />
      </label>

      <button
        type="button"
        disabled={!dirty || pending}
        onClick={() => start(async () => show(await saveAppearanceAction(accent, darkness), "Salvestatud!"))}
        className="mt-4 w-full rounded-full bg-ink py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
      >
        {pending ? "…" : "Salvesta värv ja tumedus"}
      </button>

      {/* Background photo */}
      <p className="mt-6 mb-2 text-xs font-medium text-muted">Avalehe taustapilt</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className="rounded-full py-3 text-sm font-semibold ring-1 ring-line disabled:opacity-50">
          📷 Vaheta taustapilt
        </button>
        <button
          type="button"
          disabled={pending || props.isDefaultBg}
          onClick={() =>
            confirm("Tagasi algse taustapildi juurde?") &&
            start(async () => {
              const r = await resetBackgroundAction();
              if (r.ok) setBgUrl("/brand/background.webp");
              show(r, "Algne taustapilt on tagasi.");
            })
          }
          className="rounded-full py-3 text-sm font-semibold text-muted ring-1 ring-line disabled:opacity-40"
        >
          Taasta algne
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <p className="mt-2 text-xs text-muted">Sobib kõige paremini püstine (telefoni kujuline) tumedam pilt.</p>

      {message && (
        <p role="status" className={`mt-4 rounded-xl p-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-accent/10 text-accent"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
