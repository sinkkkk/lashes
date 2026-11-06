"use client";
import { useState, useTransition } from "react";
import { unsubscribeAction } from "../../actions";

export function UnsubscribeButton({ token, label, done, error }: { token: string; label: string; done: string; error: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [pending, start] = useTransition();
  if (state === "done") return <p className="mt-6 rounded-2xl bg-white p-5 text-center ring-1 ring-line">✓ {done}</p>;
  return (
    <>
      <button
        disabled={pending}
        onClick={() => start(async () => setState((await unsubscribeAction(token)).ok ? "done" : "error"))}
        className="mt-6 w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : label}
      </button>
      {state === "error" && <p className="mt-3 text-sm text-accent">{error}</p>}
    </>
  );
}
