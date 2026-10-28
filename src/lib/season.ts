// The December layer. On by date, in Nairobi time, and previewable any day of
// the year at /december. It changes the mood of the page and answers the one
// question a December guest has; it never touches a price or a house rule.

export const DECEMBER = { from: "2026-12-01", to: "2027-01-02" } as const;

/** The three stays people actually book in December, as check-in and check-out. */
export const decemberStays = [
  { name: "Jamhuri weekend", checkIn: "2026-12-11", checkOut: "2026-12-14" },
  { name: "Christmas week", checkIn: "2026-12-20", checkOut: "2026-12-27" },
  { name: "New Year", checkIn: "2026-12-28", checkOut: "2027-01-03" },
] as const;

/** Today as YYYY-MM-DD in Nairobi, whatever clock the server keeps. */
export function todayInNairobi(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDecemberSeason(now = new Date()): boolean {
  const today = todayInNairobi(now);
  return today >= DECEMBER.from && today <= DECEMBER.to;
}
