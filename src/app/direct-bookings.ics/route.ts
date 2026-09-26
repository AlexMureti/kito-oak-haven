import { directFeed, readDirect } from "@/lib/calendar-sync";

// The direct bookings, as a calendar the owner's Airbnb imports. Once it is
// connected under Airbnb > Calendar > Availability > Connect calendars, a
// night confirmed here is blocked there without anyone touching her listing.
//
// Only confirmed stays appear: the published tab behind DIRECT_HOLDS_CSV_URL
// holds rows whose Status is confirmed, held, deposit paid or paid. An enquiry
// holds nothing, or every tap of the WhatsApp button would close a night.
//
// What an unreadable tab gets instead of a calendar, and why, is decided in
// directFeed() in src/lib/calendar-sync.ts, where the tests can reach it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const feed = directFeed(await readDirect(), new Date());
  return new Response(feed.body, { status: feed.status, headers: feed.headers });
}
