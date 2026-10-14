# Kito Oak Haven

Direct-booking website for a one-bedroom short-stay apartment in Kilimani, Nairobi. A guest picks dates on a calendar that already knows which nights are taken, types in the quote Airbnb gave them to see the direct price, and sends the stay on WhatsApp with a booking reference attached.

## Live

https://www.kitooakhaven.com

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Framer Motion and Lenis for the scroll-driven walkthrough
- Three server routes: `/api/availability` reads the owner's Airbnb iCal feed and the confirmed direct bookings; `/direct-bookings.ics` publishes the direct bookings back to Airbnb; `/api/chat` answers guest questions through the Gemini API, with the key kept on the server
- Google Apps Script logs each enquiry to a Google Sheet (`scripts/apps-script/`)
- Hosted on Vercel

## Run locally

```bash
npm install
npm run dev
```

The calendar needs `AIRBNB_ICAL_URL` and `DIRECT_HOLDS_CSV_URL` in `.env.local`, and the chat needs `GEMINI_API_KEY`. Without them the date picker stops promising free nights and the chat says it is not configured; every WhatsApp button still works. Setup is in `CALENDAR.md`. Tests: `node scripts/test-calendar-sync.mjs`.

## Status

Live, with the Airbnb sync running in both directions (checked 14 October 2026); the reviews section stays hidden until the listing has reviews.
