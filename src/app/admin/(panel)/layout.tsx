import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";
import { logoutAction } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <span className="font-display text-xl font-semibold">Liisu Lashes · Admin</span>
        <div className="flex items-center gap-4 text-sm">
          <a href="/et" target="_blank" className="text-muted">Vaata lehte ↗</a>
          <form action={logoutAction}>
            <button className="text-muted">Logi välja</button>
          </form>
        </div>
      </header>
      <AdminNav />
      <div className="px-4 pt-2">{children}</div>
    </div>
  );
}
