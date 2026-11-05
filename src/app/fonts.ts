import { Cormorant_Garamond, Inter } from "next/font/google";

export const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
export const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-display-serif",
});
