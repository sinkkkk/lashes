/** Colour helpers that work both on the server and in the browser. */

/** A "#rrggbb" colour, or null for anything else (null = use the accent colour). */
export function cleanColor(x: unknown): string | null {
  return typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x.trim()) ? x.trim().toLowerCase() : null;
}

/** White or dark text, whichever reads better on the given background colour. */
export function readableText(bg: string): "#ffffff" | "#24170f" {
  const hex = cleanColor(bg);
  if (!hex) return "#ffffff";
  const ch = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
  // Compare contrast with white vs. with the dark text colour (#24170f, luminance ≈ 0.012).
  const withWhite = 1.05 / (lum + 0.05);
  const withDark = (lum + 0.05) / (0.012 + 0.05);
  return withWhite >= withDark ? "#ffffff" : "#24170f";
}

/** Ready-made colours for colour-coding services (lash types). */
export const SERVICE_COLOR_PRESETS = [
  { name: "Roos", hex: "#e0648e" },
  { name: "Lilla", hex: "#9b72cf" },
  { name: "Münt", hex: "#3fa58a" },
  { name: "Virsik", hex: "#f08a5d" },
  { name: "Taevas", hex: "#4f9fdc" },
  { name: "Kuld", hex: "#d6a32b" },
  { name: "Korall", hex: "#e8564f" },
  { name: "Ploom", hex: "#8e4b8a" },
];
