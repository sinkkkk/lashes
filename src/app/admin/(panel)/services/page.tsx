import { getServices, type Service } from "@/lib/db";
import { deleteServiceAction, saveServiceAction } from "../../actions";

export default async function ServicesPage() {
  const services = await getServices(false);
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted">
        Iga teenuse pikkus määrab, millised ajad kliendile pakutakse. &quot;Puhver&quot; on koristus- või pausiaeg pärast protseduuri.
      </p>
      {services.map((s) => (
        <details key={s.id} className="group rounded-2xl bg-white ring-1 ring-line">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4">
            <span>
              <span className="font-semibold">{s.name_et}</span>
              {!s.active && <span className="ml-2 text-xs text-rose">peidetud</span>}
              <span className="block text-sm text-muted">
                {s.duration_min} min · {s.price_eur} €
              </span>
            </span>
            <span className="text-muted transition group-open:rotate-90">›</span>
          </summary>
          <div className="border-t border-line p-4">
            <ServiceForm s={s} />
            <form action={deleteServiceAction.bind(null, s.id)} className="mt-3">
              <button className="text-sm text-rose">Kustuta teenus</button>
            </form>
          </div>
        </details>
      ))}
      <details className="rounded-2xl bg-white ring-1 ring-line" open={services.length === 0}>
        <summary className="cursor-pointer list-none p-4 font-semibold text-rose">+ Lisa uus teenus</summary>
        <div className="border-t border-line p-4">
          <ServiceForm />
        </div>
      </details>
    </div>
  );
}

function ServiceForm({ s }: { s?: Service }) {
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
