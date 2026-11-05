"use client";
import { useTransition } from "react";
import { cancelBookingByOwner } from "../../actions";

export function OwnerCancel({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => confirm(`Tühistan ${name} broneeringu? Kliendile saadetakse teade.`) && start(() => cancelBookingByOwner(id, true))}
      className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/40 disabled:opacity-50"
    >
      Tühista
    </button>
  );
}
