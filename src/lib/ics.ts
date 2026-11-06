/** Calendar (.ics) files, as used by Apple Calendar, Google Calendar and Outlook. */

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  alarmMinutesBefore?: number;
};

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

/** Lines longer than 75 bytes must be split, continuing with a space (RFC 5545). */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + n > limit) {
      parts.push(cur);
      cur = "";
      size = 0;
    }
    cur += ch;
    size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

function eventLines(e: IcsEvent): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
  ];
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  if (e.alarmMinutesBefore != null) {
    lines.push("BEGIN:VALARM", `TRIGGER:-PT${e.alarmMinutesBefore}M`, "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM");
  }
  lines.push("END:VEVENT");
  return lines;
}

/** A whole calendar. With `feed`, calendar apps that subscribe to it refresh every 5 minutes. */
export function makeCalendar(events: IcsEvent[], opts: { name?: string; feed?: boolean } = {}) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lashes by Hille Liis//Booking//ET", "CALSCALE:GREGORIAN", `METHOD:PUBLISH`];
  if (opts.name) lines.push(`X-WR-CALNAME:${esc(opts.name)}`);
  if (opts.feed) lines.push("X-WR-TIMEZONE:Europe/Tallinn", "REFRESH-INTERVAL;VALUE=DURATION:PT5M", "X-PUBLISHED-TTL:PT5M");
  for (const e of events) lines.push(...eventLines(e));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A single appointment that phones open with "Add to calendar". */
export function makeIcs(e: { uid: string; start: Date; end: Date; title: string; description: string; location: string }) {
  return makeCalendar([{ ...e, alarmMinutesBefore: 120 }]);
}
