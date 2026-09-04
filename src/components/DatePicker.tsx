"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  assess,
  covers,
  heldOn,
  longDate,
  monthCells,
  monthName,
  nextSelection,
  todayInNairobi,
  type Hold,
  type Selection,
  type Ymd,
} from "@/lib/availability";

// A guest can look a year out. Beyond that nobody is booking a Nairobi
// apartment, and the arrows would run forever.
const HORIZON_MONTHS = 12;

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

type Props = {
  /**
   * Nights already sold. Empty until the owner's Airbnb calendar is connected,
   * and the copy changes to match — this must never imply a night is available
   * when nothing has actually checked.
   */
  holds?: Hold[];
  /**
   * Controlled from the parent so the chat can move it. A guest who types
   * "the 14th to the 18th" should watch the calendar fill in, rather than
   * being told the dates were understood and then having to enter them again.
   */
  value: Selection;
  onChange: (sel: Selection) => void;
};

export function DatePicker({ holds = [], value: sel, onChange }: Props) {
  const today = useMemo(() => todayInNairobi(), []);
  const horizon = useMemo(() => addMonths(today, HORIZON_MONTHS), [today]);

  const [view, setView] = useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)) - 1,
  }));
  const [hovering, setHovering] = useState<Ymd | null>(null);

  // Follow the selection when something else sets it — otherwise the chat
  // fills October while the guest is still looking at September.
  useEffect(() => {
    if (!sel.checkIn) return;
    setView({ y: Number(sel.checkIn.slice(0, 4)), m: Number(sel.checkIn.slice(5, 7)) - 1 });
  }, [sel.checkIn]);

  const minKey = Number(today.slice(0, 4)) * 12 + (Number(today.slice(5, 7)) - 1);
  const key = view.y * 12 + view.m;

  const cells = useMemo(() => monthCells(view.y, view.m), [view]);
  const knowsAvailability = holds.length > 0;

  // The arrival night fills the moment it is tapped. Without that the only
  // feedback on a first tap is nothing at all, and the control reads as dead.
  const shown = useMemo(() => {
    if (!sel.checkIn || sel.checkOut) return sel;
    const end = hovering && hovering >= sel.checkIn ? addDays(hovering, 1) : addDays(sel.checkIn, 1);
    return { checkIn: sel.checkIn, checkOut: end };
  }, [sel, hovering]);

  const range = shown.checkIn && shown.checkOut ? { start: shown.checkIn, end: shown.checkOut } : null;
  const verdict = assess(sel.checkIn, sel.checkOut, today, holds);

  function pick(day: Ymd) {
    onChange(nextSelection(sel, day));
    setHovering(null);
  }

  function clear() {
    onChange({ checkIn: null, checkOut: null });
    setHovering(null);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-sm border border-gold-500/35 bg-cream-50/90 p-5 text-left shadow-[0_24px_60px_-32px_rgba(6,19,16,.45)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xl leading-none text-ink-900">
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

      <div className="mt-1.5 grid grid-cols-7 gap-1" onMouseLeave={() => setHovering(null)}>
        {cells.map((day, i) => {
          if (!day) return <span key={`b${i}`} aria-hidden="true" />;

          const past = day < today || day >= horizon;
          const held = !!heldOn(day, holds);
          const picked = range ? covers(range, day) : false;
          const tentative = picked && !sel.checkOut && day > (sel.checkIn ?? "");
          const clash = held && picked;

          // The fluting from the mark: an arched head and a groove, so a day
          // reads as a small column rather than a box.
          const base =
            "relative h-11 rounded-t-[13px] rounded-b-[2px] border text-[12px] font-medium tabular-nums transition-colors";

          const skin = past
            ? "border-transparent bg-transparent text-ink-300"
            : clash
              ? "border-terracotta-600 bg-terracotta-500 text-cream-50"
              : held
                ? "border-pine-700 bg-pine-800 text-cream-200"
                : tentative
                  ? "border-gold-600 bg-cream-200 text-ink-900"
                  : picked
                    ? "border-gold-600 bg-gold-400 text-pine-950"
                    : "border-gold-600/20 bg-cream-100 text-ink-700 hover:-translate-y-0.5 hover:border-gold-500";

          return (
            <button
              key={day}
              type="button"
              disabled={past}
              aria-pressed={picked && !tentative}
              aria-label={`${longDate(day)}${held ? ", already booked" : past ? ", past" : ""}`}
              onClick={() => pick(day)}
              onMouseEnter={() => sel.checkIn && !sel.checkOut && setHovering(day)}
              className={`${base} ${skin}`}
            >
              {Number(day.slice(8, 10))}
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-gold-600/20 pt-4">
        {verdict.state === "idle" && (
          <p className="t-small text-ink-700">
            {sel.checkIn
              ? `Arriving ${longDate(sel.checkIn)}. Now tap the last night — it can be in a later month.`
              : "Tap the night you arrive, then the last night of your stay."}
          </p>
        )}

        {verdict.state === "free" && (
          <>
            <p className="font-display text-2xl leading-none text-gold-700">
              {verdict.nights} {verdict.nights === 1 ? "night" : "nights"}
            </p>
            <p className="t-small mt-2 text-ink-700">
              {longDate(sel.checkIn!)} &rarr; {longDate(sel.checkOut!)}
              {knowsAvailability
                ? ". Free on both calendars."
                : ". We'll confirm these are free when you message."}
            </p>
          </>
        )}

        {verdict.state === "clash" && (
          <>
            <p className="font-display text-2xl leading-none text-terracotta-600">Already taken</p>
            <p className="t-small mt-2 text-ink-700">
              {verdict.clashNights.length === 1 ? "One of those nights is" : "Some of those nights are"}{" "}
              already booked.
              {verdict.alternative &&
                ` Nearest ${verdict.nights} free: ${longDate(verdict.alternative.start)} → ${longDate(verdict.alternative.end)}.`}
            </p>
          </>
        )}

        {(verdict.state === "past" || verdict.state === "invalid") && (
          <p className="t-small text-ink-700">
            {verdict.state === "past"
              ? "Those nights have already gone."
              : "The last night has to be on or after the night you arrive."}
          </p>
        )}

        {(sel.checkIn || sel.checkOut) && (
          <button
            type="button"
            onClick={clear}
            className="t-small mt-3 text-ink-500 underline underline-offset-4 transition-colors hover:text-ink-900"
          >
            Start again
          </button>
        )}
      </div>
    </div>
  );
}
