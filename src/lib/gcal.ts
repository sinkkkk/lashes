import { db, getSettings } from "./db";
import { site } from "./site";

/**
 * Google Calendar sync. The owner connects her Google account once in
 * /admin/settings; after that every booking is written into her calendar,
 * so her phone notifies her through the Google Calendar app.
 */
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const redirectUri = () => `${site.url}/api/google/callback`;
const calendarId = () => encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");

export function googleAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string };
}

export async function exchangeCode(code: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error("Google did not return a refresh token");
  await db()`update settings set google_refresh_token = ${t.refresh_token} where id = 1`;
}

async function accessToken(): Promise<string | null> {
  if (!googleConfigured()) return null;
  const { google_refresh_token } = await getSettings();
  if (!google_refresh_token) return null;
  const t = await tokenRequest({ refresh_token: google_refresh_token, grant_type: "refresh_token" });
  return t.access_token;
}

export async function createCalendarEvent(e: {
  start: Date;
  end: Date;
  summary: string;
  description: string;
}): Promise<string | null> {
  const token = await accessToken();
  if (!token) return null;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId()}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      start: { dateTime: e.start.toISOString() },
      end: { dateTime: e.end.toISOString() },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
    }),
  });
  if (!res.ok) {
    console.error("Google Calendar error", res.status, await res.text());
    return null;
  }
  return ((await res.json()) as { id: string }).id;
}

export async function deleteCalendarEvent(eventId: string | null) {
  if (!eventId) return;
  const token = await accessToken();
  if (!token) return;
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId()}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 410 && res.status !== 404) console.error("Google delete error", res.status);
}
