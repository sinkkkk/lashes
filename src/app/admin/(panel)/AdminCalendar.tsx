"use client";

import etLocale from "@fullcalendar/core/locales/et";
import type {
  DateSelectArg,
  EventApi,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { cancelBookingByOwner, deleteBookingAction } from "../actions";

/** The name of the owner's open time blocks, shown in the calendar. */
const FREE_LABEL = "Aeg Ripsmeteks";

type BookingInfo = {
  id: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  phone: string;
  email: string;
  note: string;
  service: string;
  price_eur: string;
};

type Saved = { id: string; starts_at: string; ends_at: string };
type Toast = { text: string; action?: { label: string; run: () => void }; error?: boolean; key: number };

const time = (d: Date | string) => new Date(d).toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
const date = (d: Date | string) => new Date(d).toLocaleDateString("et-EE", { weekday: "long", day: "numeric", month: "long" });
const range = (s: Date | string, e: Date | string) => `${time(s)}–${time(e)}`;

const freeEvent = (id: string, start: Date | string, end: Date | string): EventInput => ({
  id,
  start,
  end,
  title: FREE_LABEL,
  classNames: ["free-block"],
  editable: true,
  extendedProps: { kind: "free" },
});

export function AdminCalendar() {
  const cal = useRef<FullCalendar>(null);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<BookingInfo | null>(null);
  const [freeSheet, setFreeSheet] = useState<EventApi | null>(null);
  const [copySheet, setCopySheet] = useState<Date | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Saves still on their way to the server, by the block's temporary id. */
  const inflight = useRef(new Map<string, Promise<void>>());
  /** Temporary id → real database id, once the server has answered. */
  const realIds = useRef(new Map<string, string>());
  /** True while we update a block with the server's answer (not a user edit). */
  const syncing = useRef(false);

  const api = () => cal.current?.getApi();
  const refetch = () => api()?.refetchEvents();

  const flash = (text: string, opts: Omit<Toast, "text" | "key"> = {}) => {
    clearTimeout(toastTimer.current);
    setToast({ text, ...opts, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), opts.action ? 5000 : 2500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function load(info: EventSourceFuncArg): Promise<EventInput[]> {
    const res = await fetch(`/api/admin/calendar?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`, { cache: "no-store" });
    if (res.status === 401) {
      router.push("/admin/login");
      return [];
    }
    const data = (await res.json()) as { availability: Saved[]; bookings: BookingInfo[] };
    return [
      ...data.availability.map((a) => freeEvent(a.id, a.starts_at, a.ends_at)),
      ...data.bookings.map((b) => ({
        id: b.id,
        start: b.starts_at,
        end: b.ends_at,
        title: b.customer_name,
        classNames: ["booking-block"],
        editable: false,
        extendedProps: { kind: "booking", booking: b },
      })),
    ];
  }

  /**
   * Saves a block in the background. The calendar already shows the change; when the server
   * answers we only fix up the id, and the size if it was joined with touching blocks.
   */
  async function persist(ev: EventApi, replaceId?: string): Promise<Saved | null> {
    if (!ev.start || !ev.end) return null;
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: ev.start.toISOString(), end: ev.end.toISOString(), replaceId }),
    }).catch(() => null);
    if (!res?.ok) return null;
    const row = (await res.json()) as Saved;
    // The block may have been deleted while it was saving: then there is nothing to update here.
    if (!api()?.getEventById(ev.id)) return row;
    const s = new Date(row.starts_at).getTime();
    const e = new Date(row.ends_at).getTime();
    syncing.current = true;
    try {
      // The server joined touching blocks into this one: drop those copies here too.
      for (const other of api()?.getEvents() ?? []) {
        if (other.id === ev.id || other.extendedProps.kind !== "free" || !other.start || !other.end) continue;
        if (other.start.getTime() <= e && other.end.getTime() >= s) other.remove();
      }
      ev.setProp("id", row.id);
      if (ev.start.getTime() !== s || ev.end.getTime() !== e) ev.setDates(row.starts_at, row.ends_at);
    } finally {
      syncing.current = false;
    }
    return row;
  }

  /** Adds a block instantly, then saves it. */
  function addFree(start: Date, end: Date, withUndo = true) {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ev = api()?.addEvent(freeEvent(tmpId, start, end));
    if (!ev) return;
    if ("vibrate" in navigator) navigator.vibrate?.(8);
    const job = persist(ev).then((row) => {
      inflight.current.delete(tmpId);
      if (row) realIds.current.set(tmpId, row.id);
      if (!row) {
        ev.remove();
        flash("Salvestamine ebaõnnestus, proovi uuesti", { error: true });
        return;
      }
      const merged = new Date(row.starts_at).getTime() !== start.getTime() || new Date(row.ends_at).getTime() !== end.getTime();
      flash(
        merged ? `${FREE_LABEL}: ${range(row.starts_at, row.ends_at)} (liideti kokku)` : `${FREE_LABEL} lisatud ${range(start, end)}`,
        // Undo only when nothing was joined, so it never removes time that was there before.
        withUndo && !merged ? { action: { label: "Võta tagasi", run: () => removeFree(ev, false) } } : {},
      );
    });
    inflight.current.set(tmpId, job);
  }

  /** Removes a block instantly, then deletes it on the server; offers undo. */
  async function removeFree(ev: EventApi, withUndo = true) {
    const id = ev.id;
    const start = ev.start!;
    const end = ev.end!;
    ev.remove();
    await inflight.current.get(id); // a just-added block must be saved before it can be deleted
    const realId = realIds.current.get(id) ?? id;
    if (realId.startsWith("tmp-")) return; // it never reached the server
    const res = await fetch(`/api/admin/availability?id=${encodeURIComponent(realId)}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      api()?.addEvent(freeEvent(realId, start, end));
      flash("Kustutamine ebaõnnestus", { error: true });
      return;
    }
    flash(
      `${FREE_LABEL} ${range(start, end)} kustutatud`,
      withUndo ? { action: { label: "Võta tagasi", run: () => addFree(start, end, false) } } : {},
    );
  }

  const onSelect = (s: DateSelectArg) => {
    s.view.calendar.unselect();
    addFree(s.start, s.end);
  };

  const onChange = async (c: EventChangeArg) => {
    if (syncing.current) return;
    if (c.event.extendedProps.kind !== "free") return c.revert();
    await inflight.current.get(c.oldEvent.id); // wait if this block is still being created
    const row = await persist(c.event, c.event.id.startsWith("tmp-") ? undefined : c.event.id);
    if (!row) {
      c.revert();
      flash("Muudatust ei saanud salvestada", { error: true });
    } else {
      flash(`${FREE_LABEL} ${range(row.starts_at, row.ends_at)}`);
    }
  };

  const onClick = (c: EventClickArg) => {
    const p = c.event.extendedProps;
    if (p.kind === "booking") setOpen(p.booking as BookingInfo);
    else if (p.kind === "free") setFreeSheet(c.event);
  };

  function openCopy() {
    const view = api()?.view;
    if (!view) return;
    // On the phone the view is 3 days, so always copy the whole Monday-Sunday week.
    const d = new Date(view.currentStart);
    setCopySheet(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
  }

  async function copyWeek(monday: Date) {
    setCopySheet(null);
    const res = await fetch("/api/admin/copy-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: monday.toISOString() }),
    }).catch(() => null);
    const data = res?.ok ? ((await res.json()) as { copied: number }) : null;
    if (!data) return flash("Kopeerimine ebaõnnestus", { error: true });
    flash(data.copied ? `Kopeeritud ${data.copied} aega järgmisele nädalale` : "Sellel nädalal pole aegu, mida kopeerida");
    refetch();
  }

  /** How a block looks inside the calendar. */
  const renderEvent = (arg: EventContentArg) => {
    const kind = arg.event.extendedProps.kind;
    if (arg.isMirror && kind !== "free" && kind !== "booking") {
      return (
        <div className="ev ev-new">
          <span className="ev-time">+ {arg.timeText}</span>
        </div>
      );
    }
    if (kind === "booking") {
      const b = arg.event.extendedProps.booking as BookingInfo;
      return (
        <div className="ev">
          <span className="ev-time">{arg.timeText}</span>
          <span className="ev-title">{b.customer_name}</span>
          <span className="ev-sub">{b.service}</span>
        </div>
      );
    }
    return (
      <div className="ev">
        <span className="ev-time">{arg.timeText}</span>
        <span className="ev-title">{FREE_LABEL}</span>
      </div>
    );
  };

  // FullCalendar reloads the week whenever it is handed a new loader function, so give it
  // stable wrappers that always call the latest handlers (no reload loops, no flicker).
  const latest = useRef({ load, onSelect, onChange, onClick, renderEvent, openCopy });
  latest.current = { load, onSelect, onChange, onClick, renderEvent, openCopy };
  const stable = useMemo(
    () => ({
      events: (info: EventSourceFuncArg) => latest.current.load(info),
      select: (a: DateSelectArg) => latest.current.onSelect(a),
      eventChange: (c: EventChangeArg) => void latest.current.onChange(c),
      eventClick: (c: EventClickArg) => latest.current.onClick(c),
      eventContent: (a: EventContentArg) => latest.current.renderEvent(a),
      loading: (on: boolean) => setLoading(on),
    }),
    [],
  );
  const layout = useMemo(
    () => ({
      views: { timeGrid3: { type: "timeGrid", duration: { days: 3 }, buttonText: "3 päeva" } },
      headerToolbar: isMobile
        ? { left: "prev,next", center: "title", right: "copy" }
        : { left: "prev,next today", center: "title", right: "copy timeGridDay,timeGrid3,timeGridWeek" },
      customButtons: { copy: { text: isMobile ? "Kopeeri ⇢" : "Kopeeri nädal järgmisse ⇢", click: () => latest.current.openCopy() } },
    }),
    [isMobile],
  );

  if (isMobile === null) return null;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {isMobile ? "Hoia sõrme tühjal kohal ja lohista" : "Lohista tühjal alal"}, et lisada{" "}
        <b className="text-[#3f7a4c]">{FREE_LABEL.toLowerCase()}</b>. Lohista servast pikkuse muutmiseks, puuduta muutmiseks või
        kustutamiseks. <b className="text-accent">Värvilised</b> on broneeringud.
      </p>
      <div className={`cal-wrap relative rounded-2xl bg-white p-2 ring-1 ring-line md:p-4 ${loading ? "is-loading" : ""}`}>
        <div className="cal-progress" aria-hidden />
        <FullCalendar
          ref={cal}
          plugins={[timeGridPlugin, interactionPlugin]}
          locale={etLocale}
          initialView={isMobile ? "timeGrid3" : "timeGridWeek"}
          views={layout.views}
          headerToolbar={layout.headerToolbar}
          customButtons={layout.customButtons}
          firstDay={1}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          scrollTime="09:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          height="auto"
          nowIndicator
          selectable
          selectMirror
          longPressDelay={200}
          selectLongPressDelay={200}
          eventLongPressDelay={200}
          editable
          eventOverlap
          selectOverlap
          events={stable.events}
          loading={stable.loading}
          select={stable.select}
          eventChange={stable.eventChange}
          eventClick={stable.eventClick}
          eventContent={stable.eventContent}
          eventOrder={eventOrder}
        />
      </div>

      {toast && (
        <div key={toast.key} role="status" className="toast fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit max-w-[92vw] items-center gap-4 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-sm text-white shadow-[0_12px_30px_-10px_rgb(0_0_0/0.45)] md:bottom-8">
          <span className={toast.error ? "text-[#ffb4a8]" : ""}>{toast.text}</span>
          {toast.action ? (
            <button
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
              className="rounded-full bg-white/15 px-3 py-1.5 font-semibold text-accent-light active:bg-white/25"
            >
              {toast.action.label}
            </button>
          ) : (
            <span className="w-2.5" />
          )}
        </div>
      )}

      {freeSheet && freeSheet.start && freeSheet.end && (
        <Sheet onClose={() => setFreeSheet(null)}>
          <p className="text-sm text-muted first-letter:uppercase">{date(freeSheet.start)}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            {FREE_LABEL} · {range(freeSheet.start, freeSheet.end)}
          </h2>
          <p className="mt-2 text-sm text-muted">Pikkuse muutmiseks lohista kalendris ploki serva. Broneeringud jäävad alles ka siis, kui aja kustutad.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setFreeSheet(null)} className="rounded-full py-3 font-semibold ring-1 ring-line">
              Sulge
            </button>
            <button
              onClick={() => {
                const ev = freeSheet;
                setFreeSheet(null);
                removeFree(ev);
              }}
              className="rounded-full bg-ink py-3 font-semibold text-white"
            >
              Kustuta
            </button>
          </div>
        </Sheet>
      )}

      {copySheet && (
        <Sheet onClose={() => setCopySheet(null)}>
          <h2 className="font-display text-2xl font-semibold">Kopeeri nädal</h2>
          <p className="mt-2 text-sm text-muted">
            Kõik ajad ripsmeteks nädalast, mis algab <b>{copySheet.toLocaleDateString("et-EE", { day: "numeric", month: "long" })}</b>, kopeeritakse samadele
            kellaaegadele järgmisel nädalal. Olemasolevad ajad jäävad alles.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setCopySheet(null)} className="rounded-full py-3 font-semibold ring-1 ring-line">
              Sulge
            </button>
            <button onClick={() => copyWeek(copySheet)} className="rounded-full bg-ink py-3 font-semibold text-white">
              Kopeeri
            </button>
          </div>
        </Sheet>
      )}

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <p className="text-sm text-muted first-letter:uppercase">
            {date(open.starts_at)} · {range(open.starts_at, open.ends_at)}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{open.customer_name}</h2>
          <p className="font-medium">
            {open.service} · {Number(open.price_eur)} €
          </p>
          {open.note && <p className="mt-3 rounded-xl bg-sand p-3 text-sm">📝 {open.note}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={`tel:${open.phone}`} className="rounded-full bg-ink py-3 text-center font-semibold text-white">
              📞 Helista
            </a>
            <a href={`sms:${open.phone}`} className="rounded-full py-3 text-center font-semibold ring-1 ring-line">
              💬 SMS
            </a>
          </div>
          <p className="mt-3 text-center text-sm text-muted">
            {open.phone} ·{" "}
            <a href={`mailto:${open.email}`} className="underline">
              {open.email}
            </a>
          </p>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Tühistan ${open.customer_name} broneeringu? Kliendile saadetakse teade.`)) return;
              startTransition(async () => {
                await cancelBookingByOwner(open.id, true);
                setOpen(null);
                refetch();
                flash("Broneering tühistatud");
              });
            }}
            className="mt-5 w-full rounded-full py-3 font-semibold text-accent ring-1 ring-accent/40"
          >
            Tühista broneering
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Kustutan ${open.customer_name} broneeringu jäädavalt? Klient teadet ei saa.`)) return;
              startTransition(async () => {
                await deleteBookingAction(open.id);
                setOpen(null);
                refetch();
                flash("Broneering kustutatud");
              });
            }}
            className="mt-3 w-full py-2 text-sm text-muted underline underline-offset-2"
          >
            Kustuta (test / spämm)
          </button>
        </Sheet>
      )}
    </div>
  );
}

/** Time blocks first, bookings on top of them. */
const eventOrder = (a: unknown, b: unknown) =>
  ((a as EventInput).extendedProps?.kind === "booking" ? 1 : 0) - ((b as EventInput).extendedProps?.kind === "booking" ? 1 : 0);

/** Bottom sheet on phones, centred card on bigger screens. Closes on backdrop tap or Escape. */
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        className="sheet w-full rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        {children}
      </div>
    </div>
  );
}

const PHONE = "(max-width: 767px)";
/** true on phones, false on bigger screens, null while rendering on the server */
function useIsMobile(): boolean | null {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(PHONE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE).matches,
    () => null,
  );
}
