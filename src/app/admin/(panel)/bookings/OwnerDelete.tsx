"use client";
import { useTransition } from "react";
import { deleteBookingAction } from "../../actions";

/** Deletes a test or spam booking for good, without emailing anyone. */
export function OwnerDelete({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        confirm(`Kustutan ${name} broneeringu jäädavalt? Klient teadet ei saa.\n(Päris tühistamiseks kasuta "Tühista".)`) &&
        start(() => deleteBookingAction(id))
      }
      className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-line disabled:opacity-50"
    >
      {pending ? "…" : "Kustuta"}
    </button>
  );
}
