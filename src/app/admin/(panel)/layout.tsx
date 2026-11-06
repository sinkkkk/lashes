import { requireAdmin } from "@/lib/auth";
import { site } from "@/lib/site";
import { AdminNav } from "./AdminNav";
import { logoutAction } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl pb-[calc(5.5rem+env(safe-area-inset-bottom)+var(--host-badge,0px))] md:pb-[calc(2rem+var(--host-badge,0px))]">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-display text-xl font-semibold">{site.name}</span>
          <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Admin</span>
        </span>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          {/* On phones these are icons, so the full business name fits next to them. */}
          <a href="/et" target="_blank" className="flex items-center gap-1 text-muted" aria-label="Vaata lehte" title="Vaata lehte">
            <span className="hidden sm:inline">Vaata lehte</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
            </svg>
          </a>
          <form action={logoutAction}>
            <button className="flex items-center gap-1 text-muted" aria-label="Logi välja" title="Logi välja">
              <span className="hidden sm:inline">Logi välja</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l4-4-4-4M14 12H4" />
              </svg>
            </button>
          </form>
        </div>
      </header>
      <AdminNav />
      <div className="px-4 pt-2">{children}</div>
    </div>
  );
}
