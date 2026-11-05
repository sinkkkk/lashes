"use client";

import etLocale from "@fullcalendar/core/locales/et";
import type { DateSelectArg, EventChangeArg, EventClickArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { cancelBookingByOwner } from "../actions";

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

const time = (iso: string) => new Date(iso).toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
const date = (iso: string) => new Date(iso).toLocaleDateString("et-EE", { weekday: "long", day: "numeric", month: "long" });

export function AdminCalendar() {
  const cal = useRef<FullCalendar>(null);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<BookingInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refetch = () => cal.current?.getApi().refetchEvents();
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  async function load(info: EventSourceFuncArg): Promise<EventInput[]> {
    const res = await fetch(`/api/admin/calendar?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`, { cache: "no-store" });
    if (res.status === 401) {
      router.push("/admin/login");
      return [];
    }
    const data = (await res.json()) as { availability: { id: string; starts_at: string; ends_at: string }[]; bookings: BookingInfo[] };
    return [
      ...data.availability.map((a) => ({
        id: a.id,
        start: a.starts_at,
        end: a.ends_at,
        title: "Vaba aeg",
        classNames: ["free-block"],
        editable: true,
        extendedProps: { kind: "free" },
      })),
      ...data.bookings.map((b) => ({
        id: b.id,
        start: b.starts_at,
        end: b.ends_at,
        title: `${b.customer_name} · ${b.service}`,
        classNames: ["booking-block"],
        editable: false,
        extendedProps: { kind: "booking", booking: b },
      })),
    ];
  }

  async function save(start: Date, end: Date, replaceId?: string) {
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: start.toISOString(), end: end.toISOString(), replaceId }),
    });
    if (!res.ok) flash("Salvestamine ebaõnnestus");
    refetch();
  }

  const onSelect = (s: DateSelectArg) => {
    s.view.calendar.unselect();
    save(s.start, s.end).then(() => flash(`Vaba aeg lisatud ${time(s.startStr)}–${time(s.endStr)}`));
  };

  const onChange = (c: EventChangeArg) => {
    if (c.event.extendedProps.kind !== "free" || !c.event.start || !c.event.end) return c.revert();
    save(c.event.start, c.event.end, c.event.id);
  };

  const onClick = async (c: EventClickArg) => {
    const p = c.event.extendedProps;
    if (p.kind === "booking") return setOpen(p.booking as BookingInfo);
    if (confirm(`Kustutan vaba aja ${time(c.event.startStr)}–${time(c.event.endStr)}?\n(Broneeringud jäävad alles.)`)) {
      await fetch(`/api/admin/availability?id=${c.event.id}`, { method: "DELETE" });
      refetch();
    }
  };

  async function copyWeek() {
    const api = cal.current?.getApi();
    if (!api) return;
    const view = api.view;
    // On the phone the view is 3 days, so always copy the whole Monday-Sunday week.
    const d = new Date(view.currentStart);
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    if (!confirm(`Kopeerin nädala ${monday.toLocaleDateString("et-EE")} vabad ajad järgmisele nädalale?`)) return;
    const res = await fetch("/api/admin/copy-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: monday.toISOString() }),
    });
    const data = res.ok ? ((await res.json()) as { copied: number }) : { copied: 0 };
    flash(`Kopeeritud ${data.copied} vaba aega järgmisele nädalale`);
    refetch();
  }

  if (isMobile === null) return null;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {isMobile ? "Hoia sõrme tühjal kohal ja lohista" : "Lohista tühjal alal"}, et lisada <b className="text-emerald-700">vaba aega</b>. Lohista
        servast pikkuse muutmiseks, puuduta kustutamiseks. <b className="text-rose">Roosad</b> on broneeringud.
      </p>
      <div className="rounded-2xl bg-white p-2 ring-1 ring-line md:p-4">
        <FullCalendar
          ref={cal}
          plugins={[timeGridPlugin, interactionPlugin]}
          locale={etLocale}
          initialView={isMobile ? "timeGrid3" : "timeGridWeek"}
          views={{ timeGrid3: { type: "timeGrid", duration: { days: 3 }, buttonText: "3 päeva" } }}
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "copy" }
              : { left: "prev,next today", center: "title", right: "copy timeGridDay,timeGrid3,timeGridWeek" }
          }
          customButtons={{ copy: { text: isMobile ? "Kopeeri ⇢" : "Kopeeri nädal järgmisse ⇢", click: copyWeek } }}
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
          longPressDelay={250}
          selectLongPressDelay={250}
          eventLongPressDelay={250}
          editable
          eventOverlap
          selectOverlap
          events={load}
          select={onSelect}
          eventChange={onChange}
          eventClick={onClick}
          eventOrder={(a, b) => ((a as EventInput).extendedProps?.kind === "booking" ? 1 : 0) - ((b as EventInput).extendedProps?.kind === "booking" ? 1 : 0)}
        />
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg md:bottom-8">{toast}</div>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40 md:items-center md:justify-center" onClick={() => setOpen(null)}>
          <div className="w-full rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-muted first-letter:uppercase">
              {date(open.starts_at)} · {time(open.starts_at)}–{time(open.ends_at)}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{open.customer_name}</h2>
            <p className="font-medium">
              {open.service} · {Number(open.price_eur)} €
            </p>
            {open.note && <p className="mt-3 rounded-xl bg-sand p-3 text-sm">📝 {open.note}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <a href={`tel:${open.phone}`} className="rounded-full bg-ink py-3 text-center font-semibold text-white">📞 Helista</a>
              <a href={`sms:${open.phone}`} className="rounded-full py-3 text-center font-semibold ring-1 ring-line">💬 SMS</a>
            </div>
            <p className="mt-3 text-center text-sm text-muted">
              {open.phone} · <a href={`mailto:${open.email}`} className="underline">{open.email}</a>
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
              className="mt-5 w-full rounded-full py-3 font-semibold text-rose ring-1 ring-rose/40"
            >
              Tühista broneering
            </button>
          </div>
        </div>
      )}
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
