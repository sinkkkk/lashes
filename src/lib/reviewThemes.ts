/**
 * Looks for review images exported from admin → Reviews (for Instagram / TikTok).
 * Only used for those images, never shown on the website.
 */
export const REVIEW_FORMATS = {
  // scale: size of logo, stars and name; textScale: size of the review text
  story: { w: 1080, h: 1920, label: "Story", scale: 1.1, textScale: 1.3 },
  post: { w: 1080, h: 1350, label: "Post", scale: 0.9, textScale: 1.02 },
  square: { w: 1080, h: 1080, label: "Ruut", scale: 0.78, textScale: 0.86 },
  // A thin 4:1 "sticker" to stack several reviews in one story
  strip: { w: 1080, h: 270, label: "Riba", scale: 0.5, textScale: 0.5 },
} as const;
export type ReviewFormat = keyof typeof REVIEW_FORMATS;

export type ReviewTheme = {
  id: string;
  name: string;
  /** Background: two colours of a soft top-to-bottom gradient */
  from: string;
  to: string;
  text: string;
  muted: string;
  star: string;
  /** The big decorative quote mark */
  quote: string;
};

export const REVIEW_THEMES: ReviewTheme[] = [
  { id: "roos", name: "Roos", from: "#fff1f6", to: "#ffc9dd", text: "#3a2430", muted: "#8a5b6e", star: "#e0558f", quote: "#f39cbf" },
  { id: "sampus", name: "Šampus", from: "#fbf5ee", to: "#ecd9c4", text: "#3b2a20", muted: "#8a6d57", star: "#c4924f", quote: "#dcbb92" },
  { id: "lilla", name: "Lilla", from: "#f6f0ff", to: "#d8c6fb", text: "#2e2142", muted: "#6d5a8e", star: "#8f6ad6", quote: "#b9a0ec" },
  { id: "oo", name: "Öö", from: "#2b1b24", to: "#120b10", text: "#fff3f8", muted: "#d6aebf", star: "#ff9cc4", quote: "#7a3f5a" },
  { id: "vask", name: "Vask", from: "#4a2a1b", to: "#1c110b", text: "#fbeee4", muted: "#e0b99c", star: "#f2b787", quote: "#8a5233" },
  { id: "valge", name: "Valge", from: "#ffffff", to: "#f4f1ef", text: "#24170f", muted: "#7d716c", star: "#24170f", quote: "#e4dcd7" },
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
/** Mix two #rrggbb colours: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** "Bränd": a soft theme made from the site's accent colour. */
export function brandTheme(accent: string): ReviewTheme {
  return {
    id: "brand",
    name: "Bränd",
    from: mix(accent, "#ffffff", 0.9),
    to: mix(accent, "#ffffff", 0.62),
    text: mix(accent, "#1a1010", 0.82),
    muted: mix(accent, "#3a2a2a", 0.55),
    star: mix(accent, "#000000", 0.12),
    quote: mix(accent, "#ffffff", 0.35),
  };
}

export function reviewTheme(id: string | null | undefined, accent: string): ReviewTheme {
  if (id === "brand") return brandTheme(accent);
  return REVIEW_THEMES.find((t) => t.id === id) ?? REVIEW_THEMES[0];
}

export function reviewFormat(f: string | null | undefined): ReviewFormat {
  return f && f in REVIEW_FORMATS ? (f as ReviewFormat) : "story";
}

/** Text size for the review: short reviews big, long ones smaller, so every image looks full. */
export function quoteFontSize(text: string, format: ReviewFormat) {
  const n = text.trim().length;
  if (format === "strip") return n <= 50 ? 46 : n <= 100 ? 40 : n <= 160 ? 34 : 30; // at most 3 lines
  const base = n <= 60 ? 84 : n <= 120 ? 70 : n <= 200 ? 58 : n <= 320 ? 48 : n <= 480 ? 40 : 34;
  return Math.round(base * REVIEW_FORMATS[format].textScale);
}
