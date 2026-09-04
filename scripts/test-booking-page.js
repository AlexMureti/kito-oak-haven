// Tests the booking page's decision logic.
//
// The page ships as one HTML file, so the logic it is judged on lives inline.
// Rather than duplicate it here — two copies of a rule is how the copies drift
// apart — this pulls the marked block straight out of the page and runs it.
// If the markers move, this fails loudly instead of testing nothing.
//
//   node scripts/test-booking-page.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PAGE = path.join(__dirname, '..', 'docs', 'booking-system.html');
const OPEN = '/* --- pure logic: tested by scripts/test-booking-page.js --- */';
const CLOSE = '/* --- end pure logic --- */';

function loadLogic() {
  const html = fs.readFileSync(PAGE, 'utf8');
  const a = html.indexOf(OPEN);
  const b = html.indexOf(CLOSE);
  if (a === -1 || b === -1) {
    throw new Error(
      'Could not find the pure-logic markers in docs/booking-system.html.\n' +
      'Expected:\n  ' + OPEN + '\n  ...\n  ' + CLOSE
    );
  }
  const src = html.slice(a + OPEN.length, b);
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'booking-system.html (pure logic)' });
  return sandbox;
}

let failed = 0;
let passed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS  ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL  ' + name);
    console.log('        ' + err.message);
  }
}

function eq(got, want, what) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) throw new Error((what || 'value') + ': got ' + g + ', wanted ' + w);
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------

const L = loadLogic();
const { assess, addDays, nightsBetween } = L;

ok(typeof assess === 'function', 'assess() is not exported from the page');

// A fixed "today" so these tests mean the same thing in six months.
const TODAY = '2026-09-03';

// One Airbnb hold, three nights, starting three days out.
const HOLDS = [{ start: '2026-09-06', end: '2026-09-10', label: 'Airbnb' }];

console.log('\nthe rule that costs money if it is wrong');

check('a guest arriving the day the last one leaves is free', () => {
  const r = assess('2026-09-10', '2026-09-14', TODAY, HOLDS);
  eq(r.state, 'free', 'state');
  eq(r.nights, 4, 'nights');
});

check('a guest leaving the day the next one arrives is free', () => {
  const r = assess('2026-09-02', '2026-09-06', TODAY, HOLDS);
  // arrival is in the past, so this must be rejected for THAT reason,
  // not because it was mistaken for a collision
  eq(r.state, 'past', 'state');
});

check('a stay ending exactly on a hold start does not collide', () => {
  const r = assess('2026-09-04', '2026-09-06', TODAY, HOLDS);
  eq(r.state, 'free', 'state');
});

console.log('\ndates in the past');

check('an arrival before today is refused', () => {
  const r = assess('2026-09-01', '2026-09-05', TODAY, HOLDS);
  eq(r.state, 'past', 'state');
});

check('yesterday is refused', () => {
  const r = assess(addDays(TODAY, -1), addDays(TODAY, 3), TODAY, HOLDS);
  eq(r.state, 'past', 'state');
});

check('today is accepted', () => {
  const r = assess(TODAY, addDays(TODAY, 2), TODAY, HOLDS);
  eq(r.state, 'free', 'state');
});

check('a suggested alternative is never in the past', () => {
  const r = assess('2026-09-07', '2026-09-09', TODAY, HOLDS);
  eq(r.state, 'clash', 'state');
  ok(r.alternative, 'no alternative offered');
  ok(r.alternative.start >= TODAY,
    'offered ' + r.alternative.start + ', which is before today');
});

console.log('\ncollisions');

check('a real overlap is caught', () => {
  const r = assess('2026-09-08', '2026-09-12', TODAY, HOLDS);
  eq(r.state, 'clash', 'state');
});

check('it names the nights that actually collide', () => {
  const r = assess('2026-09-08', '2026-09-12', TODAY, HOLDS);
  eq(r.clashNights, ['2026-09-08', '2026-09-09'], 'clashNights');
});

check('a stay entirely inside a hold collides', () => {
  const r = assess('2026-09-07', '2026-09-08', TODAY, HOLDS);
  eq(r.state, 'clash', 'state');
});

check('a stay that swallows a hold collides', () => {
  const r = assess('2026-09-04', '2026-09-14', TODAY, HOLDS);
  eq(r.state, 'clash', 'state');
});

check('unrelated dates do not collide', () => {
  const r = assess('2026-09-20', '2026-09-24', TODAY, HOLDS);
  eq(r.state, 'free', 'state');
});

console.log('\nthe alternative it offers');

check('the alternative is the same length as the request', () => {
  const r = assess('2026-09-08', '2026-09-12', TODAY, HOLDS);
  eq(nightsBetween(r.alternative.start, r.alternative.end), 4, 'alternative nights');
});

check('the alternative is itself free', () => {
  const r = assess('2026-09-08', '2026-09-12', TODAY, HOLDS);
  const second = assess(r.alternative.start, r.alternative.end, TODAY, HOLDS);
  eq(second.state, 'free', 'the offered window was not actually free');
});

check('two holds back to back still yield a free window', () => {
  const holds = [
    { start: '2026-09-06', end: '2026-09-10', label: 'Airbnb' },
    { start: '2026-09-10', end: '2026-09-14', label: 'Airbnb' }
  ];
  const r = assess('2026-09-07', '2026-09-09', TODAY, holds);
  eq(r.state, 'clash', 'state');
  ok(r.alternative, 'no alternative found past two adjacent holds');
  const second = assess(r.alternative.start, r.alternative.end, TODAY, holds);
  eq(second.state, 'free', 'offered window collides with the second hold');
});

console.log('\npicking nights by tapping');

const { nextSelection } = L;
ok(typeof nextSelection === 'function', 'nextSelection() is not exported from the page');

const EMPTY = { checkIn: null, checkOut: null };

check('the first tap sets the arrival and nothing else', () => {
  eq(nextSelection(EMPTY, '2026-09-05'), { checkIn: '2026-09-05', checkOut: null });
});

check('the second tap closes the stay on the night after the one tapped', () => {
  const a = nextSelection(EMPTY, '2026-09-05');
  eq(nextSelection(a, '2026-09-08'), { checkIn: '2026-09-05', checkOut: '2026-09-09' });
});

check('a third tap further along extends the stay instead of wiping it', () => {
  let s = nextSelection(EMPTY, '2026-09-05');
  s = nextSelection(s, '2026-09-08');
  s = nextSelection(s, '2026-09-12');
  eq(s, { checkIn: '2026-09-05', checkOut: '2026-09-13' });
});

check('tapping back inside the stay shortens it', () => {
  let s = nextSelection(EMPTY, '2026-09-05');
  s = nextSelection(s, '2026-09-12');
  s = nextSelection(s, '2026-09-07');
  eq(s, { checkIn: '2026-09-05', checkOut: '2026-09-08' });
});

check('tapping before the arrival starts a new stay there', () => {
  let s = nextSelection(EMPTY, '2026-09-08');
  s = nextSelection(s, '2026-09-12');
  s = nextSelection(s, '2026-09-04');
  eq(s, { checkIn: '2026-09-04', checkOut: null });
});

check('tapping the arrival night itself makes a one-night stay', () => {
  const a = nextSelection(EMPTY, '2026-09-05');
  eq(nextSelection(a, '2026-09-05'), { checkIn: '2026-09-05', checkOut: '2026-09-06' });
});

check('extending never leaves the stay inverted', () => {
  let s = EMPTY;
  const taps = ['2026-09-09', '2026-09-05', '2026-09-14', '2026-09-06', '2026-09-20'];
  for (const t of taps) {
    s = nextSelection(s, t);
    if (s.checkIn && s.checkOut) {
      ok(s.checkOut > s.checkIn, 'after tapping ' + t + ' the stay was ' + JSON.stringify(s));
    }
  }
});

console.log('\nbad input');

check('check-out before check-in is invalid, not free', () => {
  const r = assess('2026-09-14', '2026-09-10', TODAY, HOLDS);
  eq(r.state, 'invalid', 'state');
});

check('a zero-night stay is invalid', () => {
  const r = assess('2026-09-12', '2026-09-12', TODAY, HOLDS);
  eq(r.state, 'invalid', 'state');
});

check('a missing date is idle, not an error', () => {
  eq(assess('', '', TODAY, HOLDS).state, 'idle', 'state');
  eq(assess('2026-09-12', '', TODAY, HOLDS).state, 'idle', 'state');
});

console.log('\nthe link someone has to send us');

const { checkIcalLink } = L;
ok(typeof checkIcalLink === 'function', 'checkIcalLink() is not exported from the page');

const GOOD = 'https://www.airbnb.com/calendar/ical/48291736.ics?s=9f2c1ab77e5d40c8b3a6e1d7f0c4a852';

check('a correct export link passes and yields the listing id', () => {
  const r = checkIcalLink(GOOD);
  eq(r.state, 'ok', 'state');
  eq(r.listingId, '48291736', 'listing id');
});

check('the listing id is the number to compare against the rooms link', () => {
  // airbnb.com/rooms/48291736 is the same listing, so the numbers must match.
  const r = checkIcalLink(GOOD);
  const roomsId = 'https://www.airbnb.com/rooms/48291736'.match(/\/rooms\/(\d+)/)[1];
  eq(r.listingId, roomsId, 'ical id vs rooms id');
});

check('the public listing page is caught, not accepted', () => {
  eq(checkIcalLink('https://www.airbnb.com/rooms/48291736').state, 'listing-page');
  eq(checkIcalLink('https://airbnb.co.uk/rooms/48291736?source=x').state, 'listing-page');
});

check('a link cut short before the token is caught', () => {
  eq(checkIcalLink('https://www.airbnb.com/calendar/ical/48291736.ics').state, 'no-token');
});

check('some other Airbnb page is caught', () => {
  eq(checkIcalLink('https://www.airbnb.com/hosting/reservations').state, 'not-the-export');
});

check('a link from somewhere else entirely is caught', () => {
  eq(checkIcalLink('https://calendar.google.com/calendar/ical/x/basic.ics').state, 'not-airbnb');
  eq(checkIcalLink('https://www.booking.com/hotel/ke/kito.html').state, 'not-airbnb');
});

check('nothing pasted, or prose with no link, is not an error', () => {
  eq(checkIcalLink('').state, 'empty');
  eq(checkIcalLink('   ').state, 'empty');
  eq(checkIcalLink(null).state, 'empty');
  eq(checkIcalLink('here you go').state, 'not-a-link');
});

check('a link pasted inside a sentence is still read', () => {
  const r = checkIcalLink('Hi Alex here it is ' + GOOD + ' thanks.');
  eq(r.state, 'ok', 'state');
  eq(r.listingId, '48291736', 'listing id');
});

check('a trailing full stop is not treated as part of the link', () => {
  eq(checkIcalLink(GOOD + '.').state, 'ok');
  eq(checkIcalLink('(' + GOOD + ')').state, 'ok');
});

console.log('\nmonths');

const { addMonths, monthCells } = L;
ok(typeof addMonths === 'function', 'addMonths() is not exported from the page');
ok(typeof monthCells === 'function', 'monthCells() is not exported from the page');

check('a month added to the 31st clamps to the end of a short month', () => {
  eq(addMonths('2026-01-31', 1), '2026-02-28', '2026 is not a leap year');
  eq(addMonths('2028-01-31', 1), '2028-02-29', '2028 is a leap year');
  eq(addMonths('2026-03-31', 1), '2026-04-30', 'April has 30 days');
});

check('adding months crosses the year', () => {
  eq(addMonths('2026-12-15', 1), '2027-01-15');
  eq(addMonths('2026-09-03', 12), '2027-09-03');
});

check('September 2026 lays out Monday-first with one leading blank', () => {
  // 3 September 2026 is a Thursday, so the 1st is a Tuesday: one blank before it.
  const cells = monthCells(2026, 8);
  const lead = cells.findIndex(c => c !== null);
  eq(lead, 1, 'leading blanks');
  eq(cells[1], '2026-09-01', 'first day');
  eq(cells.filter(Boolean).length, 30, 'days in September');
});

check('October 2026 starts on a Thursday, three blanks in', () => {
  const cells = monthCells(2026, 9);
  eq(cells.findIndex(c => c !== null), 3, 'leading blanks');
  eq(cells.filter(Boolean).length, 31, 'days in October');
});

check('February in a leap year has 29 cells', () => {
  eq(monthCells(2028, 1).filter(Boolean).length, 29);
  eq(monthCells(2026, 1).filter(Boolean).length, 28);
});

check('every day a month yields is inside that month, in order', () => {
  const cells = monthCells(2026, 11).filter(Boolean);
  for (let i = 0; i < cells.length; i++) {
    ok(cells[i].startsWith('2026-12'), 'stray day ' + cells[i]);
    if (i) ok(cells[i] > cells[i - 1], 'out of order at ' + cells[i]);
  }
});

check('a stay can be picked across a month boundary', () => {
  let s = nextSelection({ checkIn: null, checkOut: null }, '2026-11-28');
  s = nextSelection(s, '2026-12-02');
  eq(s, { checkIn: '2026-11-28', checkOut: '2026-12-03' });
  eq(assess(s.checkIn, s.checkOut, TODAY, HOLDS).state, 'free');
  eq(nightsBetween(s.checkIn, s.checkOut), 5, 'nights across the boundary');
});

check('a guest booking two months out is assessable', () => {
  const start = addMonths(TODAY, 2);
  const r = assess(start, addDays(start, 5), TODAY, HOLDS);
  eq(r.state, 'free', 'state');
  eq(r.nights, 5, 'nights');
});

check('the nearest free window can land in a later month', () => {
  const holds = [{ start: '2026-09-05', end: '2026-10-04', label: 'Airbnb' }];
  const r = assess('2026-09-10', '2026-09-14', TODAY, holds);
  eq(r.state, 'clash', 'state');
  ok(r.alternative, 'no alternative across the month end');
  eq(r.alternative.start, '2026-10-04', 'alternative start');
  eq(assess(r.alternative.start, r.alternative.end, TODAY, holds).state, 'free');
});

console.log('\ndates that cross boundaries');

check('a stay across a month end is counted correctly', () => {
  const r = assess('2026-09-28', '2026-10-03', TODAY, HOLDS);
  eq(r.state, 'free', 'state');
  eq(r.nights, 5, 'nights');
});

check('a stay across a year end is counted correctly', () => {
  const r = assess('2026-12-29', '2027-01-02', TODAY, HOLDS);
  eq(r.nights, 4, 'nights');
});

check('addDays crosses a month boundary', () => {
  eq(addDays('2026-09-30', 1), '2026-10-01', 'addDays');
  eq(addDays('2026-02-28', 1), '2026-03-01', 'addDays');
});

// ---------------------------------------------------------------------------
// The same rules now live twice: inline in docs/booking-system.html, and in
// src/lib/availability.ts, which is what actually ships to guests. Everything
// above tests the demo copy. Without what follows, the copy on the live site
// has no coverage at all and the two can drift apart in silence.
//
// So rather than assert the site copy separately — which would only ever test
// the cases I thought of twice — this runs both implementations over a spread
// of inputs and fails if they ever disagree.

/** Only the fields both implementations promise. The TS Hold carries a label. */
function shape(v) {
  if (!v || v.state !== 'clash') return { state: v && v.state, nights: v && v.nights };
  return {
    state: v.state,
    nights: v.nights,
    clashNights: v.clashNights,
    alt: v.alternative ? { start: v.alternative.start, end: v.alternative.end } : null,
  };
}

(async () => {
  let ts;
  try {
    ts = await import('../src/lib/availability.ts');
  } catch (err) {
    failed++;
    console.log('\n  FAIL  could not load src/lib/availability.ts');
    console.log('        ' + err.message);
    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    process.exit(1);
  }

  console.log('\nthe shipped copy agrees with the demo copy');

  // A spread wide enough to cross months, a year end, and a leap February.
  const anchors = [
    '2026-09-04', '2026-09-28', '2026-10-01', '2026-12-29',
    '2027-01-02', '2028-02-27', '2028-03-01',
  ];
  const spans = [1, 2, 3, 5, 9, 14, 30];

  const holdSets = [
    [],
    [{ start: '2026-09-06', end: '2026-09-10', label: 'Airbnb' }],
    [
      { start: '2026-09-06', end: '2026-09-10', label: 'Airbnb' },
      { start: '2026-09-10', end: '2026-09-14', label: 'Airbnb' },
    ],
    [{ start: '2026-12-20', end: '2027-01-05', label: 'Airbnb' }],
    [{ start: '2028-02-26', end: '2028-03-02', label: 'Airbnb' }],
  ];

  let compared = 0;
  let mismatch = null;

  for (const holds of holdSets) {
    for (const a of anchors) {
      for (const n of spans) {
        for (const offset of [-3, 0, 4]) {
          const checkIn = ts.addDays(a, offset);
          const checkOut = ts.addDays(checkIn, n);
          const today = '2026-09-04';

          const mine = shape(assess(checkIn, checkOut, today, holds));
          const theirs = shape(ts.assess(checkIn, checkOut, today, holds));
          compared++;

          if (JSON.stringify(mine) !== JSON.stringify(theirs) && !mismatch) {
            mismatch = { checkIn, checkOut, holds, demo: mine, site: theirs };
          }
        }
      }
    }
  }

  check('assess() gives identical answers in both copies', () => {
    ok(!mismatch, 'diverged on ' + JSON.stringify(mismatch));
  });

  check('nextSelection() behaves identically in both copies', () => {
    let sA = { checkIn: null, checkOut: null };
    let sB = { checkIn: null, checkOut: null };
    for (const a of anchors) {
      for (const offset of [0, 3, -2, 11, 1]) {
        const day = ts.addDays(a, offset);
        sA = nextSelection(sA, day);
        sB = ts.nextSelection(sB, day);
        eq(sA, sB, 'after tapping ' + day);
      }
    }
  });

  check('date maths agrees in both copies', () => {
    for (const a of anchors) {
      for (const n of [-40, -1, 0, 1, 27, 400]) {
        eq(addDays(a, n), ts.addDays(a, n), `addDays(${a}, ${n})`);
      }
      for (const n of [1, 2, 6, 12]) {
        eq(addMonths(a, n), ts.addMonths(a, n), `addMonths(${a}, ${n})`);
      }
      eq(nightsBetween(a, addDays(a, 9)), ts.nightsBetween(a, ts.addDays(a, 9)), 'nightsBetween');
    }
  });

  check('month layout agrees in both copies', () => {
    for (const y of [2026, 2027, 2028]) {
      for (let m = 0; m < 12; m++) {
        eq(monthCells(y, m), ts.monthCells(y, m), `monthCells(${y}, ${m})`);
      }
    }
  });

  console.log('  ' + compared + ' assess() cases compared across ' + holdSets.length + ' hold sets');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
