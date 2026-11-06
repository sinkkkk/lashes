/**
 * Splits a service name like "Klassikalised ripsmepikendused - Paigaldus" into a small label
 * ("Klassikalised ripsmepikendused") and the title ("Paigaldus"), so similar services read as one
 * family on the booking page. Names without " - " (or " – ") are returned whole as the title.
 */
export function splitServiceName(name: string): { group: string | null; title: string } {
  const m = name.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  return m ? { group: m[1].trim(), title: m[2].trim() } : { group: null, title: name };
}
