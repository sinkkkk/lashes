import { describe, expect, it } from "vitest";
import { fold, makeCalendar, makeIcs } from "./ics";

const ev = (n: number, extra = {}) => ({
  uid: `b${n}@test`,
  start: new Date(`2026-12-0${n}T08:00:00Z`),
  end: new Date(`2026-12-0${n}T11:00:00Z`),
  title: `💅 Mari ${n} – Volüümripsmed`,
  ...extra,
});

describe("makeCalendar (owner's feed)", () => {
  const ics = makeCalendar([ev(1, { description: "Tel: +372 5123\nMärkus: esimene kord\; allergia, liim" }), ev(2)], {
    name: "Lashes by Hille Liis – broneeringud",
    feed: true,
  });

  it("contains every booking with UTC times", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("UID:b1@test");
    expect(ics).toContain("DTSTART:20261201T080000Z");
    expect(ics).toContain("DTEND:20261202T110000Z");
  });

  it("has the subscription headers Apple Calendar reads", () => {
    expect(ics).toContain("X-WR-CALNAME:Lashes by Hille Liis – broneeringud");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT5M");
    expect(ics).toContain("X-PUBLISHED-TTL:PT5M");
  });

  it("escapes commas, semicolons and new lines", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("DESCRIPTION:Tel: +372 5123\\nMärkus: esimene kord\\; allergia\\, liim");
  });

  it("uses CRLF line endings, balanced blocks, and lines of at most 75 bytes", () => {
    const lines = ics.split("\r\n");
    expect(ics).not.toMatch(/[^\r]\n/);
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    for (const block of ["VCALENDAR", "VEVENT"]) {
      expect(ics.match(new RegExp(`BEGIN:${block}`, "g"))?.length).toBe(ics.match(new RegExp(`END:${block}`, "g"))?.length);
    }
  });
});

describe("fold", () => {
  it("never splits a multi-byte character", () => {
    const line = "SUMMARY:" + "õ".repeat(60) + "💅".repeat(10);
    const folded = fold(line);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    expect(folded).not.toContain("�");
  });
});

describe("makeIcs (customer's file)", () => {
  it("is one event with a 2-hour reminder", () => {
    const ics = makeIcs({ ...ev(1), description: "x", location: "Tallinn" });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("TRIGGER:-PT120M");
    expect(ics).toContain("LOCATION:Tallinn");
  });
});
