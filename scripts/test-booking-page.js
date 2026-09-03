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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
