"use client";

import { decemberStays } from "@/lib/season";
import { useAvailability } from "@/lib/use-availability";
import { addDays, heldOn, nightsBetween, overlaps, type Hold } from "@/lib/availability";
import { onBookingClick, plainHref, stayMessage } from "@/lib/booking";
import { site } from "@/lib/site";
import { Icon } from "./Icon";

/**
 * The December question, answered on the first scroll: is Christmas week
 * free? Three stays, each read live from the same calendar the booking
 * section uses. Nothing here is invented: an open window is one the calendar
 * says is open, and when the calendar cannot be reached it says so.
 */
type Verdict = "checking" | "open" | "partly" | "taken" | "unknown";

const LABEL: Record<Verdict, string> = {
  checking: "Checking…",
  open: "Open",
  partly: "Partly taken",
  taken: "Taken",
  unknown: "Ask us",
};

function verdict(status: string, holds: Hold[], checkIn: string, checkOut: string): Verdict {
  if (status === "checking") return "checking";
  if (status === "unknown") return "unknown";
  const clash = holds.some((h) => overlaps(checkIn, checkOut, h.start, h.end));
  // A failed refresh keeps the taken nights true, but "open" is no longer checked.
  if (!clash) return status === "partial" ? "unknown" : "open";
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
    if (!heldOn(d, holds)) return "partly";
  }
  return "taken";
}

const fmt = (ymd: string, month: boolean) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    ...(month ? { month: "short" } : {}),
    timeZone: "UTC",
  });

/** "Sun 20 – Sun 27 Dec", and the month twice only when the stay crosses one. */
const span = (checkIn: string, checkOut: string) =>
  `${fmt(checkIn, checkIn.slice(0, 7) !== checkOut.slice(0, 7))} – ${fmt(checkOut, true)}`;

export function DecemberStays() {
  const calendar = useAvailability();

  return (
    <section id="december" className="on-cream section-tight grain relative">
      <div className="shell-narrow relative">
        <div className="rule mb-10 opacity-60">
          <i />
        </div>
        <p className="eyebrow eyebrow-on-light reveal">December stays</p>
        <h2 className="t-h2 balance reveal d1 mt-4 text-ink-900">
          Jamhuri, Christmas, <span className="gold-metal-ink">New Year.</span>
        </h2>
        <p className="t-lead pretty reveal d2 mt-5 max-w-xl text-ink-700">
          The dates the family asks about first, read live from the calendar.
          One tap sends them to a person on WhatsApp.
        </p>

        <ul className="reveal d3 mt-9 border-b border-gold-500/20">
          {decemberStays.map((s) => {
            const v = verdict(calendar.status, calendar.holds, s.checkIn, s.checkOut);
            const nights = nightsBetween(s.checkIn, s.checkOut);
            const open = v === "open";
            return (
              <li key={s.name} className="border-t border-gold-500/20">
                <a
                  className="group flex py-5 transition-colors hover:bg-white/50 sm:py-6"
                  href={plainHref(stayMessage(s.checkIn, s.checkOut))}
                  onClick={onBookingClick(
                    { source: "december-stays", nights, checkIn: s.checkIn, checkOut: s.checkOut },
                    (ref) => stayMessage(s.checkIn, s.checkOut, ref)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* Two rows, two columns: the name and its verdict share a
                      baseline, the dates and the action share the next. The
                      verdict column takes only what it needs, so "Jamhuri
                      weekend" keeps its line on a 390px phone. */}
                  <span className="grid flex-1 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                    <span className="font-display text-[1.6rem] leading-tight text-ink-900 sm:text-[1.9rem]">
                      {s.name}
                    </span>
                    <span
                      className={`flex items-center justify-end gap-2 whitespace-nowrap text-[0.7rem] uppercase tracking-[0.16em] ${
                        open ? "text-gold-700" : "text-ink-500"
                      }`}
                      aria-live="polite"
                    >
                      <i
                        className="block h-[5px] w-[5px] rotate-45"
                        style={{
                          background: open ? "var(--gold-metal)" : "transparent",
                          border: open ? "none" : "1px solid currentColor",
                          opacity: v === "checking" ? 0.4 : 1,
                        }}
                      />
                      {LABEL[v]}
                    </span>
                    <span className="t-small text-ink-500">
                      {span(s.checkIn, s.checkOut)} · {nights}&nbsp;nights
                    </span>
                    <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-[0.8rem] text-gold-700 transition-colors group-hover:text-terracotta-600">
                      <Icon name="whatsapp" className="h-3.5 w-3.5" />
                      {v === "taken" || v === "partly" ? "Ask about these dates" : "Hold these dates"}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <p className="t-small reveal d4 mt-6 text-ink-500">
          {site.currency} {site.nightlyKsh?.toLocaleString("en-KE")} a night, direct, nothing added at
          checkout. A deposit holds the dates; the balance is settled on arrival.
        </p>
      </div>
    </section>
  );
}
