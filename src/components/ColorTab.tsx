import { cleanColor } from "@/lib/colors";

/**
 * The small coloured tab on the left edge of a service card, showing the service's colour
 * (lash type) chosen in /admin → Teenused. Nothing is shown for services without a colour.
 * The parent needs `relative` (and `overflow-hidden` to clip it to the rounded corner).
 */
export function ColorTab({ color }: { color: string | null | undefined }) {
  const c = cleanColor(color);
  if (!c) return null;
  return <span aria-hidden className="pointer-events-none absolute top-3 bottom-3 left-0 w-1.5 rounded-r-full" style={{ background: c }} />;
}
