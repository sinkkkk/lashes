/** "Add to Google Calendar" link that works in any browser (no file download needed). */
export function googleCalendarUrl(e: { title: string; start: Date; end: Date; details?: string; location?: string }) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(e.end)}`,
    details: e.details ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
