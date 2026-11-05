/**
 * Works out which start times a customer can pick for a service.
 *
 * Rules:
 * - The owner paints "free time" blocks. Blocks that touch or overlap are
 *   joined, so 10-12 + 12-15 counts as one 10-15 block.
 * - A start time fits if the whole service (its length) fits inside one block,
 *   and the service plus its cleanup buffer does not overlap any booking
 *   (whose own buffer is already included in its busy range).
 * - Start times step every `stepMin` minutes from the start of the block.
 * - Nothing earlier than `notBefore` (minimum notice) or later than `notAfter`.
 */
export type Interval = { start: Date; end: Date };

export type SlotInput = {
  availability: Interval[];
  busy: Interval[];
  durationMin: number;
  bufferMin: number;
  stepMin: number;
  notBefore: Date;
  notAfter: Date;
};

const MIN = 60_000;

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list
    .filter((i) => i.end > i.start)
    .map((i) => ({ start: new Date(i.start), end: new Date(i.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Interval[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (last && cur.start.getTime() <= last.end.getTime()) {
      if (cur.end > last.end) last.end = cur.end;
    } else {
      out.push(cur);
    }
  }
  return out;
}

export function computeSlots(input: SlotInput): Date[] {
  const { durationMin, bufferMin, notBefore, notAfter } = input;
  const step = Math.max(5, input.stepMin) * MIN;
  const dur = durationMin * MIN;
  const busyLen = (durationMin + bufferMin) * MIN;
  const busy = input.busy
    .map((b) => [b.start.getTime(), b.end.getTime()] as const)
    .sort((a, b) => a[0] - b[0]);
  const lo = notBefore.getTime();
  const hi = notAfter.getTime();

  const result: Date[] = [];
  for (const block of mergeIntervals(input.availability)) {
    const bs = block.start.getTime();
    const be = block.end.getTime();
    let t = bs;
    if (t < lo) t = bs + Math.ceil((lo - bs) / step) * step;
    for (; t + dur <= be && t <= hi; t += step) {
      const end = t + busyLen;
      const clash = busy.some(([s, e]) => s < end && e > t);
      if (!clash) result.push(new Date(t));
    }
  }
  return result;
}
