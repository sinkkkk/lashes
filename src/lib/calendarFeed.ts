import { createHmac, timingSafeEqual } from "node:crypto";
import { site } from "./site";

/**
 * The secret part of the owner's calendar subscription link. It is worked out from
 * AUTH_SECRET, so nothing has to be stored; changing AUTH_SECRET gives a new link.
 */
export function feedToken(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update("calendar-feed").digest("hex").slice(0, 32);
}

export function isValidFeedToken(input: string): boolean {
  const a = Buffer.from(input.replace(/\.ics$/, ""));
  const b = Buffer.from(feedToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `base` is the address the admin is using right now, so the link is always correct. */
export function feedUrls(base: string = site.url) {
  const https = `${base.replace(/\/$/, "")}/api/calendar/${feedToken()}.ics`;
  return { https, webcal: https.replace(/^https?:\/\//, "webcal://") };
}
