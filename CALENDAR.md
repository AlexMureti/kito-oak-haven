# Calendar — how dates are held, and how collisions are stopped

Two channels sell the same apartment. Airbnb, run by the owner's team, and this
website. Neither knows about the other by default, and the failure that matters
is a guest arriving at an occupied flat and finding out at the door.

This is how that is prevented.

---

## How it works

Airbnb publishes every listing's booked nights as an iCal feed — one link,
generated once, that keeps working without anyone touching it again. A script
in the booking spreadsheet reads that feed every three hours and writes the
owner's held nights into the same sheet as the direct bookings.

Three hours is not arbitrary: Airbnb regenerates its own export on a three-hour
cycle, so reading faster returns identical bytes.

Both channels then sit in one place, and the sheet can answer the only question
that matters — **are these nights free?** — instead of anyone having to
remember to ask.

### The sheets

| Sheet | What it holds |
|---|---|
| `Bookings` | Direct enquiries from the website, and confirmed direct stays |
| `Calendar` | The owner's Airbnb nights, pulled from her feed |
| `Availability` | A rolling 90 days, one row per night, colour coded |
| `Sync log` | Every run, including the ones that did nothing |

`Availability` is the one to look at. White is free, warm grey is held on
Airbnb, green is a direct booking, **red is a collision.**

### Checking a date

In any cell:

```
=KITO_FREE("2026-09-10", "2026-09-14")
```

Answers `FREE — 4 nights`, or names what is holding the dates.

---

## Setup, once

1. **Get the export link.** In Airbnb: Calendar → Availability → Connect
   calendars → Export calendar. Copy the link.

2. **Store it.** In the Apps Script project: Project Settings → Script
   Properties → add `AIRBNB_ICAL_URL` with that link as the value.

   It goes there and not in the code because this repository is public, and
   that link lets anyone holding it read the owner's booking dates.

3. **Add the file.** Paste `scripts/apps-script-calendar.gs` as a second file
   in the same Apps Script project as `apps-script.gs`. They share globals; the
   calendar file reads the booking log the other one creates.

4. **Run `testAll()`** first. It proves the parser and the date logic without
   touching the network. It should log `All calendar tests passed.`

5. **Run `installTrigger()`**, then `syncAirbnbCalendar()`.

---

## The rules it follows

**A checkout day is still sellable.** One guest leaving on the 10th and another
arriving on the 10th share a date but not a night. Every comparison in the
script is half-open for this reason. Treating the checkout day as occupied
would silently refuse a night that is genuinely for sale, every single time a
stay ends.

**An enquiry does not hold dates.** Only rows whose Status reads `confirmed`,
`held`, `deposit paid` or `paid` block a night. Otherwise every person who ever
tapped the WhatsApp button would block dates they were never going to take.

**An empty feed is treated as a failure, not an empty calendar.** Airbnb's
export fails quietly, and sometimes answers `200` with an HTML error page. If
the feed ever parses to zero events, nothing is released and a warning goes in
the log. Trusting a blank response would clear the calendar and produce exactly
the double booking this exists to prevent.

**Nothing is ever deleted.** A booking that disappears from the feed is marked
`released`, not removed. The history of what was held when survives, which is
the record you want on the day somebody disputes a date.

**Alerts only fire on change.** An identical warning every three hours is one
people filter, and then the first real one is filtered too.

---

## What it does not do

It does not stop a booking being taken. It makes the collision visible and
emails when one appears — the confirmation is still a human decision, made in
WhatsApp.

It also cannot see a booking the owner's team takes outside Airbnb. If they
sell a stay over the phone and only block it on Airbnb afterwards, this sees it
whenever they do. If they never block it, nothing can see it. That is a
question about their process, not about this script.

---

## If it stops working

Read `Sync log`. Every run leaves a line and every failure says why.

The most likely cause is a regenerated export link — Airbnb invalidates the old
one, the feed starts answering with an error page, and the log will say
`Response was not a calendar`. Fix it by pasting the new link into
`AIRBNB_ICAL_URL`.

A silent failure is the only way this system hurts anyone, which is why every
run writes a line even when it changed nothing.
