"use client";
import { useState, useTransition } from "react";
import { deleteServiceAction } from "../../actions";

export function DeleteServiceButton({ id, name, upcoming }: { id: string; name: string; upcoming: number }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const ask = () => {
    const extra = upcoming > 0 ? `\n\nSellel teenusel on ${upcoming} tulevast broneeringut – need jäävad alles.` : "";
    if (!confirm(`Kustutan teenuse „${name}“? Klientidele seda enam ei näidata.${extra}`)) return;
    start(async () => setFailed(!(await deleteServiceAction(id)).ok));
  };
  return (
    <div className="mt-4 border-t border-line pt-3">
      <button type="button" onClick={ask} disabled={pending} className="text-sm font-medium text-accent disabled:opacity-50">
        {pending ? "Kustutan…" : "Kustuta teenus"}
      </button>
      {failed && <p className="mt-1 text-sm text-accent">Kustutamine ebaõnnestus. Proovi uuesti.</p>}
    </div>
  );
}
