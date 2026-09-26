import { readAvailability } from "@/lib/calendar-sync";

// Which nights are taken, for the date picker. Dates only: see
// src/lib/calendar-sync.ts for what is read, what is refused, and why.
//
// The two links it reads are AIRBNB_ICAL_URL and DIRECT_HOLDS_CSV_URL in the
// Vercel project's environment. Neither is ever sent to the browser or logged.
// Unset, the route answers "unknown" and the picker says it will confirm by
// message, which is exactly what it said before this existed.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const availability = await readAvailability();
  const answered = availability.status !== "unknown";

  return Response.json(availability, {
    headers: {
      // Two caches, told apart. Vercel's edge (CDN-Cache-Control, which
      // overrides Cache-Control there) keeps a good answer for five minutes
      // and a failed one for one, so a feed that recovers is picked up
      // quickly, and Airbnb is asked a few times an hour at most, never once
      // per visitor. The browser (Cache-Control) keeps nothing and asks the
      // edge every time, so a reload never shows an older answer than the
      // edge holds.
      "CDN-Cache-Control": answered ? "max-age=300, stale-while-revalidate=300" : "max-age=60",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
