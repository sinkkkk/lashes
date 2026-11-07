"use client";
import { useState, useTransition } from "react";
import { sendTestPushAction } from "../../actions";

export function PushTest() {
  const [result, setResult] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await sendTestPushAction()))}
        className="mt-4 w-full rounded-full bg-ink py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saadan…" : "Saada testteade"}
      </button>
      {result !== null && !pending && (
        <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${result ? "bg-emerald-50 text-emerald-800" : "bg-accent/10 text-accent"}`}>
          {result ? "Saadetud! Teade peaks kohe telefoni jõudma." : "Saatmine ebaõnnestus. Kontrolli NTFY_TOPIC väärtust Cloudflare'is."}
        </p>
      )}
    </>
  );
}
