// Dates and availability.
//
// Every date here is an ISO string, never a Date object, because ISO strings
// compare correctly as text and cannot drift by a timezone. Day arithmetic is
// the one exception and it happens at UTC noon, where no offset or daylight
// rule can push a result onto the wrong day.
//
// This is the same logic the standalone booking demo runs and that
// scripts/test-booking-page.js covers. Keep the two in step: if a rule changes
// here it changes there, and the test suite is what catches the drift.

export type Ymd = string;

export type Hold = {
  start: Ymd;
  /** Exclusive. The checkout date is not a held night. */
  end: Ymd;
  label: string;
};

export type Selection = { checkIn: Ymd | null; checkOut: Ymd | null };

export type Verdict =
  | { state: "idle" }
  | { state: "invalid" }
  | { state: "past" }
  | { state: "free"; nights: number }
  | { state: "clash"; nights: number; clashNights: Ymd[]; alternative: Hold | null };

function utcNoon(ymd: Ymd): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function toYmd(date: Date): Ymd {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}`;
}

export function addDays(ymd: Ymd, n: number): Ymd {
  const d = utcNoon(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return toYmd(d);
}

/** Clamps to the end of a short month, so 31 January plus one month is 28 February. */
export function addMonths(ymd: Ymd, n: number): Ymd {
  const d = utcNoon(ymd);
  const wanted = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const lastOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(wanted, lastOfMonth));
  return toYmd(d);
}

export function nightsBetween(a: Ymd, b: Ymd): number {
  return Math.round((utcNoon(b).getTime() - utcNoon(a).getTime()) / 86400000);
}

/**
 * Whether two stays collide.
 *
 * Both ranges are half-open: check-in counts, check-out does not. One guest
 * leaving on the 10th and another arriving on the 10th share a date but not a
 * night, and an inclusive comparison would refuse a night that is genuinely
 * for sale — every single time a stay ends.
 */
export function overlaps(aIn: Ymd, aOut: Ymd, bIn: Ymd, bOut: Ymd): boolean {
  return aIn < bOut && bIn < aOut;
}

export function covers(range: { start: Ymd; end: Ymd }, ymd: Ymd): boolean {
  return range.start <= ymd && ymd < range.end;
}

export function heldOn(ymd: Ymd, holds: Hold[]): Hold | null {
  return holds.find((h) => covers(h, ymd)) ?? null;
}

function hitsAny(start: Ymd, end: Ymd, holds: Hold[]): Hold | null {
  return holds.find((h) => overlaps(start, end, h.start, h.end)) ?? null;
}

/** Nairobi is UTC+3 with no daylight saving, so today there is UTC shifted three hours. */
export function todayInNairobi(): Ymd {
  return toYmd(new Date(Date.now() + 3 * 3600000));
}

/** The cells of one month, Monday first, with leading nulls for the blanks. */
export function monthCells(year: number, month: number): (Ymd | null)[] {
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (Ymd | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= count; d++) cells.push(toYmd(new Date(Date.UTC(year, month, d))));
  return cells;
}

/**
 * What tapping a night does to the current selection.
 *
 * A third tap extends the stay rather than starting over. Restarting silently
 * wipes the highlight with nothing on screen to explain it, and the control
 * then reads as broken. Growing the stay is what someone means when they keep
 * tapping further along; tapping behind the arrival starts a new one.
 */
export function nextSelection(sel: Selection, day: Ymd): Selection {
  if (!sel.checkIn || day < sel.checkIn) return { checkIn: day, checkOut: null };
  return { checkIn: sel.checkIn, checkOut: addDays(day, 1) };
}

/**
 * The first window of the requested length that is free, at or after the
 * requested arrival and never behind today.
 */
export function nearestWindow(
  from: Ymd,
  nights: number,
  today: Ymd,
  holds: Hold[]
): Hold | null {
  const start = from < today ? today : from;
  for (let i = 0; i < 365; i++) {
    const s = addDays(start, i);
    const e = addDays(s, nights);
    if (!hitsAny(s, e, holds)) return { start: s, end: e, label: "Free" };
  }
  return null;
}

/**
 * The whole decision, with no DOM in it.
 *
 * `today` is passed in rather than read from the clock so the same call can be
 * tested, and so a page left open overnight cannot quietly start selling
 * yesterday.
 */
export function assess(
  checkIn: Ymd | null,
  checkOut: Ymd | null,
  today: Ymd,
  holds: Hold[]
): Verdict {
  if (!checkIn || !checkOut) return { state: "idle" };
  if (checkOut <= checkIn) return { state: "invalid" };
  if (checkIn < today) return { state: "past" };

  const nights = nightsBetween(checkIn, checkOut);
  if (!hitsAny(checkIn, checkOut, holds)) return { state: "free", nights };

  const clashNights: Ymd[] = [];
  for (let d = 0; d < nights; d++) {
    const day = addDays(checkIn, d);
    if (heldOn(day, holds)) clashNights.push(day);
  }

  return {
    state: "clash",
    nights,
    clashNights,
    alternative: nearestWindow(checkIn, nights, today, holds),
  };
}

const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(month: number): string {
  return MONTH[month];
}

/** "12 Sep" — short enough for a WhatsApp line, unambiguous about the month. */
export function shortDate(ymd: Ymd): string {
  const d = utcNoon(ymd);
  return `${d.getUTCDate()} ${MONTH[d.getUTCMonth()].slice(0, 3)}`;
}

/** "12 September 2026" — for anything a guest reads slowly. */
export function longDate(ymd: Ymd): string {
  const d = utcNoon(ymd);
  return `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
