// Tests the two-way calendar between the site and Airbnb, and the decisions
// the date picker makes with what comes back.
//
//   node scripts/test-calendar-sync.mjs
//
// Every guard here exists because its absence would sell a night twice or
// promise one that was never checked. So each is fed the input it exists to
// refuse, not just the input it exists to accept.

let failed = 0;
let passed = 0;

function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new Error("async check used with check()");
    passed++;
    console.log("  PASS  " + name);
  } catch (err) {
    failed++;
    console.log("  FAIL  " + name);
    console.log("        " + err.message);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  PASS  " + name);
  } catch (err) {
    failed++;
    console.log("  FAIL  " + name);
    console.log("        " + err.message);
  }
}

function eq(got, want, what) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) throw new Error((what || "value") + ": got " + g + ", wanted " + w);
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

const CRLF = "\r\n";
const cal = (...lines) => lines.join(CRLF) + CRLF;

// Shaped like Airbnb's export: a reservation carries a description with
// details that must never leave the server.
const AIRBNB = cal(
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "CALSCALE:GREGORIAN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261015",
  "DTSTART;VALUE=DATE:20261012",
  "UID:1418fb94e984-aaaa@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMSECRET1\\nPhone Number (Last 4 Digits): 4821",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261103",
  "DTSTART;VALUE=DATE:20261101",
  "UID:7f5a3c2d-bbbb@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20260920",
  "DTSTART;VALUE=DATE:20260918",
  "UID:past-cccc@airbnb.com",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "END:VCALENDAR"
);

(async () => {
  let sync, av;
  try {
    sync = await import("../src/lib/calendar-sync.ts");
    av = await import("../src/lib/availability.ts");
  } catch (err) {
    console.log("\n  FAIL  could not load the calendar modules");
    console.log("        " + err.message);
    console.log("\n0 passed, 1 failed");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  console.log("\nreading Airbnb's feed");

  check("reads every stay, as dates only", () => {
    const stays = sync.parseIcal(AIRBNB);
    eq(stays, [
      { start: "2026-10-12", end: "2026-10-15" },
      { start: "2026-11-01", end: "2026-11-03" },
      { start: "2026-09-18", end: "2026-09-20" },
    ], "stays");
  });

  check("nothing from a reservation's description survives the parse", () => {
    const out = JSON.stringify(sync.parseIcal(AIRBNB));
    for (const leak of ["HMSECRET1", "4821", "Reservation", "airbnb.com", "Reserved"]) {
      ok(!out.includes(leak), "leaked " + leak);
    }
  });

  check("unfolds before parsing, so a folded description cannot forge a date", () => {
    // The continuation line begins with a space. Parsed before unfolding,
    // it reads as a DTEND of 2099 and holds the flat for seventy years.
    const folded = cal(
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20261012",
      "DTEND;VALUE=DATE:20261014",
      "DESCRIPTION:a long note that wraps",
      " DTEND;VALUE=DATE:20991231",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "END:VCALENDAR"
    );
    eq(sync.parseIcal(folded), [{ start: "2026-10-12", end: "2026-10-14" }]);
  });

  check("a UTC timestamp is read as the Nairobi date", () => {
    // 22:00 UTC on the 1st is 01:00 on the 2nd in Nairobi.
    const f = cal(
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "BEGIN:VEVENT", "DTSTART:20261001T220000Z", "DTEND:20261003T220000Z", "END:VEVENT",
      "END:VCALENDAR"
    );
    eq(sync.parseIcal(f), [{ start: "2026-10-02", end: "2026-10-04" }]);
  });

  check("a missing DTEND is one night", () => {
    const f = cal("BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261012", "END:VEVENT", "END:VCALENDAR");
    eq(sync.parseIcal(f), [{ start: "2026-10-12", end: "2026-10-13" }]);
  });

  check("an end on or before its start is one night, not zero or negative", () => {
    const f = cal(
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261012", "DTEND;VALUE=DATE:20261012", "END:VEVENT",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261020", "DTEND;VALUE=DATE:20261018", "END:VEVENT",
      "END:VCALENDAR"
    );
    eq(sync.parseIcal(f), [
      { start: "2026-10-12", end: "2026-10-13" },
      { start: "2026-10-20", end: "2026-10-21" },
    ]);
  });

  check("a cancelled event holds nothing", () => {
    const f = cal(
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261012", "DTEND;VALUE=DATE:20261014", "STATUS:CANCELLED", "END:VEVENT",
      "END:VCALENDAR"
    );
    eq(sync.parseIcal(f), []);
  });

  check("an empty but valid calendar is an empty list, not a failure", () => {
    // A brand-new listing has no bookings. "Nothing is booked" is an answer.
    eq(sync.parseIcal(cal("BEGIN:VCALENDAR", "VERSION:2.0", "END:VCALENDAR")), []);
  });

  check("an HTML page served with a 200 is not a calendar", () => {
    eq(sync.parseIcal("<!DOCTYPE html><html><body>Page not found</body></html>"), null);
  });

  check("a feed cut off mid-download is not a calendar", () => {
    // Parsed as-is it would drop every booking after the cut, and the site
    // would call those nights free.
    const midEvent = AIRBNB.slice(0, AIRBNB.indexOf("UID:7f5a3c2d"));
    eq(sync.parseIcal(midEvent), null, "cut inside an event");
    // Cut cleanly between two events, every event read is whole. Only the
    // missing END:VCALENDAR shows anything is gone, so this is the case that
    // proves that check, not the open-event guard behind it.
    const first = AIRBNB.indexOf("END:VEVENT\r\n") + "END:VEVENT\r\n".length;
    eq(sync.parseIcal(AIRBNB.slice(0, first)), null, "cut between events");
  });

  check("a repeat rule or a duration makes the feed unsafe, not one night long", () => {
    const withRule = (prop) => cal(
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261012", prop, "END:VEVENT",
      "END:VCALENDAR"
    );
    eq(sync.parseIcal(withRule("DURATION:P3D")), null, "DURATION");
    eq(sync.parseIcal(withRule("RRULE:FREQ=WEEKLY;COUNT=4")), null, "RRULE");
    eq(sync.parseIcal(withRule("RDATE;VALUE=DATE:20261019")), null, "RDATE");
  });

  check("one unreadable date makes the whole feed unsafe, not partly read", () => {
    const f = cal(
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261012", "DTEND;VALUE=DATE:20261014", "END:VEVENT",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20260231", "DTEND;VALUE=DATE:20260302", "END:VEVENT",
      "END:VCALENDAR"
    );
    eq(sync.parseIcal(f), null);
  });

  // -------------------------------------------------------------------------
  console.log("\nholding nights");

  check("overlapping and touching stays merge, apart stays do not", () => {
    eq(sync.mergeStays([
      { start: "2026-10-20", end: "2026-10-22" },
      { start: "2026-10-01", end: "2026-10-05" },
      { start: "2026-10-04", end: "2026-10-08" }, // overlaps the first
      { start: "2026-10-08", end: "2026-10-10" }, // touches: one leaves as one arrives
      { start: "2026-10-12", end: "2026-10-13" },
    ]), [
      { start: "2026-10-01", end: "2026-10-10" },
      { start: "2026-10-12", end: "2026-10-13" },
      { start: "2026-10-20", end: "2026-10-22" },
    ]);
  });

  check("a stay that has ended is dropped; one checking out today is too", () => {
    eq(sync.upcoming([
      { start: "2026-09-18", end: "2026-09-20" },
      { start: "2026-09-24", end: "2026-09-26" }, // checkout today: no night left
      { start: "2026-09-25", end: "2026-09-28" }, // tonight is still held
    ], "2026-09-26"), [{ start: "2026-09-25", end: "2026-09-28" }]);
  });

  // -------------------------------------------------------------------------
  console.log("\nreading the direct-bookings tab");

  check("reads rows under the header", () => {
    const csv = "check_in,check_out\r\n2026-10-12,2026-10-15\r\n\"2026-11-01\",\"2026-11-04\"\r\n";
    eq(sync.parseDirectCsv(csv), [
      { start: "2026-10-12", end: "2026-10-15" },
      { start: "2026-11-01", end: "2026-11-04" },
    ]);
  });

  check("the header with no bookings under it is an empty list", () => {
    eq(sync.parseDirectCsv("check_in,check_out\r\n"), []);
    eq(sync.parseDirectCsv("check_in,check_out\r\n,\r\n,\r\n"), [], "blank rows under the header");
  });

  check("a blank tab is refused, never read as 'no bookings'", () => {
    // The wrong tab published, a cleared tab, a formula that errored to
    // nothing: read as empty, each would free every direct night on both
    // channels at once. Found by the critic on 26 Sep, before it shipped.
    eq(sync.parseDirectCsv(""), null, "empty body");
    eq(sync.parseDirectCsv("\r\n\r\n"), null, "blank lines");
  });

  check("rows without the header are refused", () => {
    eq(sync.parseDirectCsv("2026-10-12,2026-10-15\n"), null);
  });

  check("a half-filled row is refused, not skipped", () => {
    // Skipped, it would release the night it half-describes.
    eq(sync.parseDirectCsv("check_in,check_out\n2026-10-12,\n"), null, "no check-out");
    eq(sync.parseDirectCsv("check_in,check_out\n,2026-10-15\n"), null, "no check-in");
    eq(sync.parseDirectCsv("check_in,check_out\nMISSING,2026-10-15\n"), null, "the sheet's MISSING marker");
  });

  check("a locale-formatted date is refused, not guessed", () => {
    // 03/10/2026 is 3 October in Nairobi and 10 March in the sheet's default.
    eq(sync.parseDirectCsv("check_in,check_out\n03/10/2026,05/10/2026\n"), null);
  });

  check("an impossible date is refused", () => {
    eq(sync.parseDirectCsv("check_in,check_out\n2026-02-31,2026-03-02\n"), null);
  });

  check("a check-out on or before check-in is refused", () => {
    eq(sync.parseDirectCsv("check_in,check_out\n2026-10-12,2026-10-12\n"), null);
  });

  check("a formula error in the sheet is refused", () => {
    eq(sync.parseDirectCsv("check_in,check_out\n#REF!,#REF!\n"), null);
  });

  check("an HTML page is refused", () => {
    eq(sync.parseDirectCsv("<!DOCTYPE html><html><body>Sign in</body></html>"), null);
  });

  // -------------------------------------------------------------------------
  console.log("\nwriting the feed Airbnb imports");

  const NOW = new Date("2026-09-26T15:04:05Z");

  check("round-trips: what is written reads back as the same nights", () => {
    const stays = [
      { start: "2026-10-12", end: "2026-10-15" },
      { start: "2026-11-01", end: "2026-11-04" },
    ];
    eq(sync.parseIcal(sync.toIcs(stays, NOW)), stays);
  });

  check("uses CRLF, never a line over 75 octets, and all-day dates", () => {
    const ics = sync.toIcs([{ start: "2026-10-12", end: "2026-10-15" }], NOW);
    ok(ics.startsWith("BEGIN:VCALENDAR\r\n"), "does not open with BEGIN:VCALENDAR + CRLF");
    ok(ics.endsWith("END:VCALENDAR\r\n"), "does not close with END:VCALENDAR + CRLF");
    ok(!/[^\r]\n/.test(ics), "has a bare LF");
    for (const line of ics.split("\r\n")) {
      ok(Buffer.byteLength(line, "utf8") <= 75, "line over 75 octets: " + line);
    }
    ok(ics.includes("DTSTART;VALUE=DATE:20261012\r\n"), "no all-day DTSTART");
    ok(ics.includes("DTEND;VALUE=DATE:20261015\r\n"), "no all-day DTEND");
    ok(ics.includes("VERSION:2.0\r\n") && ics.includes("PRODID:"), "missing VERSION or PRODID");
    ok(ics.includes("DTSTAMP:20260926T150405Z\r\n"), "missing DTSTAMP");
  });

  check("an event's UID is stable across runs", () => {
    const a = sync.toIcs([{ start: "2026-10-12", end: "2026-10-15" }], NOW);
    const b = sync.toIcs([{ start: "2026-10-12", end: "2026-10-15" }], new Date("2026-09-27T00:00:00Z"));
    const uid = (s) => s.split("\r\n").find((l) => l.startsWith("UID:"));
    eq(uid(a), uid(b), "UID");
  });

  check("with no bookings it is still a valid calendar with a component in it", () => {
    const ics = sync.toIcs([], NOW);
    eq(sync.parseIcal(ics), []);
    ok(ics.includes("BEGIN:VTIMEZONE"), "an empty VCALENDAR has no component, which RFC 5545 forbids");
  });

  check("the feed answers a read tab with a calendar", () => {
    const f = sync.directFeed({ state: "ok", stays: [{ start: "2026-10-12", end: "2026-10-15" }] }, NOW);
    eq(f.status, 200, "status");
    ok(f.headers["Content-Type"].startsWith("text/calendar"), "content type " + f.headers["Content-Type"]);
    eq(sync.parseIcal(f.body), [{ start: "2026-10-12", end: "2026-10-15" }], "body");
  });

  check("the feed answers an unread tab with a 503, never an empty calendar", () => {
    // An empty calendar would tell Airbnb every direct booking was cancelled.
    for (const state of ["not-configured", "unreachable", "bad-data"]) {
      const f = sync.directFeed({ state, stays: [] }, NOW);
      eq(f.status, 503, state + " status");
      ok(!f.body.includes("VCALENDAR"), state + " sent a calendar");
      eq(f.headers["Cache-Control"], "no-store", state + " cache");
    }
  });

  // -------------------------------------------------------------------------
  console.log("\nputting the two calendars together");

  const OK = (stays) => ({ state: "ok", stays });
  const TODAY_NOW = new Date("2026-09-26T09:00:00Z");

  check("both calendars read: live, merged, upcoming only", () => {
    const a = sync.combine(
      OK([{ start: "2026-10-12", end: "2026-10-15" }, { start: "2026-09-18", end: "2026-09-20" }]),
      OK([{ start: "2026-10-15", end: "2026-10-17" }]),
      TODAY_NOW
    );
    eq(a.status, "live", "status");
    eq(a.holds, [{ start: "2026-10-12", end: "2026-10-17" }], "holds");
    eq(a.sources, { airbnb: "ok", direct: "ok" }, "sources");
    eq(a.checkedAt, TODAY_NOW.toISOString(), "checkedAt");
  });

  check("one calendar read: partial, and its nights still shown", () => {
    const a = sync.combine(
      OK([{ start: "2026-10-12", end: "2026-10-15" }]),
      { state: "not-configured", stays: [] },
      TODAY_NOW
    );
    eq(a.status, "partial", "status");
    eq(a.holds, [{ start: "2026-10-12", end: "2026-10-15" }], "holds");
  });

  check("neither read: unknown, and no nights claimed either way", () => {
    const a = sync.combine({ state: "unreachable", stays: [] }, { state: "bad-data", stays: [] }, TODAY_NOW);
    eq(a.status, "unknown", "status");
    eq(a.holds, [], "holds");
  });

  // A fetch that answers from a table, and records what was asked for.
  function fakeFetch(table) {
    const calls = [];
    const f = async (url) => {
      calls.push(url);
      const r = table[url];
      if (r instanceof Error) throw r;
      if (!r) return new Response("not found", { status: 404 });
      return new Response(r.body, { status: r.status ?? 200 });
    };
    f.calls = calls;
    return f;
  }

  const ENV = {
    AIRBNB_ICAL_URL: "https://www.airbnb.test/calendar/ical/123.ics?t=SECRETTOKEN42",
    DIRECT_HOLDS_CSV_URL: "https://docs.google.test/spreadsheets/d/e/PUBSECRET/pub?output=csv",
  };

  await checkAsync("nothing configured: unknown, and nothing is fetched", async () => {
    const f = fakeFetch({});
    const a = await sync.readAvailability({}, f, TODAY_NOW);
    eq(a.status, "unknown", "status");
    eq(a.sources, { airbnb: "not-configured", direct: "not-configured" }, "sources");
    eq(f.calls.length, 0, "fetch calls");
  });

  await checkAsync("both answer: live", async () => {
    const f = fakeFetch({
      [ENV.AIRBNB_ICAL_URL]: { body: AIRBNB },
      [ENV.DIRECT_HOLDS_CSV_URL]: { body: "check_in,check_out\n2026-12-20,2026-12-27\n" },
    });
    const a = await sync.readAvailability(ENV, f, TODAY_NOW);
    eq(a.status, "live", "status");
    eq(a.holds, [
      { start: "2026-10-12", end: "2026-10-15" },
      { start: "2026-11-01", end: "2026-11-03" },
      { start: "2026-12-20", end: "2026-12-27" },
    ], "holds");
  });

  await checkAsync("the response carries no link, token or guest detail", async () => {
    const f = fakeFetch({
      [ENV.AIRBNB_ICAL_URL]: { body: AIRBNB },
      [ENV.DIRECT_HOLDS_CSV_URL]: { body: "check_in,check_out\n" },
    });
    const out = JSON.stringify(await sync.readAvailability(ENV, f, TODAY_NOW));
    for (const leak of ["SECRETTOKEN42", "PUBSECRET", "airbnb.test", "HMSECRET1", "4821"]) {
      ok(!out.includes(leak), "leaked " + leak);
    }
  });

  await checkAsync("Airbnb's error page with a 200 is not-a-calendar, and the site stops promising", async () => {
    const f = fakeFetch({
      [ENV.AIRBNB_ICAL_URL]: { body: "<html><body>Oops</body></html>" },
      [ENV.DIRECT_HOLDS_CSV_URL]: { body: "check_in,check_out\n" },
    });
    const a = await sync.readAvailability(ENV, f, TODAY_NOW);
    eq(a.sources.airbnb, "not-a-calendar", "airbnb source");
    eq(a.status, "partial", "status");
  });

  await checkAsync("a network failure or a 404 is unreachable", async () => {
    const f = fakeFetch({ [ENV.AIRBNB_ICAL_URL]: new Error("ECONNRESET") });
    const a = await sync.readAvailability(ENV, f, TODAY_NOW);
    eq(a.sources, { airbnb: "unreachable", direct: "unreachable" }, "sources");
    eq(a.status, "unknown", "status");
  });

  await checkAsync("a bad direct tab is bad-data, never an empty calendar", async () => {
    const f = fakeFetch({
      [ENV.AIRBNB_ICAL_URL]: { body: AIRBNB },
      [ENV.DIRECT_HOLDS_CSV_URL]: { body: "check_in,check_out\n#REF!,#REF!\n" },
    });
    const a = await sync.readAvailability(ENV, f, TODAY_NOW);
    eq(a.sources.direct, "bad-data", "direct source");
    eq(a.status, "partial", "status");
  });

  await checkAsync("a blank tab that answers 200 is bad-data, and the site stops promising", async () => {
    const f = fakeFetch({
      [ENV.AIRBNB_ICAL_URL]: { body: AIRBNB },
      [ENV.DIRECT_HOLDS_CSV_URL]: { body: "" },
    });
    const a = await sync.readAvailability(ENV, f, TODAY_NOW);
    eq(a.sources.direct, "bad-data", "direct source");
    eq(a.status, "partial", "status");
  });

  await checkAsync("the direct feed refuses to publish from a bad tab", async () => {
    // An empty calendar here would tell Airbnb every direct booking was
    // cancelled, and it would put those nights back on sale.
    const f = fakeFetch({ [ENV.DIRECT_HOLDS_CSV_URL]: { body: "<html>Sign in</html>" } });
    const d = await sync.readDirect(ENV, f, TODAY_NOW);
    eq(d.state, "bad-data", "state");
  });

  // -------------------------------------------------------------------------
  console.log("\nwhat a tap does, now that the calendar is real");

  const HOLDS = [{ start: "2026-10-12", end: "2026-10-15", label: "Taken" }];
  const EMPTY = { checkIn: null, checkOut: null };

  check("tapping a taken night does not make it the arrival", () => {
    const r = av.tapNight(EMPTY, "2026-10-13", HOLDS, "2026-12-31");
    eq(r.sel, EMPTY, "selection");
    eq(r.notice, { day: "2026-10-13", nextFree: "2026-10-15" }, "notice");
  });

  check("tapping a free night behaves exactly as before", () => {
    const r = av.tapNight(EMPTY, "2026-10-05", HOLDS, "2026-12-31");
    eq(r.sel, av.nextSelection(EMPTY, "2026-10-05"), "selection");
    eq(r.notice, null, "notice");
  });

  check("stretching a stay across a taken night is allowed, and becomes a clash with a way out", () => {
    const start = { checkIn: "2026-10-10", checkOut: null };
    const r = av.tapNight(start, "2026-10-13", HOLDS, "2026-12-31");
    eq(r.sel, { checkIn: "2026-10-10", checkOut: "2026-10-14" }, "selection");
    const v = av.assess(r.sel.checkIn, r.sel.checkOut, "2026-09-26", HOLDS);
    eq(v.state, "clash", "verdict");
    eq(v.alternative && [v.alternative.start, v.alternative.end], ["2026-10-15", "2026-10-19"], "way out");
  });

  check("a taken night behind the arrival does not restart the stay on it", () => {
    const start = { checkIn: "2026-10-20", checkOut: null };
    const r = av.tapNight(start, "2026-10-13", HOLDS, "2026-12-31");
    eq(r.sel, start, "selection");
    eq(r.notice && r.notice.day, "2026-10-13", "notice");
  });

  check("the next free night stops at the horizon", () => {
    const wall = [{ start: "2026-10-01", end: "2027-01-01", label: "Taken" }];
    eq(av.nextFreeNight("2026-10-05", wall, "2026-12-31"), null);
    eq(av.nextFreeNight("2026-10-05", HOLDS, "2026-12-31"), "2026-10-05");
  });

  check("freshness reads like a person would say it", () => {
    const at = "2026-09-26T15:00:00.000Z";
    eq(av.freshness(at, Date.parse("2026-09-26T15:00:20Z")), "just now");
    eq(av.freshness(at, Date.parse("2026-09-26T15:04:00Z")), "4 min ago");
    eq(av.freshness(at, Date.parse("2026-09-26T17:10:00Z")), "2 h ago");
  });

  check("a check older than six hours is no longer trusted to promise", () => {
    const at = "2026-09-26T08:00:00.000Z";
    eq(av.trustedStatus("live", at, Date.parse("2026-09-26T13:59:00Z")), "live");
    eq(av.trustedStatus("live", at, Date.parse("2026-09-26T14:01:00Z")), "partial");
    eq(av.trustedStatus("live", "not a date", Date.now()), "partial");
    eq(av.trustedStatus("unknown", at, Date.parse("2026-09-26T09:00:00Z")), "unknown");
  });

  check("server and browser agree on what today is in Nairobi", () => {
    for (const iso of ["2026-09-26T20:59:59Z", "2026-09-26T21:00:00Z", "2026-12-31T21:30:00Z"]) {
      const t = Date.parse(iso);
      eq(sync.nairobiToday(new Date(t)), av.todayInNairobi(t), iso);
    }
  });

  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
