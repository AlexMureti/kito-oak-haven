"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  addMonths,
  addDays,
  assess,
  covers,
  freshness,
  heldOn,
  longDate,
  monthCells,
  monthName,
  nextFreeNight,
  shortDate,
  tapNight,
  todayInNairobi,
  trustedStatus,
  type Knowledge,
  type Notice,
  type Selection,
  type Ymd,
} from "@/lib/availability";
import type { LiveCalendar } from "@/lib/use-availability";

// A guest can look a year out. Beyond that nobody is booking a Nairobi
// apartment, and the arrows would run forever.
const HORIZON_MONTHS = 12;

// Six rows, always, so the card is the same height in every month and paging
// through the year never shoves the buttons below it. The cells a month does
// not use carry the neighbouring months' dates, muted, rather than a hole.
const CELLS = 42;

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

const FRAME =
  "mx-auto w-full max-w-md rounded-sm border border-gold-500/35 bg-cream-50/90 p-5 text-left shadow-[0_24px_60px_-32px_rgba(6,19,16,.45)] sm:p-6";

// The fluting from the mark: an arched head and a groove, so a day reads as a
// small column rather than a box.
const NIGHT = "relative h-11 rounded-t-[13px] rounded-b-[2px] border text-[12px] font-medium tabular-nums";

// A night the calendar cannot vouch for: while it loads, or when it could not
// be read. Deliberately not the free look.
const UNVOUCHED = "border-gold-600/10 bg-cream-100/60 text-ink-500";

const OPTION =
  "t-small mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-gold-600/45 px-4 text-ink-900 transition-colors hover:border-gold-600 hover:bg-cream-100";

const subscribeNothing = () => () => {};

type Props = {
  /** Which nights are taken, and how sure we are. See useAvailability(). */
  calendar: LiveCalendar;
  /**
   * Controlled from the parent so the chat can move it. A guest who types
   * "the 14th to the 18th" should watch the calendar fill in, rather than
   * being told the dates were understood and then having to enter them again.
   */
  value: Selection;
  onChange: (sel: Selection) => void;
};

export function DatePicker({ calendar, value: sel, onChange }: Props) {
  // False on the server and through hydration, true after. The page is
  // prerendered, so the server's "today" is the day it was built. Anything
  // drawn from that would offer nights that have already gone until the
  // browser corrected it, so nothing date-shaped is drawn until then.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  // Ticks each minute: the freshness line stays true, and a page left open
  // past midnight stops offering the night that just ended.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const today = todayInNairobi(now);
  const horizon = addMonths(today, HORIZON_MONTHS);

  const [view, setView] = useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)) - 1,
  }));

  // Follow the selection when something else moves it: the chat filling in
  // October while the guest is looking at September, or a suggested stay a
  // month on. Adjusted during render, not in an effect, so the grid never
  // paints a frame of the month it is leaving.
  const [followed, setFollowed] = useState(sel.checkIn);
  if (sel.checkIn !== followed) {
    setFollowed(sel.checkIn);
    if (sel.checkIn) {
      setView({ y: Number(sel.checkIn.slice(0, 4)), m: Number(sel.checkIn.slice(5, 7)) - 1 });
    }
  }

  const [hovering, setHovering] = useState<Ymd | null>(null);
  // A tap on a taken night, kept with the selection it was made against. The
  // chat can move the stay without a tap; when it does, this no longer
  // describes what is on screen, so it stops showing (see `said` below).
  const [notice, setNotice] = useState<(Notice & { sel: Selection }) | null>(null);

  const knowledge: Knowledge =
    calendar.status === "checking"
      ? "checking"
      : trustedStatus(calendar.status, calendar.checkedAt ?? "", now);
  // Taken nights are shown whenever at least one calendar was read. "Free" is
  // only ever promised when both were, and recently.
  const shows = knowledge === "live" || knowledge === "partial";
  const holds = shows ? calendar.holds : [];

  const minKey = Number(today.slice(0, 4)) * 12 + (Number(today.slice(5, 7)) - 1);
  const key = view.y * 12 + view.m;

  const cells = useMemo(() => {
    const month = monthCells(view.y, view.m);
    const lead = month.findIndex((d) => d !== null);
    const first = month[lead] as Ymd;
    const last = month[month.length - 1] as Ymd;
    const out: { day: Ymd; outside: boolean }[] = [];
    for (let i = lead; i > 0; i--) out.push({ day: addDays(first, -i), outside: true });
    for (let i = lead; i < month.length; i++) out.push({ day: month[i] as Ymd, outside: false });
    for (let n = 1; out.length < CELLS; n++) out.push({ day: addDays(last, n), outside: true });
    return out;
  }, [view]);

  // The arrival night fills the moment it is tapped. Without that the only
  // feedback on a first tap is nothing at all, and the control reads as dead.
  const shown = useMemo(() => {
    if (!sel.checkIn || sel.checkOut) return sel;
    const end = hovering && hovering >= sel.checkIn ? addDays(hovering, 1) : addDays(sel.checkIn, 1);
    return { checkIn: sel.checkIn, checkOut: end };
  }, [sel, hovering]);

  const range = shown.checkIn && shown.checkOut ? { start: shown.checkIn, end: shown.checkOut } : null;
  const verdict = assess(sel.checkIn, sel.checkOut, today, holds);
  const takenInView = cells.some((c) => !c.outside && c.day >= today && heldOn(c.day, holds));

  // An arrival tapped while the calendar was still loading, on a night the
  // answer then showed as taken. Nothing refused it at the time, so it is
  // named now, exactly as a tap on a taken night would have been.
  const arrivalTaken: Notice | null =
    sel.checkIn && !sel.checkOut && heldOn(sel.checkIn, holds)
      ? { day: sel.checkIn, nextFree: nextFreeNight(addDays(sel.checkIn, 1), holds, horizon) }
      : null;
  // tapNight hands back the very same selection when it refuses a tap, so a
  // notice is current exactly while the selection it was made against is.
  const said = (notice && notice.sel === sel ? notice : null) ?? arrivalTaken;

  function pick(day: Ymd) {
    const r = tapNight(sel, day, holds, horizon);
    setNotice(r.notice ? { ...r.notice, sel } : null);
    if (r.sel !== sel) onChange(r.sel);
    setHovering(null);
  }

  function choose(next: Selection) {
    setNotice(null);
    setHovering(null);
    onChange(next);
  }

  if (!mounted) {
    return (
      <div className={FRAME} aria-busy="true" data-keep-clear="">
        <div className="flex items-center justify-between gap-3">
          <span className="block h-5 w-36 rounded-sm bg-cream-200/70" />
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-10 w-10 rounded-sm border border-gold-600/20" />
            <span className="h-10 w-10 rounded-sm border border-gold-600/20" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
          {DOW.map((d, i) => (
            <span key={i} className="text-center text-[9.5px] uppercase tracking-[0.16em] text-ink-500">
              {d}
            </span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => (
            <span key={i} className={`${NIGHT} border-gold-600/10 bg-cream-100/50`} />
          ))}
        </div>
        <div className="mt-3 space-y-1">
          <div className="min-h-4" />
          <div className="min-h-4" />
        </div>
        <div className="mt-5 border-t border-gold-600/20 pt-4">
          <p className="t-small text-ink-500" data-cal-loading="">
            Checking the calendar&hellip;
          </p>
          <noscript>
            <style>{"[data-cal-loading]{display:none}"}</style>
            <p className="t-small pretty text-ink-700">
              The calendar needs JavaScript to show which nights are free. Send your dates on
              WhatsApp and we&rsquo;ll check them for you.
            </p>
          </noscript>
        </div>
      </div>
    );
  }

  const fresh = calendar.checkedAt ? freshness(calendar.checkedAt, now) : "";
  // Each line is short enough to sit on one line at 360px wide, so the card
  // never changes height when the state does.
  const stamp =
    knowledge === "checking"
      ? "Checking the calendar…"
      : knowledge === "live"
        ? `Live from both calendars · checked ${fresh}`
        : knowledge === "partial"
          ? `Some bookings may not show · checked ${fresh}`
          : "Calendar offline · we'll confirm by message";

  return (
    // data-keep-clear: the chat launcher measures against this, and against
    // the booking buttons, to keep off them on a phone.
    <div className={FRAME} data-keep-clear="">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xl leading-none text-ink-900" aria-live="polite">
          {monthName(view.m)} {view.y}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            disabled={key <= minKey}
            onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))}
            className="h-10 w-10 rounded-sm border border-gold-600/30 text-ink-700 transition-colors hover:border-gold-600 hover:bg-cream-100 disabled:opacity-25 disabled:hover:border-gold-600/30 disabled:hover:bg-transparent"
          >
            &#8249;
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={key >= minKey + HORIZON_MONTHS - 1}
            onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))}
            className="h-10 w-10 rounded-sm border border-gold-600/30 text-ink-700 transition-colors hover:border-gold-600 hover:bg-cream-100 disabled:opacity-25 disabled:hover:border-gold-600/30 disabled:hover:bg-transparent"
          >
            &#8250;
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
        {DOW.map((d, i) => (
          <span key={i} className="text-center text-[9.5px] uppercase tracking-[0.16em] text-ink-500">
            {d}
          </span>
        ))}
      </div>

      <div
        className="mt-1.5 grid grid-cols-7 gap-1"
        aria-busy={knowledge === "checking"}
        onMouseLeave={() => setHovering(null)}
      >
        {cells.map(({ day, outside }) => {
          const n = Number(day.slice(8, 10));

          // Another month's night, there to complete the colonnade. Not a
          // control: its own month is one arrow away.
          if (outside) {
            return (
              <span
                key={day}
                aria-hidden="true"
                className={`${NIGHT} grid place-items-center border-gold-600/10 bg-transparent text-ink-300/70`}
              >
                {n}
              </span>
            );
          }

          const gone = day < today;
          const unopened = day >= horizon;
          const taken = !gone && !!heldOn(day, holds);
          const picked = range ? covers(range, day) : false;
          const tentative = picked && !sel.checkOut && day > (sel.checkIn ?? "");
          const clash = taken && picked;
          const arrival = picked && day === sel.checkIn && !clash;

          const skin =
            gone || unopened
              ? "border-transparent bg-transparent text-ink-300"
              : clash
                ? "border-terracotta-600 bg-terracotta-500 text-cream-50"
                : taken
                  ? "night-taken border-pine-700/15 text-ink-300 line-through decoration-ink-300/80"
                  : tentative
                    ? "border-gold-600 bg-cream-200 text-ink-900"
                    : picked
                      ? "night-picked border-gold-600 text-pine-950"
                      : shows
                        ? "border-gold-600/20 bg-cream-100 text-ink-700 transition-transform hover:-translate-y-0.5 hover:border-gold-500"
                        : UNVOUCHED;

          const label = gone ? ", past" : unopened ? ", not open yet" : taken ? ", taken" : "";

          return (
            <button
              key={day}
              type="button"
              // A taken night stays pressable on purpose, and is not marked
              // aria-disabled: pressing it is how a guest hears why, and when
              // the next free night is. Its label already says it is taken.
              disabled={gone || unopened}
              aria-pressed={picked && !tentative}
              aria-label={`${longDate(day)}${label}`}
              onClick={() => pick(day)}
              onMouseEnter={() => sel.checkIn && !sel.checkOut && setHovering(day)}
              className={`${NIGHT} ${skin}`}
            >
              {/* The acorn in the crook of the mark: one jewel, on the arrival night only. */}
              {arrival && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-[5px] h-[5px] w-[5px] -translate-x-1/2 rotate-45 bg-pine-900/80"
                />
              )}
              {n}
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-1 text-[11px] leading-4 text-ink-500">
        <p className="flex min-h-4 items-center gap-1.5">
          {takenInView && (
            <>
              <span
                aria-hidden="true"
                className="night-taken inline-block h-3.5 w-3 rounded-t-[6px] rounded-b-[1px] border border-pine-700/15"
              />
              Taken
            </>
          )}
        </p>
        <p className={`min-h-4 ${knowledge === "checking" ? "animate-pulse motion-reduce:animate-none" : ""}`}>
          {stamp}
        </p>
      </div>

      <div className="mt-5 border-t border-gold-600/20 pt-4" aria-live="polite">
        {said ? (
          <>
            <p className="font-display text-2xl leading-none text-ink-900">
              {shortDate(said.day)} is taken
            </p>
            <p className="t-small pretty mt-2 text-ink-700">
              {said.nextFree
                ? `The next free night is ${longDate(said.nextFree)}.`
                : "Nothing is free after it in the next twelve months."}
            </p>
            {said.nextFree && (
              <button
                type="button"
                className={OPTION}
                onClick={() => choose({ checkIn: said.nextFree, checkOut: null })}
              >
                Arrive {shortDate(said.nextFree)}
                <span aria-hidden="true">&rarr;</span>
              </button>
            )}
          </>
        ) : (
          <>
            {verdict.state === "idle" && (
              <p className="t-small pretty text-ink-700">
                {sel.checkIn
                  ? `Arriving ${longDate(sel.checkIn)}. Now tap the last night — it can be in a later month.`
                  : "Tap the night you arrive, then the last night of your stay."}
              </p>
            )}

            {verdict.state === "free" && (
              <>
                <p className="gold-metal-ink font-display text-2xl leading-none">
                  {verdict.nights} {verdict.nights === 1 ? "night" : "nights"}
                </p>
                <p className="t-small pretty mt-2 text-ink-700">
                  {longDate(sel.checkIn!)} &rarr; {longDate(sel.checkOut!)}
                  {knowledge === "live"
                    ? ". Free on both calendars."
                    : knowledge === "checking"
                      ? ". Checking these are free…"
                      : ". We'll confirm these are free when you message."}
                </p>
              </>
            )}

            {verdict.state === "clash" && (
              <>
                <p className="font-display text-2xl leading-none text-terracotta-600">Already taken</p>
                <p className="t-small pretty mt-2 text-ink-700">
                  {verdict.clashNights.length === 1
                    ? `${longDate(verdict.clashNights[0])} is already booked.`
                    : `${verdict.clashNights.length} of those nights are already booked.`}
                  {verdict.alternative
                    ? verdict.nights === 1
                      ? " The nearest free night:"
                      : ` The nearest ${verdict.nights} free nights:`
                    : ` No ${verdict.nights} nights in a row are free in the next year.`}
                </p>
                {verdict.alternative && (
                  <button
                    type="button"
                    className={OPTION}
                    onClick={() =>
                      choose({ checkIn: verdict.alternative!.start, checkOut: verdict.alternative!.end })
                    }
                  >
                    {shortDate(verdict.alternative.start)} &rarr; {shortDate(verdict.alternative.end)}
                    <span className="text-ink-500">&middot; take these</span>
                  </button>
                )}
              </>
            )}

            {(verdict.state === "past" || verdict.state === "invalid") && (
              <p className="t-small pretty text-ink-700">
                {verdict.state === "past"
                  ? "Those nights have already gone."
                  : "The last night has to be on or after the night you arrive."}
              </p>
            )}
          </>
        )}

        {(sel.checkIn || sel.checkOut || said) && (
          <button
            type="button"
            onClick={() => choose({ checkIn: null, checkOut: null })}
            className="t-small mt-3 block text-ink-500 underline underline-offset-4 transition-colors hover:text-ink-900"
          >
            Start again
          </button>
        )}
      </div>
    </div>
  );
}
