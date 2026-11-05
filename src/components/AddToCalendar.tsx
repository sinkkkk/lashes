"use client";

import { useSyncExternalStore } from "react";
import { googleCalendarUrl } from "@/lib/calendarLinks";

const isAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * "Add to calendar": the .ics file opens Apple Calendar on iPhone/Mac (and Outlook on PC);
 * Android phones get Google Calendar first. Both options are always shown.
 */
export function AddToCalendar(props: {
  token: string;
  title: string;
  start: string;
  end: string;
  details: string;
  location: string;
  label: string;
  googleLabel: string;
  otherLabel: string;
}) {
  const android = useSyncExternalStore(
    () => () => {},
    isAndroid,
    () => false,
  );
  const ics = `/api/bookings/${props.token}/calendar.ics`;
  const google = googleCalendarUrl({
    title: props.title,
    start: new Date(props.start),
    end: new Date(props.end),
    details: props.details,
    location: props.location,
  });
  const primary = android ? { href: google, external: true } : { href: ics, external: false };
  const secondary = android ? { href: ics, text: props.otherLabel, external: false } : { href: google, text: props.googleLabel, external: true };

  return (
    <div className="mt-6">
      <a
        href={primary.href}
        {...(primary.external ? { target: "_blank", rel: "noopener" } : {})}
        className="block rounded-full bg-ink py-4 text-center text-lg font-semibold text-white"
      >
        📅 {props.label}
      </a>
      <a
        href={secondary.href}
        {...(secondary.external ? { target: "_blank", rel: "noopener" } : {})}
        className="mt-3 block text-center text-sm font-semibold text-muted underline underline-offset-2"
      >
        {secondary.text}
      </a>
    </div>
  );
}
