"use client";
import { useTransition } from "react";
import { cancelBookingAction } from "../../actions";

export function CancelButton({ token, label, confirmText }: { token: string; label: string; confirmText: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => confirm(confirmText) && start(() => cancelBookingAction(token))}
      className="mt-3 w-full rounded-full py-4 font-semibold text-rose ring-1 ring-rose/40 disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
