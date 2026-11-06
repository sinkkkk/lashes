"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { REVIEW_FORMATS, REVIEW_THEMES, brandTheme, type ReviewFormat } from "@/lib/reviewThemes";

const PREFS_KEY = "review-image-prefs";

/**
 * Wraps a review card in admin → Reviews: press and hold it (or tap "📸 Pilt") to make an image
 * of the review for Instagram / TikTok and save it to the phone's Photos.
 */
export function ReviewImage({ id, name, accent, children }: { id: string; name: string; accent: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    clearTimeout(timer.current);
    start.current = null;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if ("vibrate" in navigator) navigator.vibrate?.(10);
      setOpen(true);
    }, 450);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) cancel(); // scrolling, not holding
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <div
        className="review-pressable"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-line active:bg-sand">
        📸 Pilt
      </button>
      {open && <ReviewImageSheet id={id} name={name} accent={accent} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReviewImageSheet({ id, name, accent, onClose }: { id: string; name: string; accent: string; onClose: () => void }) {
  const [prefs, setPrefs] = useState<{ format: ReviewFormat; theme: string }>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
      if (p && p.format in REVIEW_FORMATS && typeof p.theme === "string") return p;
    } catch {}
    return { format: "story", theme: "roos" };
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (p: Partial<typeof prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    setLoading(true);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  };

  const src = `/api/admin/review-image/${id}?format=${prefs.format}&theme=${prefs.theme}`;
  const themes = [...REVIEW_THEMES, brandTheme(accent)];

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      // "Õnne-Liis Žukova" → "onne-liis-zukova"
      const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const fileName = `review-${slug || "pilt"}-${prefs.format}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        // iPhone: opens the share sheet, where "Salvesta pilt / Save Image" puts it in Photos.
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        setMessage("Pilt laaditi alla.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMessage("Pildi tegemine ebaõnnestus. Proovi uuesti.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet onClose={onClose} label="Review pilt">
      <h2 className="font-display text-xl font-semibold">Review pildiks</h2>
      <p className="text-sm text-muted">Instagrami ja TikToki jaoks. See kujundus on ainult pildil, mitte lehel.</p>

      <div className="relative mx-auto mt-4 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`Review pilt: ${name}`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          className={`max-h-[46dvh] w-auto rounded-xl shadow-[0_14px_36px_-16px_rgb(0_0_0/0.4)] transition-opacity ${loading ? "opacity-40" : "opacity-100"}`}
          style={{ aspectRatio: `${REVIEW_FORMATS[prefs.format].w} / ${REVIEW_FORMATS[prefs.format].h}` }}
        />
        {loading && <span className="absolute inset-0 m-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden />}
      </div>

      <p className="mt-4 mb-1.5 text-xs font-medium text-muted">Formaat</p>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-sand p-1">
        {(Object.keys(REVIEW_FORMATS) as ReviewFormat[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => update({ format: f })}
            className={`rounded-full py-2 text-sm font-semibold ${prefs.format === f ? "bg-white text-ink shadow-sm" : "text-muted"}`}
          >
            {REVIEW_FORMATS[f].label}
          </button>
        ))}
      </div>

      <p className="mt-4 mb-1.5 text-xs font-medium text-muted">Teema</p>
      <div className="flex flex-wrap gap-1.5">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => update({ theme: t.id })}
            title={t.name}
            aria-label={t.name}
            aria-pressed={prefs.theme === t.id}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-base ring-offset-2 ${prefs.theme === t.id ? "ring-2 ring-ink" : "ring-1 ring-line"}`}
            style={{ background: `linear-gradient(180deg, ${t.from}, ${t.to})`, color: t.star }}
          >
            ★
          </button>
        ))}
      </div>

      <button type="button" onClick={save} disabled={busy || loading} className="mt-5 w-full rounded-full bg-ink py-3.5 font-semibold text-white disabled:opacity-60">
        {busy ? "Teen pilti…" : "Salvesta pilt"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">Või hoia pildil sõrme → „Lisa Fotodesse“.</p>
      {message && <p className="mt-2 text-center text-sm text-muted">{message}</p>}
    </BottomSheet>
  );
}
