import { useEffect, useState } from "react";
import type { AvailabilityStatus, Hold } from "./availability";

/** The calendar as the browser holds it, before the picker decides how far to trust it. */
export type LiveCalendar = {
  status: "checking" | AvailabilityStatus;
  checkedAt: string | null;
  holds: Hold[];
};

const CHECKING: LiveCalendar = { status: "checking", checkedAt: null, holds: [] };
const UNKNOWN: LiveCalendar = { status: "unknown", checkedAt: null, holds: [] };

/** A page left open this long asks again when the guest comes back to it. */
const REFRESH_AFTER_MS = 10 * 60000;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The route is ours, but its answer is still read defensively. Anything that
 * is not exactly the expected shape becomes "unknown", and the picker says it
 * will confirm by message. A malformed answer must never read as free.
 */
function read(json: unknown): LiveCalendar {
  if (!json || typeof json !== "object") return UNKNOWN;
  const { status, checkedAt, holds } = json as Record<string, unknown>;
  if (status !== "live" && status !== "partial" && status !== "unknown") return UNKNOWN;
  if (typeof checkedAt !== "string" || !Array.isArray(holds)) return UNKNOWN;

  const clean: Hold[] = [];
  for (const h of holds) {
    const { start, end } = (h ?? {}) as Record<string, unknown>;
    if (typeof start !== "string" || typeof end !== "string") return UNKNOWN;
    if (!YMD.test(start) || !YMD.test(end) || end <= start) return UNKNOWN;
    clean.push({ start, end, label: "Taken" });
  }
  return { status, checkedAt, holds: clean };
}

/**
 * Which nights are taken, from /api/availability.
 *
 * Asked once on load, early, so the answer is in long before a guest scrolls
 * down to the calendar. Asked again when a page that has sat in a background
 * tab comes back into view.
 */
export function useAvailability(): LiveCalendar {
  const [calendar, setCalendar] = useState<LiveCalendar>(CHECKING);

  useEffect(() => {
    let alive = true;
    let askedAt = 0;

    async function ask() {
      askedAt = Date.now();
      let next = UNKNOWN;
      try {
        // No cache option on purpose: the route tells the browser to keep
        // nothing (max-age=0) and tells Vercel's edge to keep five minutes, so
        // every ask reaches the edge and none reaches Airbnb directly.
        // Ten seconds, then "Calendar offline": a stalled connection must not
        // leave "Checking the calendar…" on screen for good.
        const res = await fetch("/api/availability", { signal: AbortSignal.timeout(10000) });
        if (res.ok) next = read(await res.json());
      } catch {
        // Offline, or the route is down. Falls through as "unknown".
      }
      if (!alive) return;
      setCalendar((prev) =>
        // A failed refresh keeps the nights already known to be taken, but
        // the picker stops promising: those nights are still true, and the
        // "free" verdict is no longer checked.
        next.status === "unknown" && prev.holds.length
          ? { ...prev, status: "partial" }
          : next
      );
    }

    void ask();

    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - askedAt > REFRESH_AFTER_MS) {
        void ask();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return calendar;
}
