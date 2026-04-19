const ALMATY_OFFSET_MS = 5 * 3600 * 1000; // UTC+5, no DST

/**
 * Start of day in Asia/Almaty (UTC+5) expressed as a UTC instant.
 * e.g. 2026-04-20 00:00 Almaty = 2026-04-19 19:00 UTC
 */
export function startOfBusinessDay(d: Date): Date {
  const almatyMs = d.getTime() + ALMATY_OFFSET_MS;
  const almaty = new Date(almatyMs);
  almaty.setUTCHours(0, 0, 0, 0);
  return new Date(almaty.getTime() - ALMATY_OFFSET_MS);
}

/**
 * End of day in Asia/Almaty (UTC+5) — 23:59:59.999 — expressed as a UTC instant.
 * e.g. 2026-04-20 23:59:59.999 Almaty = 2026-04-20 18:59:59.999 UTC
 */
export function endOfBusinessDay(d: Date): Date {
  const start = startOfBusinessDay(d);
  return new Date(start.getTime() + 24 * 3600 * 1000 - 1);
}

/**
 * Enumerate every Almaty calendar day that overlaps the interval [from, to].
 * Returns pairs of { dayStart, dayEnd } in UTC instants, ordered ascending.
 *
 * For a 24-hour sliding window (e.g. now-24h .. now) this typically yields
 * 1 or 2 days depending on whether the window crosses midnight Almaty time.
 */
export function businessDaysInRange(
  from: Date,
  to: Date,
): Array<{ dayStart: Date; dayEnd: Date }> {
  const days: Array<{ dayStart: Date; dayEnd: Date }> = [];
  let cursor = startOfBusinessDay(from);

  while (cursor.getTime() <= to.getTime()) {
    const dayStart = cursor;
    const dayEnd = endOfBusinessDay(cursor);
    days.push({ dayStart, dayEnd });
    // Advance to next Almaty day
    cursor = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  }

  return days;
}
