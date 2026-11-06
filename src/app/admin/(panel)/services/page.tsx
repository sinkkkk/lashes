import { db, getServices, type Service } from "@/lib/db";
import { saveServiceAction } from "../../actions";
import { DeleteServiceButton } from "./DeleteServiceButton";
import { ServiceColorField, type UsedColor } from "./ServiceColorField";
import { SortableServices } from "./SortableServices";

export default async function ServicesPage() {
  const [services, counts] = await Promise.all([
    getServices(false),
    db()`select service_id, count(*)::int as n from bookings
         where status = 'confirmed' and starts_at > now() group by service_id`,
  ]);
  const upcoming = new Map(counts.map((c) => [c.service_id as string, c.n as number]));
  // Colours in use, with the services that use them (so a lash type's colour is one tap away).
  const usedMap = new Map<string, string[]>();
  for (const s of services) if (s.color) usedMap.set(s.color, [...(usedMap.get(s.color) ?? []), s.name_et]);
  const used: UsedColor[] = [...usedMap].map(([hex, names]) => ({ hex, names }));
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted">
        Iga teenuse pikkus määrab, millised ajad kliendile pakutakse. &quot;Puhver&quot; on koristus- või pausiaeg pärast protseduuri.
      </p>
      <SortableServices
        items={services.map((s) => ({
          id: s.id,
          summary: (
            <>
              <span className="flex items-center gap-3">
                <span aria-hidden className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/5" style={{ background: s.color ?? "var(--color-accent)" }} />
                <span>
                  <span className="font-semibold">{s.name_et}</span>
                  {!s.active && <span className="ml-2 text-xs text-accent">peidetud</span>}
                  <span className="block text-sm text-muted">
                    {s.duration_min} min · {s.price_eur} €
                  </span>
                </span>
              </span>
              <span className="text-muted transition group-open:rotate-90">›</span>
            </>
          ),
          body: (
            <>
              <ServiceForm s={s} used={used} />
              <DeleteServiceButton id={s.id} name={s.name_et} upcoming={upcoming.get(s.id) ?? 0} />
            </>
          ),
        }))}
      />
      <details className="rounded-2xl bg-white ring-1 ring-line" open={services.length === 0}>
        <summary className="cursor-pointer list-none p-4 font-semibold text-accent">+ Lisa uus teenus</summary>
        <div className="border-t border-line p-4">
          <ServiceForm used={used} />
        </div>
      </details>
    </div>
  );
}

function ServiceForm({ s, used }: { s?: Service; used: UsedColor[] }) {
  return (
    <form action={saveServiceAction} className="grid grid-cols-2 gap-3">
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <L label="Nimi (eesti)" full><input name="name_et" required defaultValue={s?.name_et} className="input" /></L>
      <L label="Name (English)" full><input name="name_en" defaultValue={s?.name_en} className="input" /></L>
      <L label="Kirjeldus (eesti)" full><textarea name="description_et" rows={2} defaultValue={s?.description_et} className="input" /></L>
      <L label="Description (English)" full><textarea name="description_en" rows={2} defaultValue={s?.description_en} className="input" /></L>
      <L label="Kestus (min)"><input name="duration_min" type="number" min={15} step={15} required defaultValue={s?.duration_min ?? 60} className="input" /></L>
      <L label="Hind (€)"><input name="price_eur" type="number" min={0} step="0.5" required defaultValue={s?.price_eur ?? ""} className="input" /></L>
      <L label="Puhver pärast (min)"><input name="buffer_min" type="number" min={0} step={5} defaultValue={s?.buffer_min ?? 15} className="input" /></L>
      <L label="Järjekord"><input name="sort" type="number" defaultValue={s?.sort ?? 0} className="input" /></L>
      <ServiceColorField value={s?.color ?? null} used={used} />
      <L label="Pildi link (valikuline)" full><input name="photo_url" type="url" placeholder="https://…" defaultValue={s?.photo_url} className="input" /></L>
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="h-5 w-5 accent-ink" /> Nähtav klientidele
      </label>
      <button className="col-span-2 rounded-full bg-ink py-3 font-semibold text-white">Salvesta</button>
    </form>
  );
}

function L({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={full ? "col-span-2" : ""}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
