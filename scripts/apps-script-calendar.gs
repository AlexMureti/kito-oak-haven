/**
 * Kito Oak Haven — external calendar ingest and collision check.
 *
 * Add this as a SECOND file inside the same Apps Script project as the
 * booking log. Apps Script shares one global scope across files, so this one
 * reads SHEET_NAME from apps-script.gs rather than redeclaring it.
 *
 * The problem: the owner's Airbnb listing is run by a team. Nights can be
 * sold there without anyone telling us. A direct booking taken on one of
 * those nights is a guest arriving at an occupied apartment, and finding out
 * at the door. This pulls her Airbnb feed in every three hours, holds both
 * channels in one sheet, and refuses to call a date free unless it is free on
 * both of them.
 *
 * Setup, once:
 *   1. Project Settings > Script Properties, add
 *        AIRBNB_ICAL_URL = the export link from the listing
 *      Airbnb: Calendar > Availability > Connect calendars > Export.
 *      It lives there and not in this file because the link grants read
 *      access to her booking dates to anyone holding it, and this file is in
 *      a public repository.
 *   2. Run installTrigger() once.
 *   3. Run syncAirbnbCalendar() to fill the sheet immediately.
 *
 * Three hours is deliberate: Airbnb regenerates its own export on a three
 * hour cycle, so polling faster reads the same bytes and buys nothing.
 *
 * What this never does: delete a row, or treat an empty or unreadable feed as
 * "every booking was cancelled". Airbnb's export fails quietly and sometimes
 * answers 200 with an error page. A parser that trusted a blank response
 * would clear the calendar and hand us the exact double booking it exists to
 * prevent.
 */

var ICAL_PROP = 'AIRBNB_ICAL_URL';
var CAL_SHEET = 'Calendar';
var AVAIL_SHEET = 'Availability';
var LOG_SHEET = 'Sync log';

/** Days of availability to render. One quarter is as far ahead as anyone books here. */
var AVAIL_DAYS = 90;

/**
 * Booking statuses that actually hold dates. An enquiry does not — otherwise
 * every person who ever tapped the WhatsApp button blocks a night they were
 * never going to take. Edit this list rather than inventing new words in the
 * Status column; anything not in it is treated as not holding.
 */
var HOLDING_STATUSES = ['confirmed', 'held', 'deposit paid', 'paid'];

var CAL_HEADERS = [
  'UID', 'Source', 'Check-in', 'Check-out', 'Nights',
  'Type', 'Status', 'First seen', 'Last seen'
];

var COLOURS = {
  free: '#ffffff',
  airbnb: '#e8e4dc',
  direct: '#d9e8dd',
  clash: '#f4c7c3'
};

// ---------------------------------------------------------------- the sync

function syncAirbnbCalendar() {
  requireBookingLogFile_();

  var url = PropertiesService.getScriptProperties().getProperty(ICAL_PROP);
  if (!url) {
    logRun_('skipped', 'No ' + ICAL_PROP + ' set. Direct bookings still hold dates.');
    return;
  }

  var body = fetchFeed_(url);
  if (body === null) return; // fetchFeed_ has already logged why

  var events = parseIcal_(body);
  var result = reconcile_(events);

  var airbnb = readAirbnbHolds_();
  var direct = readDirectHolds_();
  var clashes = findClashes_(airbnb, direct.holds);

  rebuildAvailability_(airbnb, direct.holds, clashes);
  alertOnChange_(clashes, direct.unreadable);

  logRun_('ok', [
    events.length + ' events',
    result.added + ' new',
    result.updated + ' updated',
    result.gone + ' released',
    direct.holds.length + ' direct holds',
    clashes.length + ' clash' + (clashes.length === 1 ? '' : 'es')
  ].join(', '));
}

/**
 * Returns the feed body, or null if anything about the response makes it
 * unsafe to act on. Every null path logs its reason, because the failure mode
 * that matters here is the silent one.
 */
function fetchFeed_(url) {
  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true
    });
  } catch (err) {
    logRun_('error', 'Fetch threw: ' + err);
    return null;
  }

  var code = res.getResponseCode();
  if (code !== 200) {
    logRun_('error', 'Feed returned HTTP ' + code + '. Nothing changed.');
    return null;
  }

  var body = res.getContentText();

  // Airbnb serves an HTML error page with a 200 when a link is revoked or
  // regenerated. Without this check that page parses to zero events and looks
  // exactly like an empty calendar.
  if (body.indexOf('BEGIN:VCALENDAR') === -1) {
    logRun_('error', 'Response was not a calendar — the export link is probably dead. Nothing changed.');
    return null;
  }

  return body;
}

// --------------------------------------------------------------- the parser

/**
 * Minimal iCalendar reader. Deliberately not a general one: it handles the
 * subset Airbnb emits and ignores everything else, which is a smaller thing
 * to be wrong about than a full RFC 5545 implementation nobody will maintain.
 */
function parseIcal_(text) {
  // Unfold first. RFC 5545 breaks any line over 75 octets and continues it on
  // the next line behind a space or tab. Parse before unfolding and a long
  // UID silently becomes two useless half-lines.
  var unfolded = text
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .replace(/\r[ \t]/g, '');
  var lines = unfolded.split(/\r\n|\n|\r/);

  var events = [];
  var current = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (line.indexOf('BEGIN:VEVENT') === 0) { current = {}; continue; }

    if (line.indexOf('END:VEVENT') === 0) {
      if (current && current.start) events.push(finishEvent_(current));
      current = null;
      continue;
    }

    if (!current) continue;

    var colon = line.indexOf(':');
    if (colon === -1) continue;

    var name = line.slice(0, colon).split(';')[0].toUpperCase();
    var value = line.slice(colon + 1);

    if (name === 'UID') current.uid = value.trim();
    else if (name === 'DTSTART') current.start = icalDate_(value);
    else if (name === 'DTEND') current.end = icalDate_(value);
    else if (name === 'SUMMARY') current.summary = value.trim();
  }

  return events;
}

function finishEvent_(raw) {
  // A VEVENT with no DTEND is one day long. Rare from Airbnb, cheap to survive.
  var end = raw.end || addDays_(raw.start, 1);

  // Guard against a feed handing back an end on or before the start; it would
  // produce a zero or negative night count and poison every comparison after.
  if (end <= raw.start) end = addDays_(raw.start, 1);

  return {
    uid: raw.uid || (raw.start + '_' + end),
    start: raw.start,
    end: end,
    nights: dayDiff_(end, raw.start),
    type: classify_(raw.summary || '')
  };
}

/**
 * Airbnb writes "Reserved" for a real booking and "Airbnb (Not available)"
 * for a host block. Matched loosely and case-insensitively on purpose — the
 * exact wording is Airbnb's to change, and a booking misfiled as something
 * ignorable is a double booking, so anything unrecognised is treated as held.
 */
function classify_(summary) {
  var s = summary.toLowerCase();
  if (s.indexOf('not available') !== -1 || s.indexOf('blocked') !== -1) return 'block';
  if (s.indexOf('reserved') !== -1) return 'reservation';
  return 'held';
}

/** '20260901' or '20260901T140000Z' -> '2026-09-01'. */
function icalDate_(value) {
  var compact = value.trim().replace(/[^0-9TZ]/g, '');
  if (compact.length < 8) return '';
  return compact.slice(0, 4) + '-' + compact.slice(4, 6) + '-' + compact.slice(6, 8);
}

// ------------------------------------------------------------ date handling
//
// Dates are ISO strings everywhere, never Date objects, because ISO strings
// compare correctly as text and cannot drift by a timezone. The one place a
// Date is unavoidable is day arithmetic, and that happens at UTC noon so no
// offset or daylight rule can push a result onto the wrong day.

function utcNoon_(ymd) {
  var p = String(ymd).split('-');
  return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0));
}

function dayDiff_(later, earlier) {
  return Math.round((utcNoon_(later).getTime() - utcNoon_(earlier).getTime()) / 86400000);
}

function addDays_(ymd, n) {
  var d = utcNoon_(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function todayYmd_() {
  return Utilities.formatDate(new Date(), 'Africa/Nairobi', 'yyyy-MM-dd');
}

/**
 * Whether two stays collide.
 *
 * Both ranges are half-open: check-in included, check-out excluded. That is
 * the whole reason this reads as it does. One guest leaving on the 5th and
 * another arriving on the 5th share a date but not a night, and an inclusive
 * comparison would reject a night that is genuinely for sale. Over a busy
 * quarter that is real money turned away.
 */
function overlaps_(aIn, aOut, bIn, bOut) {
  return aIn < bOut && bIn < aOut;
}

/** Whether a single night falls inside a stay. Same half-open rule. */
function covers_(range, ymd) {
  return range.start <= ymd && ymd < range.end;
}

// ----------------------------------------------------------- reconciliation

/**
 * Writes the feed into the Calendar sheet without ever removing a row. A
 * booking that leaves the feed is marked released rather than deleted, so the
 * history of what was held when survives — which is the record you want on
 * the day someone disputes a date.
 */
function reconcile_(events) {
  var sheet = calendarSheet_();
  var rows = sheet.getDataRange().getValues();
  var now = Utilities.formatDate(new Date(), 'Africa/Nairobi', 'yyyy-MM-dd HH:mm');

  var rowByUid = {};
  for (var r = 1; r < rows.length; r++) {
    if (rows[r][0]) rowByUid[String(rows[r][0])] = r + 1;
  }

  var added = 0, updated = 0;
  var seen = {};

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    seen[ev.uid] = true;

    if (rowByUid[ev.uid]) {
      var row = rowByUid[ev.uid];
      sheet.getRange(row, 3, 1, 5).setValues([[ev.start, ev.end, ev.nights, ev.type, 'held']]);
      sheet.getRange(row, 9).setValue(now);
      updated++;
    } else {
      sheet.appendRow([ev.uid, 'airbnb', ev.start, ev.end, ev.nights, ev.type, 'held', now, now]);
      added++;
    }
  }

  // The guard that matters. An empty parse is far more often a broken feed
  // than a genuinely empty calendar, and acting on it would release every
  // night the owner has sold.
  if (events.length === 0) {
    logRun_('warning',
      'Feed parsed to zero events. Nothing released — treated as a fetch failure, not an empty calendar.');
    return { added: added, updated: updated, gone: 0 };
  }

  var gone = 0;
  for (var uid in rowByUid) {
    if (seen[uid]) continue;
    var target = rowByUid[uid];
    if (String(sheet.getRange(target, 7).getValue()) === 'held') {
      sheet.getRange(target, 7).setValue('released');
      sheet.getRange(target, 9).setValue(now);
      gone++;
    }
  }

  return { added: added, updated: updated, gone: gone };
}

function readAirbnbHolds_() {
  var rows = calendarSheet_().getDataRange().getValues();
  var out = [];
  var today = todayYmd_();

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][6]) !== 'held') continue;
    var end = String(rows[r][3]);
    if (end <= today) continue; // already over, not worth carrying forward
    out.push({
      start: String(rows[r][2]),
      end: end,
      label: 'Airbnb',
      ref: String(rows[r][5])
    });
  }
  return out;
}

/**
 * Direct bookings that hold dates, read out of the booking log. Rows whose
 * status holds but whose dates cannot be read come back separately rather
 * than being skipped quietly: a confirmed booking with an unreadable check-in
 * is invisible to the collision check, which is precisely the row you cannot
 * afford to drop on the floor.
 */
function readDirectHolds_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return { holds: [], unreadable: [] };

  var rows = sheet.getDataRange().getValues();
  var holds = [], unreadable = [];
  var today = todayYmd_();

  for (var r = 1; r < rows.length; r++) {
    var status = String(rows[r][11] || '').toLowerCase().trim();
    if (HOLDING_STATUSES.indexOf(status) === -1) continue;

    var ref = String(rows[r][0] || 'row ' + (r + 1));
    var start = normaliseDate_(rows[r][8]);
    var end = normaliseDate_(rows[r][9]);

    if (!start || !end || end <= start) {
      unreadable.push(ref + ' (status "' + status + '", dates in row ' + (r + 1) + ' unreadable)');
      continue;
    }
    if (end <= today) continue;

    holds.push({ start: start, end: end, label: 'Direct', ref: ref });
  }

  return { holds: holds, unreadable: unreadable };
}

/**
 * Check-in and check-out are typed by hand, so they arrive either as a date
 * Sheets already parsed or as text somebody typed. Both are accepted; anything
 * else returns empty and gets surfaced rather than guessed at.
 */
function normaliseDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }

  var s = String(value || '').trim();
  if (!s) return '';

  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return iso[1] + '-' + pad2_(iso[2]) + '-' + pad2_(iso[3]);

  // Kenya writes the day first. Assuming otherwise would shift a booking by
  // months with nothing on screen looking wrong.
  var dmy = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (dmy) return dmy[3] + '-' + pad2_(dmy[2]) + '-' + pad2_(dmy[1]);

  return '';
}

function pad2_(n) {
  return ('0' + n).slice(-2);
}

// --------------------------------------------------------------- the answer

function findClashes_(airbnb, direct) {
  var out = [];
  for (var i = 0; i < airbnb.length; i++) {
    for (var j = 0; j < direct.length; j++) {
      if (overlaps_(airbnb[i].start, airbnb[i].end, direct[j].start, direct[j].end)) {
        out.push({
          airbnb: airbnb[i].start + ' to ' + airbnb[i].end,
          direct: direct[j].ref + ', ' + direct[j].start + ' to ' + direct[j].end
        });
      }
    }
  }
  return out;
}

/**
 * The question the whole file exists to answer: can we sell these nights?
 * Returns an object rather than a boolean so the reason is never lost.
 */
function checkAvailability(checkIn, checkOut) {
  var start = normaliseDate_(checkIn);
  var end = normaliseDate_(checkOut);

  if (!start || !end) return { ok: false, reason: 'Dates unreadable. Use YYYY-MM-DD.' };
  if (end <= start) return { ok: false, reason: 'Check-out must be after check-in.' };

  var blockers = [];
  var all = readAirbnbHolds_().concat(readDirectHolds_().holds);

  for (var i = 0; i < all.length; i++) {
    if (overlaps_(start, end, all[i].start, all[i].end)) {
      blockers.push(all[i].label + ' ' + all[i].start + ' to ' + all[i].end);
    }
  }

  if (blockers.length === 0) {
    return { ok: true, reason: 'Free on both calendars.', nights: dayDiff_(end, start) };
  }
  return { ok: false, reason: 'Taken: ' + blockers.join('; '), blockers: blockers };
}

/**
 * Spreadsheet version, so availability can be checked without opening the
 * editor:  =KITO_FREE("2026-09-10", "2026-09-14")
 *
 * Custom functions cannot reach the network, so this reads what the sync
 * already wrote. If the sync has not run, it answers from stale data — the
 * Sync log sheet holds the time of the last good run.
 */
function KITO_FREE(checkIn, checkOut) {
  var r = checkAvailability(checkIn, checkOut);
  return r.ok ? 'FREE — ' + r.nights + ' nights' : r.reason;
}

// ---------------------------------------------------------------- the view

/**
 * A rolling quarter, one row per night, colour coded. This is the artefact
 * worth showing someone: a ledger proves rows were written, a calendar proves
 * the dates do not collide.
 */
function rebuildAvailability_(airbnb, direct, clashes) {
  var sheet = availabilitySheet_();
  var start = todayYmd_();

  var values = [], colours = [];

  for (var i = 0; i < AVAIL_DAYS; i++) {
    var day = addDays_(start, i);
    var onAirbnb = [], onDirect = [];

    for (var a = 0; a < airbnb.length; a++) if (covers_(airbnb[a], day)) onAirbnb.push(airbnb[a]);
    for (var d = 0; d < direct.length; d++) if (covers_(direct[d], day)) onDirect.push(direct[d]);

    var status, colour, held;

    if (onAirbnb.length && onDirect.length) {
      status = 'CLASH';
      colour = COLOURS.clash;
      held = onDirect[0].ref + ' vs Airbnb';
    } else if (onAirbnb.length) {
      status = 'Airbnb';
      colour = COLOURS.airbnb;
      held = onAirbnb[0].ref || 'held';
    } else if (onDirect.length) {
      status = 'Direct';
      colour = COLOURS.direct;
      held = onDirect[0].ref;
    } else {
      status = 'Free';
      colour = COLOURS.free;
      held = '';
    }

    values.push([day, Utilities.formatDate(utcNoon_(day), 'UTC', 'EEE'), status, held]);
    colours.push([colour, colour, colour, colour]);
  }

  sheet.getRange(2, 1, AVAIL_DAYS, 4).setValues(values).setBackgrounds(colours);

  var note = clashes.length
    ? clashes.length + ' clash' + (clashes.length === 1 ? '' : 'es') + ' — see the red rows'
    : 'No clashes';
  sheet.getRange(1, 6).setValue(note + '. Rebuilt ' +
    Utilities.formatDate(new Date(), 'Africa/Nairobi', 'd MMM HH:mm'));
}

// --------------------------------------------------------------- the alert

/**
 * Emails only when the picture changes. An identical alert every three hours
 * is one people filter, and then the first real one is filtered too.
 */
function alertOnChange_(clashes, unreadable) {
  var props = PropertiesService.getScriptProperties();
  var signature = JSON.stringify([clashes, unreadable]);
  if (props.getProperty('LAST_ALERT') === signature) return;
  props.setProperty('LAST_ALERT', signature);

  if (!clashes.length && !unreadable.length) return;

  var lines = [];

  if (clashes.length) {
    lines.push('DOUBLE BOOKING — these dates are sold on both calendars:');
    for (var i = 0; i < clashes.length; i++) {
      lines.push('  Airbnb ' + clashes[i].airbnb + '  vs  ' + clashes[i].direct);
    }
    lines.push('');
  }

  if (unreadable.length) {
    lines.push('These confirmed bookings have dates the calendar cannot read, so they');
    lines.push('are holding nothing and will not be protected from a clash:');
    for (var u = 0; u < unreadable.length; u++) lines.push('  ' + unreadable[u]);
    lines.push('');
    lines.push('Fix the Check-in / Check-out cells to YYYY-MM-DD.');
  }

  lines.push('');
  lines.push(SpreadsheetApp.getActiveSpreadsheet().getUrl());

  try {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      'Kito calendar: ' + (clashes.length ? clashes.length + ' clash' : 'unreadable dates'),
      lines.join('\n')
    );
  } catch (err) {
    logRun_('warning', 'Clash found but the alert email failed: ' + err);
  }
}

// ----------------------------------------------------------------- plumbing

function calendarSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CAL_SHEET);
  if (!sheet) sheet = ss.insertSheet(CAL_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CAL_HEADERS);
    sheet.getRange(1, 1, 1, CAL_HEADERS.length).setFontWeight('bold').setBackground('#f2efe9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 260);
  }
  return sheet;
}

function availabilitySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AVAIL_SHEET);
  if (!sheet) sheet = ss.insertSheet(AVAIL_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Day', 'Status', 'Held by', '', '']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f2efe9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 220);
    sheet.setColumnWidth(6, 340);
  }
  return sheet;
}

/**
 * Every run leaves a line, including the ones that did nothing. A sync that
 * fails silently for three weeks is the only way this system hurts anyone,
 * and this sheet is how that gets noticed.
 */
function logRun_(level, message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET);
    sheet.appendRow(['When (EAT)', 'Level', 'Detail']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f2efe9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(3, 620);
  }

  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Africa/Nairobi', 'yyyy-MM-dd HH:mm'),
    level,
    message
  ]);

  // Keep the last 200 runs. Unbounded logging turns a sheet nobody reads into
  // a sheet nobody can open.
  var extra = sheet.getLastRow() - 201;
  if (extra > 0) sheet.deleteRows(2, extra);
}

function requireBookingLogFile_() {
  if (typeof SHEET_NAME === 'undefined') {
    throw new Error(
      'apps-script.gs is missing from this project. Add it as a second file — ' +
      'this one reads the booking log that file creates.'
    );
  }
}

function installTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'syncAirbnbCalendar') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }
  ScriptApp.newTrigger('syncAirbnbCalendar').timeBased().everyHours(3).create();
  logRun_('ok', 'Trigger installed — syncing every 3 hours.');
}

// -------------------------------------------------------------------- tests
//
// Run these before the feed URL exists. They prove the parser and the
// off-by-one without touching the network or the owner's calendar.

function testParse() {
  // A real-shaped feed: an all-day reservation, a host block, and a UID
  // folded across two lines the way RFC 5545 requires past 75 octets.
  var sample = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'DTEND;VALUE=DATE:20260910',
    'DTSTART;VALUE=DATE:20260906',
    'UID:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    ' ef@airbnb.com',
    'SUMMARY:Reserved',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTEND;VALUE=DATE:20260918',
    'DTSTART;VALUE=DATE:20260915',
    'UID:blocked-1@airbnb.com',
    'SUMMARY:Airbnb (Not available)',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  var events = parseIcal_(sample);

  assert_(events.length === 2, 'expected 2 events, got ' + events.length);
  assert_(events[0].start === '2026-09-06', 'start was ' + events[0].start);
  assert_(events[0].end === '2026-09-10', 'end was ' + events[0].end);
  assert_(events[0].nights === 4, 'nights was ' + events[0].nights);
  assert_(events[0].type === 'reservation', 'type was ' + events[0].type);
  assert_(events[0].uid === '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef@airbnb.com',
    'unfolding mangled the UID: ' + events[0].uid);
  assert_(events[1].type === 'block', 'the host block was classified ' + events[1].type);

  Logger.log('testParse passed — ' + events.length + ' events, first holds ' +
    events[0].nights + ' nights from ' + events[0].start);
}

function testOverlap() {
  // The one that costs money when it is wrong: a guest checking out on the
  // 10th and another checking in on the 10th share a date, not a night.
  assert_(!overlaps_('2026-09-06', '2026-09-10', '2026-09-10', '2026-09-12'),
    'checkout day treated as occupied — this rejects sellable nights');

  assert_(!overlaps_('2026-09-10', '2026-09-12', '2026-09-06', '2026-09-10'),
    'check-in on a checkout day was wrongly blocked');

  assert_(overlaps_('2026-09-06', '2026-09-10', '2026-09-09', '2026-09-12'),
    'a real overlap was missed');

  assert_(overlaps_('2026-09-06', '2026-09-10', '2026-09-07', '2026-09-08'),
    'a stay fully inside another was missed');

  assert_(overlaps_('2026-09-07', '2026-09-08', '2026-09-06', '2026-09-10'),
    'an enclosing stay was missed');

  assert_(!overlaps_('2026-09-01', '2026-09-03', '2026-09-20', '2026-09-25'),
    'unrelated dates were called a clash');

  Logger.log('testOverlap passed — checkout day stays sellable, real overlaps caught');
}

function testDates() {
  assert_(addDays_('2026-02-28', 1) === '2026-03-01', 'month boundary: ' + addDays_('2026-02-28', 1));
  assert_(addDays_('2026-12-31', 1) === '2027-01-01', 'year boundary: ' + addDays_('2026-12-31', 1));
  assert_(dayDiff_('2026-09-10', '2026-09-06') === 4, 'dayDiff was ' + dayDiff_('2026-09-10', '2026-09-06'));
  assert_(normaliseDate_('15/09/2026') === '2026-09-15', 'day-first parse: ' + normaliseDate_('15/09/2026'));
  assert_(normaliseDate_('2026-9-5') === '2026-09-05', 'loose ISO parse: ' + normaliseDate_('2026-9-5'));
  assert_(normaliseDate_('next tuesday') === '', 'garbage should not parse');
  Logger.log('testDates passed');
}

function testAll() {
  testParse();
  testOverlap();
  testDates();
  Logger.log('All calendar tests passed.');
}

function assert_(condition, message) {
  if (!condition) throw new Error('FAILED: ' + message);
}
