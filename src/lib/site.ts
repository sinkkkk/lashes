/**
 * Business details, from environment variables (see .env.example), with built-in defaults.
 * Read when used (getters), because on Cloudflare the variables arrive with the first request.
 * Plain names (SITE_URL, BUSINESS_NAME …) are read at run time; the older NEXT_PUBLIC_ names still work.
 */
const env = (...names: string[]) => names.map((n) => process.env[n]).find((v) => v && v.trim()) ?? "";

export const site = {
  get name() {
    return env("BUSINESS_NAME", "NEXT_PUBLIC_BUSINESS_NAME") || "Lashes by Hille Liis";
  },
  get url() {
    return (env("SITE_URL", "NEXT_PUBLIC_SITE_URL") || "https://hilleliis.ee").replace(/\/$/, "");
  },
  /**
   * Full street address: private. Only used in confirmation emails, calendar entries and the
   * client's own booking page, never on public pages.
   */
  get address() {
    return env("ADDRESS", "NEXT_PUBLIC_ADDRESS");
  },
  /** Public area shown on the website instead of the full address. */
  get area() {
    return env("AREA", "NEXT_PUBLIC_AREA") || "Tallinn, Nõmme";
  },
  get instagram() {
    return env("INSTAGRAM_URL", "NEXT_PUBLIC_INSTAGRAM_URL");
  },
  get phone() {
    return env("PHONE", "NEXT_PUBLIC_PHONE");
  },
  get ownerEmail() {
    return env("OWNER_EMAIL");
  },
};
