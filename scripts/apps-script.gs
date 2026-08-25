/**
 * ══════════════════════════════════════════════════════════════════
 * KITO OAK HAVEN — booking log
 * ══════════════════════════════════════════════════════════════════
 *
 * Receives one row per booking enquiry from the website and appends it
 * to a Google Sheet. That sheet is the ledger the commission is argued
 * from, and it is the only thing the owner and Alex both need to look at.
 *
 * WHY A SHEET AND NOT A DATABASE
 * One apartment, a handful of bookings a month, two people who need to
 * read it. A spreadsheet is the correct engineering answer here; the
 * monthly total is a SUM() rather than a report you have to build. If it
 * ever grows to several properties and real volume, move it. Not before.
 *
 * ──────────────────────────────────────────────────────────────────
 * SETUP — about three minutes
 * ──────────────────────────────────────────────────────────────────
 * 1. sheets.new  → name it "Kito Bookings"
 * 2. Extensions → Apps Script. Delete whatever is in the editor.
 * 3. Paste this whole file. Save.
 * 4. Deploy → New deployment → gear icon → Web app
 *      Execute as:       Me
 *      Who has access:   Anyone            ← must be "Anyone", not
 *                                            "Anyone with Google account".
 *                                            Guests are not signed in.
 * 5. Authorise when prompted. Google will warn the app is unverified —
 *    that is expected for your own script. Advanced → Go to (unsafe).
 * 6. Copy the /exec URL it gives you and send it over. It goes into
 *    site.bookingLogUrl and nothing works until it does.
 *
 * ──────────────────────────────────────────────────────────────────
 * SHARING IT WITH THE OWNER
 * ──────────────────────────────────────────────────────────────────
 * Share the SHEET (not the script) with her, as Viewer, by link. It has
 * guest-side data in it, so never set it to public.
 */

var SHEET_NAME = 'Bookings';

var HEADERS = [
  'Ref',              // the code the guest carries into WhatsApp
  'Logged (EAT)',
  'Source',           // which CTA — tells you what actually converts
  'Nights',
  'Guest Airbnb quote',
  'Direct rate',
  'Commission due',
  'Came from',
  'Status',           // you fill this: enquiry / booked / stayed / paid
  'Notes'
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();

    sheet.appendRow([
      data.ref || '',
      formatEAT_(data.at),
      data.source || '',
      data.nights || '',
      data.quoteKsh || '',
      data.nightlyKsh || '',
      data.commissionKsh || '',
      data.referrer || '',
      'enquiry',
      ''
    ]);

    return json_({ ok: true, ref: data.ref });
  } catch (err) {
    // Log the failure rather than losing it silently — a dropped row is
    // a booking you cannot prove came from the site.
    try {
      getSheet_().appendRow(['ERROR', new Date(), String(err), '', '', '', '', '', 'error', '']);
    } catch (ignored) {}
    return json_({ ok: false, error: String(err) });
  }
}

/** Lets you open the /exec URL in a browser to confirm it is alive. */
function doGet() {
  return json_({ ok: true, service: 'kito-booking-log' });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
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

/** Nairobi is UTC+3 and does not observe DST, so this is a fixed offset. */
function formatEAT_(iso) {
  var d = iso ? new Date(iso) : new Date();
  return Utilities.formatDate(d, 'Africa/Nairobi', 'yyyy-MM-dd HH:mm');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this once from the editor to confirm the sheet is writable before
 * you wire the site up. Select testWrite, press Run, check the sheet.
 */
function testWrite() {
  doPost({ postData: { contents: JSON.stringify({
    ref: 'KOH-TEST', source: 'manual-test', nights: 3,
    quoteKsh: 9500, nightlyKsh: 7000, commissionKsh: 3000,
    at: new Date().toISOString(), referrer: 'test'
  })}});
}
