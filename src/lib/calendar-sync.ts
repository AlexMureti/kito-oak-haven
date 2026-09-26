// The calendar this site shares with Airbnb.
//
// Two channels sell one apartment: the owner's Airbnb listing, run by her
// team, and this site, where every stay is confirmed by hand on WhatsApp.
// Neither can see the other by default, and the failure that matters is a
// guest arriving at an occupied flat and finding out at the door.
//
// So the two are joined both ways:
//
//   Airbnb -> site   /api/availability reads her export feed and the direct
//                    bookings, and the date picker shows every taken night.
//   site -> Airbnb   /direct-bookings.ics publishes the direct bookings as a
//                    feed her Airbnb imports, so a night sold here cannot be
//                    sold there too.
//
// This was an Apps Script in the booking sheet, kept for its reasoning at
// scripts/superseded/apps-script-Calendar.js. Apps Script needs an
// interactive grant before it may fetch anything, and that grant never
// appeared (commit 7be40c2), so it runs here instead, beside the chat, with
// both links in Vercel's environment.
//
// Three rules hold throughout.
//
// Only dates leave. Airbnb's export can carry reservation details in each
// event's description. Nothing but DTSTART, DTEND and STATUS is read, so
// nothing else can be passed on.
//
// A failure is never an empty calendar. Read as empty, an unreadable feed
// would release every taken night at once. Here it becomes "not checked",
// and the site stops promising rather than starting to lie.
//
// This module stays on the server. It is imported only by route handlers;
// the browser sees nothing but the JSON they return.

import type { AvailabilityStatus, Ymd } from "./availability";

/** Nights from `start` up to, not including, `end` — the checkout morning. */
export type Stay = { start: Ymd; end: Ymd };

export type SourceState =
  | "ok"
  | "not-configured"
  | "unreachable"
  | "not-a-calendar"
  | "bad-data";

export type Source = { state: SourceState; stays: Stay[] };

export type Availability = {
  /** live: both calendars read. partial: one of them. unknown: neither. */
  status: AvailabilityStatus;
  checkedAt: string;
  holds: Stay[];
  /** Per calendar, so a failed setup can be diagnosed with one curl. */
  sources: { airbnb: SourceState; direct: SourceState };
};

/** process.env, or a stand-in for it. Reads AIRBNB_ICAL_URL and DIRECT_HOLDS_CSV_URL. */
type Env = Record<string, string | undefined>;
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Long enough for a slow answer, short enough to finish inside Vercel's function limit. */
const TIMEOUT_MS = 6000;

/** A year of one apartment's bookings is a few kilobytes. A body this size is something else. */
const MAX_CHARS = 1_000_000;

// ------------------------------------------------------------------ dates

export function isRealYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12));
  // 2026-02-31 passes the pattern and then rolls into March; this is what catches it.
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function addDays(ymd: Ymd, n: number): Ymd {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
}

/**
 * Nairobi is UTC+3 all year, with no daylight saving. The browser's copy of
 * this is todayInNairobi() in availability.ts; the tests hold the two together.
 */
export function nairobiToday(now: Date): Ymd {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

/** '20261012', '20261012T140000', or '20261012T220000Z' read as the Nairobi date. */
function icalDate(value: string): Ymd | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const ymd = `${m[1]}-${m[2]}-${m[3]}`;
  if (!isRealYmd(ymd)) return null;
  if (m[4] !== undefined && (+m[4] > 23 || +m[5] > 59 || +m[6] > 60)) return null;
  if (!m[7]) return ymd;
  return nairobiToday(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])));
}

// ------------------------------------------------------------- reading iCal

function isCalendar(text: string): boolean {
  // Both ends, not just the start. Airbnb answers a dead link with an HTML
  // page and a 200, and a download cut short still begins correctly — read
  // as-is, it would quietly drop every booking after the cut.
  const t = text.trim();
  return t.startsWith("BEGIN:VCALENDAR") && t.endsWith("END:VCALENDAR");
}

/**
 * The stays in a feed, in feed order, or null when the feed cannot be trusted.
 *
 * Deliberately small: it reads the subset Airbnb emits, which is a smaller
 * thing to be wrong about than RFC 5545. Anything it cannot read makes the
 * whole feed untrusted. Skipping one unreadable event would release its
 * nights, and a release is the one mistake here that costs a guest.
 */
export function parseIcal(text: string): Stay[] | null {
  if (!isCalendar(text)) return null;

  // Unfold first. A long line continues on the next behind a space or tab;
  // split before joining them and a continuation reads as a property of its own.
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);

  const stays: Stay[] = [];
  let ev: { start?: Ymd | null; end?: Ymd | null; cancelled?: boolean } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    const upper = line.toUpperCase();

    if (upper === "BEGIN:VEVENT") {
      if (ev) return null; // an event inside an event: not a feed to act on
      ev = {};
      continue;
    }

    if (upper === "END:VEVENT") {
      if (!ev || !ev.start || ev.end === null) return null;
      if (!ev.cancelled) {
        const end = ev.end && ev.end > ev.start ? ev.end : addDays(ev.start, 1);
        stays.push({ start: ev.start, end });
      }
      ev = null;
      continue;
    }

    if (!ev) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);

    if (name === "DTSTART") ev.start = icalDate(value);
    else if (name === "DTEND") ev.end = icalDate(value);
    else if (name === "STATUS") ev.cancelled = value.trim().toUpperCase() === "CANCELLED";
    // A repeat rule or a duration stretches an event past its DTSTART-DTEND
    // pair, and this reader does not expand them. Read as one night, a
    // three-night DURATION would release two, so the feed is refused instead.
    else if (name === "RRULE" || name === "RDATE" || name === "DURATION") return null;
  }

  return ev ? null : stays;
}

// -------------------------------------------------------- holding nights

/** Sorted, with overlapping stays and back-to-back stays joined into one. */
export function mergeStays(stays: Stay[]): Stay[] {
  const sorted = [...stays].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const out: Stay[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) {
      if (s.end > last.end) last.end = s.end;
    } else {
      out.push({ start: s.start, end: s.end });
    }
  }
  return out;
}

/** Stays with a night still to come. One that checks out today has none. */
export function upcoming(stays: Stay[], today: Ymd): Stay[] {
  return stays.filter((s) => s.end > today);
}

// ------------------------------------------------ reading the direct tab

/**
 * The direct bookings, from a published tab of the booking sheet that holds
 * only check-in and check-out, or null when the tab cannot be trusted.
 *
 * The first line must be the tab's own header, check_in,check_out. A blank
 * body is not "no bookings": it is the wrong tab published, a cleared tab or a
 * sign-in page, and read as empty it would release every direct night on both
 * channels at once. Only the header with nothing under it means nothing is
 * booked.
 *
 * Strict for the same reason as parseIcal: a row it skipped would be a night
 * it released. Dates must be ISO. 03/10/2026 is 3 October to a person in
 * Nairobi and 10 March to a spreadsheet left on its default locale, so a date
 * written that way is refused rather than guessed.
 */
export function parseDirectCsv(text: string): Stay[] | null {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // a byte-order mark
  const rows = body.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  const cells = (row: string) =>
    row.split(",").map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim());

  const head = rows.length ? cells(rows[0]).map((c) => c.toLowerCase()) : [];
  if (head[0] !== "check_in" || head[1] !== "check_out") return null;

  const stays: Stay[] = [];
  for (const row of rows.slice(1)) {
    const [checkIn = "", checkOut = ""] = cells(row);
    if (!checkIn && !checkOut) continue; // a blank row inside the published range
    if (!isRealYmd(checkIn) || !isRealYmd(checkOut) || checkOut <= checkIn) return null;
    stays.push({ start: checkIn, end: checkOut });
  }
  return stays;
}

// ------------------------------------------- writing the feed Airbnb reads

const ymdCompact = (ymd: Ymd) => ymd.replace(/-/g, "");

/**
 * The direct bookings as an iCalendar feed, for the owner's Airbnb to import.
 *
 * All-day dates, CRLF line endings, and a UID taken from the dates, so the
 * same stay keeps the same UID from one read to the next and Airbnb updates
 * it rather than stacking a copy.
 */
export function toIcs(stays: Stay[], now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kito Oak Haven//Direct bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Kito Oak Haven direct bookings",
    // RFC 5545 wants at least one component in a calendar. With no bookings
    // this is the one, so an empty feed is still a valid one.
    "BEGIN:VTIMEZONE",
    "TZID:Africa/Nairobi",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:EAT",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const s of mergeStays(stays)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ymdCompact(s.start)}-${ymdCompact(s.end)}@kito-oak-haven`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymdCompact(s.start)}`,
      `DTEND;VALUE=DATE:${ymdCompact(s.end)}`,
      "SUMMARY:Booked direct",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/**
 * What /direct-bookings.ics answers, decided here so the tests can reach it.
 *
 * Never an empty calendar in place of an unread one. Empty is a definite
 * statement that every direct booking is gone, and Airbnb would act on it by
 * putting those nights back on sale. An error is not a statement that
 * anything was cancelled, so an unread tab gets a 503.
 */
export function directFeed(
  direct: Source,
  now: Date
): { status: number; headers: Record<string, string>; body: string } {
  if (direct.state !== "ok") {
    return {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "900",
        "X-Robots-Tag": "noindex",
      },
      body: `Direct bookings could not be read (${direct.state}).\n`,
    };
  }
  return {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // A minute at Vercel's edge, and nothing downstream. Airbnb reads this
      // about eight times a day, so a longer cache saves nothing, and this is
      // the one place a stale copy can cost a night: a Refresh pressed in her
      // Airbnb would fetch the old one.
      "CDN-Cache-Control": "max-age=60",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
    body: toIcs(direct.stays, now),
  };
}

// --------------------------------------------------------- fetching

async function fetchText(url: string, fetchImpl: Fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "text/calendar, text/csv;q=0.9, */*;q=0.1" },
    });
    if (res.status !== 200) return null;
    const text = await res.text();
    return text.length > MAX_CHARS ? null : text;
  } catch {
    return null;
  }
}

async function readAirbnb(env: Env, fetchImpl: Fetch): Promise<Source> {
  const url = env.AIRBNB_ICAL_URL?.trim();
  if (!url) return { state: "not-configured", stays: [] };
  const body = await fetchText(url, fetchImpl);
  if (body === null) return { state: "unreachable", stays: [] };
  const stays = parseIcal(body);
  return stays ? { state: "ok", stays } : { state: "not-a-calendar", stays: [] };
}

/** The direct bookings still to come. Also what /direct-bookings.ics publishes. */
export async function readDirect(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
  now: Date = new Date()
): Promise<Source> {
  const url = env.DIRECT_HOLDS_CSV_URL?.trim();
  if (!url) return { state: "not-configured", stays: [] };
  const body = await fetchText(url, fetchImpl);
  if (body === null) return { state: "unreachable", stays: [] };
  const stays = parseDirectCsv(body);
  return stays
    ? { state: "ok", stays: upcoming(mergeStays(stays), nairobiToday(now)) }
    : { state: "bad-data", stays: [] };
}

/** Both calendars as one answer. Only a calendar that was actually read contributes nights. */
export function combine(airbnb: Source, direct: Source, now: Date): Availability {
  const read = [airbnb, direct].filter((s) => s.state === "ok");
  return {
    status: read.length === 2 ? "live" : read.length === 1 ? "partial" : "unknown",
    checkedAt: now.toISOString(),
    holds: upcoming(mergeStays(read.flatMap((s) => s.stays)), nairobiToday(now)),
    sources: { airbnb: airbnb.state, direct: direct.state },
  };
}

export async function readAvailability(
  env: Env = process.env,
  fetchImpl: Fetch = fetch,
  now: Date = new Date()
): Promise<Availability> {
  const [airbnb, direct] = await Promise.all([
    readAirbnb(env, fetchImpl),
    readDirect(env, fetchImpl, now),
  ]);
  return combine(airbnb, direct, now);
}
