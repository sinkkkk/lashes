"use client";
import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input name="password" type="password" required autoComplete="current-password" placeholder="Parool" className="input" autoFocus />
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-60">
        {pending ? "…" : "Logi sisse"}
      </button>
    </form>
  );
}
