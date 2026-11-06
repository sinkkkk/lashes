"use client";

import { useEffect } from "react";

/** Bottom sheet on phones, centred card on bigger screens. Closes on backdrop tap or Escape. */
export function BottomSheet({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop fixed inset-0 z-30 flex items-end bg-black/40 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="sheet max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(max(1.25rem,env(safe-area-inset-bottom))+var(--host-badge,0px))] md:max-w-md md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        {children}
      </div>
    </div>
  );
}
