"use client";

import etLocale from "@fullcalendar/core/locales/et";
import type {
  DateSelectArg,
  DatesSetArg,
  EventApi,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { cleanColor, readableText } from "@/lib/colors";
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
  /** The service's colour (lash type), or null for the accent colour */
  color: string | null;
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

/** The view switch, like Google / Apple Calendar. */
const VIEWS = [
  { id: "timeGridDay", label: "Päev" },
  { id: "timeGrid3", label: "3 päeva" },
  { id: "timeGridWeek", label: "Nädal" },
  { id: "dayGridMonth", label: "Kuu" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];
const VIEW_KEY = "admin-calendar-view";

function savedView(isMobile: boolean): ViewId {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (VIEWS.some((x) => x.id === v)) return v as ViewId;
  } catch {}
  return isMobile ? "timeGrid3" : "timeGridWeek";
}

export function AdminCalendar() {
  const cal = useRef<FullCalendar>(null);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<BookingInfo | null>(null);
  const [freeSheet, setFreeSheet] = useState<EventApi | null>(null);
  const [view, setView] = useState<ViewId | null>(null);
  const [title, setTitle] = useState("");
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
        // Colour-coded by service (lash type); falls back to the accent colour.
        ...(cleanColor(b.color) ? { backgroundColor: cleanColor(b.color)!, borderColor: cleanColor(b.color)! } : {}),
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

  /** Switch view (and remember it on this device). */
  function changeView(id: ViewId, date?: Date) {
    api()?.changeView(id, date);
    try {
      localStorage.setItem(VIEW_KEY, id);
    } catch {}
  }

  const onDatesSet = (d: DatesSetArg) => {
    setTitle(d.view.title);
    setView(d.view.type as ViewId);
  };

  // Month view: tapping a day opens that day (like Google / Apple Calendar).
  const onDateClick = (d: { date: Date; view: { type: string } }) => {
    if (d.view.type === "dayGridMonth") changeView("timeGridDay", d.date);
  };

  // Swipe left / right to go to the next / previous period. Only quick, mostly sideways
  // swipes count, so press-and-hold to add time and dragging blocks are not affected.
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipe.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0 || document.querySelector(".fc-event-mirror, .fc-event-dragging, .fc-event-resizing")) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x;
    const dy = t.clientY - s0.y;
    if (Date.now() - s0.t < 450 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx < 0) api()?.next();
      else api()?.prev();
    }
  };

  /** How a block looks inside the calendar. */
  const renderEvent = (arg: EventContentArg) => {
    const kind = arg.event.extendedProps.kind;
    if (arg.view.type === "dayGridMonth") {
      // Month view: small chips, e.g. "10:00 Mari" or "10–18" for time for lashes.
      if (kind === "booking") {
        const b = arg.event.extendedProps.booking as BookingInfo;
        const color = cleanColor(b.color);
        return (
          <div className="ev-month" style={color ? { color: readableText(color) } : undefined}>
            <b>{arg.timeText.split(" ")[0]}</b> {b.customer_name}
          </div>
        );
      }
      const short = (d: Date | null) => (d ? time(d).replace(/:00$/, "") : "");
      return (
        <div className="ev-month">
          {short(arg.event.start)}–{short(arg.event.end)}
        </div>
      );
    }
    if (arg.isMirror && kind !== "free" && kind !== "booking") {
      return (
        <div className="ev ev-new">
          <span className="ev-time">+ {arg.timeText}</span>
        </div>
      );
    }
    if (kind === "booking") {
      const b = arg.event.extendedProps.booking as BookingInfo;
      const color = cleanColor(b.color);
      return (
        <div className="ev" style={color ? { color: readableText(color) } : undefined}>
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
  const latest = useRef({ load, onSelect, onChange, onClick, renderEvent, onDatesSet, onDateClick });
  useLayoutEffect(() => {
    latest.current = { load, onSelect, onChange, onClick, renderEvent, onDatesSet, onDateClick };
  });
  const stable = useMemo(
    () => ({
      events: (info: EventSourceFuncArg) => latest.current.load(info),
      select: (a: DateSelectArg) => latest.current.onSelect(a),
      eventChange: (c: EventChangeArg) => void latest.current.onChange(c),
      eventClick: (c: EventClickArg) => latest.current.onClick(c),
      eventContent: (a: EventContentArg) => latest.current.renderEvent(a),
      loading: (on: boolean) => setLoading(on),
      datesSet: (d: DatesSetArg) => latest.current.onDatesSet(d),
      dateClick: (d: { date: Date; view: { type: string } }) => latest.current.onDateClick(d),
    }),
    [],
  );
  const views = useMemo(
    () => ({
      timeGrid3: { type: "timeGrid", duration: { days: 3 } },
      dayGridMonth: { eventDisplay: "block", dayMaxEvents: 3, fixedWeekCount: false },
    }),
    [],
  );
  const initialView = useMemo(() => (isMobile === null ? null : savedView(isMobile)), [isMobile]);
  const isMonth = view === "dayGridMonth";

  if (isMobile === null) return null;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {isMonth ? (
          <>Puuduta päeva, et see avada ja aegu lisada.</>
        ) : (
          <>
            {isMobile ? "Hoia sõrme tühjal kohal ja lohista" : "Lohista tühjal alal"}, et lisada{" "}
            <b className="text-[#3f7a4c]">{FREE_LABEL.toLowerCase()}</b>. Lohista servast pikkuse muutmiseks, puuduta muutmiseks või
            kustutamiseks. <b className="text-accent">Värvilised</b> on broneeringud.
          </>
        )}
      </p>
      <div
        className={`cal-wrap relative rounded-2xl bg-white p-2 ring-1 ring-line md:p-4 ${loading ? "is-loading" : ""}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="cal-progress" aria-hidden />
        {/* Toolbar like Google / Apple Calendar: arrows, title, Today, and a view switch */}
        <div className="mb-2 flex items-center gap-1.5">
          <button type="button" onClick={() => api()?.prev()} className="cal-nav" aria-label="Eelmine">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" onClick={() => api()?.next()} className="cal-nav" aria-label="Järgmine">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <h2 className="min-w-0 flex-1 truncate px-1 text-base font-semibold first-letter:uppercase md:text-lg">{title}</h2>
          <button type="button" onClick={() => api()?.today()} className="rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-line active:scale-95">
            Täna
          </button>
        </div>
        <div role="tablist" aria-label="Vaade" className="mb-3 grid grid-cols-4 gap-1 rounded-full bg-sand p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              type="button"
              aria-selected={view === v.id}
              onClick={() => changeView(v.id)}
              className={`rounded-full py-2 text-sm font-semibold transition ${view === v.id ? "bg-white text-ink shadow-sm" : "text-muted active:bg-white/60"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <FullCalendar
          ref={cal}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          locale={etLocale}
          initialView={initialView ?? "timeGridWeek"}
          views={views}
          headerToolbar={false}
          datesSet={stable.datesSet}
          dateClick={stable.dateClick}
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
          selectable={!isMonth}
          selectMirror
          longPressDelay={200}
          selectLongPressDelay={200}
          eventLongPressDelay={200}
          editable={!isMonth}
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

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <p className="text-sm text-muted first-letter:uppercase">
            {date(open.starts_at)} · {range(open.starts_at, open.ends_at)}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{open.customer_name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 font-medium">
            <span
              className="rounded-full px-2.5 py-0.5 text-sm font-semibold"
              style={
                cleanColor(open.color)
                  ? { background: cleanColor(open.color)!, color: readableText(cleanColor(open.color)!) }
                  : { background: "var(--color-accent)", color: "#fff" }
              }
            >
              {open.service}
            </span>
            <span>{Number(open.price_eur)} €</span>
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
