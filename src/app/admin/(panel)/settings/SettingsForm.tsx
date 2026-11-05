"use client";
import { useActionState } from "react";
import { saveSettingsAction } from "../../actions";

/** The booking settings + terms form, with a clear "saved" message. */
export function SettingsForm({ children }: { children: React.ReactNode }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line">
      {children}
      <button disabled={pending} className="w-full rounded-full bg-ink py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Salvestan…" : "Salvesta"}
      </button>
      {state && !pending && (
        <p key={state.at} role="status" className={`rounded-xl p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-accent/10 text-accent"}`}>
          {state.ok ? "Salvestatud ✓ Muudatused on lehel." : "Salvestamine ebaõnnestus. Proovi uuesti."}
        </p>
      )}
    </form>
  );
}
