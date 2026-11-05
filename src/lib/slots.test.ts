import { describe, expect, it } from "vitest";
import { computeSlots, mergeIntervals } from "./slots";

// All times written in UTC. Tallinn is UTC+2 in winter, UTC+3 in summer.
const d = (s: string) => new Date(s);
const iv = (a: string, b: string) => ({ start: d(a), end: d(b) });
const hhmm = (list: Date[]) => list.map((x) => x.toISOString().slice(11, 16));

const base = {
  busy: [],
  bufferMin: 0,
  stepMin: 30,
  notBefore: d("2026-01-01T00:00:00Z"),
  notAfter: d("2027-01-01T00:00:00Z"),
};

describe("computeSlots", () => {
  const day = [iv("2026-12-01T08:00:00Z", "2026-12-01T12:00:00Z")]; // 4h block

  it("a 1h service fits more start times than a 3h service", () => {
    const one = computeSlots({ ...base, availability: day, durationMin: 60 });
    const three = computeSlots({ ...base, availability: day, durationMin: 180 });
    expect(hhmm(one)).toEqual(["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(hhmm(three)).toEqual(["08:00", "08:30", "09:00"]);
  });

  it("a service longer than the block has no times", () => {
    expect(computeSlots({ ...base, availability: day, durationMin: 300 })).toEqual([]);
  });

  it("existing bookings (with their buffer) block times", () => {
    const busy = [iv("2026-12-01T09:00:00Z", "2026-12-01T10:15:00Z")];
    const out = computeSlots({ ...base, availability: day, busy, durationMin: 60 });
    // 08:00 ends 09:00 exactly -> ok; 08:30 would overlap; after 10:15 next step 10:30
    expect(hhmm(out)).toEqual(["08:00", "10:30", "11:00"]);
  });

  it("the new booking's own buffer must not run into the next booking", () => {
    const busy = [iv("2026-12-01T10:00:00Z", "2026-12-01T11:00:00Z")];
    const out = computeSlots({ ...base, availability: day, busy, durationMin: 60, bufferMin: 15 });
    // 09:00 + 60min + 15min buffer = 10:15 > 10:00 -> not allowed
    expect(hhmm(out)).toEqual(["08:00", "08:30", "11:00"]);
  });

  it("the buffer may run past the end of the free time", () => {
    const out = computeSlots({ ...base, availability: day, durationMin: 60, bufferMin: 15 });
    expect(hhmm(out).at(-1)).toBe("11:00");
  });

  it("touching blocks are joined, so a long service fits across them", () => {
    const split = [
      iv("2026-12-01T08:00:00Z", "2026-12-01T10:00:00Z"),
      iv("2026-12-01T10:00:00Z", "2026-12-01T12:00:00Z"),
    ];
    const out = computeSlots({ ...base, availability: split, durationMin: 180 });
    expect(hhmm(out)).toEqual(["08:00", "08:30", "09:00"]);
  });

  it("respects minimum notice and rounds to the step from the block start", () => {
    const out = computeSlots({
      ...base,
      availability: day,
      durationMin: 60,
      notBefore: d("2026-12-01T09:10:00Z"),
    });
    expect(hhmm(out)[0]).toBe("09:30");
  });

  it("respects the booking horizon", () => {
    const out = computeSlots({
      ...base,
      availability: day,
      durationMin: 60,
      notAfter: d("2026-12-01T09:00:00Z"),
    });
    expect(hhmm(out)).toEqual(["08:00", "08:30", "09:00"]);
  });

  it("works across the daylight-saving switch (Tallinn, 29 Mar 2026)", () => {
    // 01:00 UTC is when clocks jump from 03:00 to 04:00 local.
    const block = [iv("2026-03-29T00:00:00Z", "2026-03-29T03:00:00Z")];
    const out = computeSlots({ ...base, availability: block, durationMin: 120, stepMin: 60 });
    expect(out.map((x) => x.toISOString())).toEqual([
      "2026-03-29T00:00:00.000Z",
      "2026-03-29T01:00:00.000Z",
    ]);
  });
});

describe("mergeIntervals", () => {
  it("joins overlapping and touching blocks and keeps gaps", () => {
    const out = mergeIntervals([
      iv("2026-12-01T12:00:00Z", "2026-12-01T13:00:00Z"),
      iv("2026-12-01T08:00:00Z", "2026-12-01T10:00:00Z"),
      iv("2026-12-01T09:00:00Z", "2026-12-01T11:00:00Z"),
      iv("2026-12-01T11:00:00Z", "2026-12-01T11:30:00Z"),
    ]);
    expect(out.map((i) => [i.start.toISOString().slice(11, 16), i.end.toISOString().slice(11, 16)])).toEqual([
      ["08:00", "11:30"],
      ["12:00", "13:00"],
    ]);
  });
});

import { fromZonedTime, toZonedTime } from "date-fns-tz";
describe("copy week keeps wall-clock time over DST (Tallinn)", () => {
  it("10:00 on 18 Oct 2026 (summer) -> 10:00 on 25 Oct (winter)", () => {
    const d = fromZonedTime("2026-10-18T10:00:00", "Europe/Tallinn");
    const wall = toZonedTime(d, "Europe/Tallinn");
    wall.setDate(wall.getDate() + 7);
    expect(fromZonedTime(wall, "Europe/Tallinn").toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });
});
