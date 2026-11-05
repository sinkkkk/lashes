/** Business details. Change these in the environment variables (see .env.example). */
export const site = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Liisu Lashes",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  address: process.env.NEXT_PUBLIC_ADDRESS || "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  phone: process.env.NEXT_PUBLIC_PHONE || "",
  ownerEmail: process.env.OWNER_EMAIL || "",
};
