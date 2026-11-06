/** Business details. Change these in the environment variables (see .env.example). */
export const site = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Lashes by Hille Liis",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  /**
   * Full street address: private. Only used in confirmation emails, calendar entries and the
   * client's own booking page, never on public pages. (Server-only setting: ADDRESS.)
   */
  address: process.env.ADDRESS || process.env.NEXT_PUBLIC_ADDRESS || "",
  /** Public area shown on the website instead of the full address. */
  area: process.env.NEXT_PUBLIC_AREA || "Tallinn, Nõmme",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  phone: process.env.NEXT_PUBLIC_PHONE || "",
  ownerEmail: process.env.OWNER_EMAIL || "",
};
