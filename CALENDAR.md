# Calendar: how the site and Airbnb stay in step

Two channels sell the same apartment: the owner's Airbnb listing, run by her team, and this
website, where every stay is confirmed by hand on WhatsApp. Neither knows about the other by
default. The failure that matters is a guest arriving at an occupied flat and finding out at
the door.

Since 26 Sep 2026 the two are joined both ways. This replaces the Apps Script design that
used to be described here (see "History" at the end).

---

## How it works

```
 Airbnb export feed ─┐                                ┌─> the date picker on the site
                     ├─> /api/availability ───────────┤   (taken nights, "free on both")
 Direct-bookings tab ┤                                │
 (booking sheet)     └─> /direct-bookings.ics ──────────> the owner's Airbnb imports it
```

**Airbnb to the site.** `/api/availability` reads two things: the owner's Airbnb export feed
(`AIRBNB_ICAL_URL`), and a published tab of the booking sheet that holds the dates of confirmed
direct stays (`DIRECT_HOLDS_CSV_URL`). It returns four things and nothing else:

- the taken nights, as dates
- a `status`
- `checkedAt`, the time of the check
- `sources`, how each of the two reads went

| `status` | Meaning | What a guest sees under the calendar | A picked stay says |
|---|---|---|---|
| `live` | Both calendars were read | Taken nights marked. "Live from both calendars · checked 4 min ago" | **"Free on both calendars."** |
| `partial` | Only one was read | Known taken nights marked. "Some bookings may not show · checked 4 min ago" | "We'll confirm these are free when you message." |
| `unknown` | Neither was read | Nights drawn neutral, not as free. "Calendar offline · we'll confirm by message" | "We'll confirm these are free when you message." |

The picker only makes the "free" promise when the check is `live` **and** less than six hours
old.

In the picker:

- A taken night is drawn as fluting, with its number struck through.
- Tapping a taken night says so and offers the next free night as the arrival, in one tap.
- A stay stretched across a taken night turns those nights terracotta. It offers the nearest
  stretch of the same length that is free, again in one tap.

**The site to Airbnb.** `/direct-bookings.ics` publishes the confirmed direct stays as a
calendar. The owner's Airbnb imports it and blocks those nights. Airbnb re-reads an imported
calendar **every 3 hours**, and sooner if someone presses **Refresh** on it (Airbnb Help
Center, article 99, checked 26 Sep 2026).

The code is `src/lib/calendar-sync.ts`. The tests are `node scripts/test-calendar-sync.mjs`.

---

## Setup, once

### 1. The Airbnb export link, into Vercel

The owner already sent this link on 26 Sep 2026: her listing's own calendar link, ending in
`.ics?t=…`. Airbnb keeps it in the same Availability → Connect calendars section as the
import. I did not verify the exact export wording on a live host account.

Put it in Vercel → the project → Settings → Environment Variables:

| Name | `AIRBNB_ICAL_URL` |
|---|---|
| Value | the export link |
| Environments | Production and Preview |
| Sensitive | on |

**It never goes in this repository.** The repo is public, and the link lets anyone holding
it read the owner's booking dates.

### 2. The direct-bookings tab, published

First, set the sheet's locale to a day-first one: File → Settings → Locale → United Kingdom.
A date typed by hand as 03/10/2026 is then 3 October, not 10 March. Better still, type dates
as 2026-10-03, which no locale can misread. The site's own rows already arrive that way.

Then add a tab called `Direct holds`. In A1 and B1, paste these. They write the header only
while the formula below is in A2. If someone clears A2, the header disappears and the site
refuses the tab, instead of reading it as "no bookings":

```
=IF(ISFORMULA(A2),"check_in","")
=IF(ISFORMULA(A2),"check_out","")
```

In A2, paste:

```
=ARRAYFORMULA(IFNA(FILTER({IF(Bookings!I2:I="","MISSING",TEXT(Bookings!I2:I,"yyyy-mm-dd")),IF(Bookings!J2:J="","MISSING",TEXT(Bookings!J2:J,"yyyy-mm-dd"))},REGEXMATCH(LOWER(TRIM(Bookings!L2:L)),"^(confirmed|held|deposit paid|paid)$")),""))
```

That lists the check-in and check-out of every row in `Bookings` whose Status is
`confirmed`, `held`, `deposit paid` or `paid`. Columns I, J and L are Check-in, Check-out and
Status, as the booking log lays them out (`HEADERS` in `scripts/apps-script/Code.js`).

Three details in that formula are deliberate:

- **`IFNA`, not `IFERROR`.** `IFNA` only turns FILTER's "no matches" into a blank. Any other
  error, such as a deleted column, shows as an error, and the site refuses it. `IFERROR`
  would hide it as "no bookings".
- **`MISSING`.** A confirmed row with a blank date writes `MISSING`, which the site refuses.
  Dropping that row instead would quietly release its nights.
- **The header row.** The site refuses the tab unless its first line is
  `check_in,check_out`, and A1 and B1 write that only while A2 holds the formula. A blank tab,
  a cleared formula or the wrong tab published is therefore never read as "no bookings".

These formulas have not been run in Google Sheets from here. Step 4 below is the test that
proves they work, end to end, before anyone relies on them.

A dropdown on the Status column (Data → Data validation, a list of `enquiry, confirmed, held,
deposit paid, paid`) stops a typo, such as `confrimed`, from silently holding nothing.

Then publish **only this tab**: File → Share → Publish to web → choose `Direct holds`, not
"Entire document" → Comma-separated values (.csv) → Publish. Put that link in Vercel as
`DIRECT_HOLDS_CSV_URL` (Production and Preview).

Only this tab is ever public, and it holds dates only. The `Bookings` sheet, with names and
numbers, stays private.

### 3. Redeploy

Vercel reads environment variables when it builds: Deployments → the latest → Redeploy.

### 4. Prove the direct feed before anyone imports it

Do this before step 5. Once the owner has imported the feed, a test row would block a real
night on her Airbnb.

1. In `Bookings`, add a row a few months out: Check-in `2027-01-10`, Check-out
   `2027-01-12`, Status `confirmed`.
2. Wait about five minutes for Google to republish the tab. Google's timing is not
   guaranteed.
3. In PowerShell, run this. Use `curl.exe`: plain `curl` is a different command in Windows
   PowerShell.

   ```
   curl.exe https://kito-oak-haven.vercel.app/direct-bookings.ics
   ```

   The output should contain `DTSTART;VALUE=DATE:20270110`. Opening the link in a browser
   downloads a file instead of showing it. Don't double-click that file: a calendar app may
   offer to import the test booking.
4. Not there? Wait five more minutes and run it again before suspecting step 2. The feed is
   also cached for up to a minute.
5. Delete the row.

Still empty after ten minutes, or a `503`, means step 2 of the setup is not right yet.
Skipping this check is how a feed that silently reads nothing would go unnoticed.

### 5. The owner imports the site's calendar

In her Airbnb: Calendar → the listing → Availability → under Connect calendars, "Connect to
another website". Paste this URL into the calendar address field:

```
https://kito-oak-haven.vercel.app/direct-bookings.ics
```

Name it `Kito direct bookings` and press **Add calendar**. These are the steps on airbnb.com,
quoted from Airbnb Help Center article 99 on 27 Sep 2026. The app's steps could not be read
that day. Airbnb has no "import" button: an earlier version of this file said there was, from
memory, and it was wrong.

---

## Checking it works

```
curl.exe https://kito-oak-haven.vercel.app/api/availability
```

`"status":"live"` with `"sources":{"airbnb":"ok","direct":"ok"}` is the goal. Each source
reports one of these:

| Source says | Means | Fix |
|---|---|---|
| `ok` | Read and trusted | — |
| `not-configured` | The environment variable is missing | Step 1 or 2, then redeploy |
| `unreachable` | No answer, or an HTTP error | The link is wrong, or the tab is unpublished |
| `not-a-calendar` | Airbnb answered with something that is not a whole calendar | The export link was regenerated. Paste the new one |
| `bad-data` | The tab is not what the site expects | Most likely the tab was published as a web page instead of CSV, or the wrong tab or a blank one was published (the first line must be `check_in,check_out`). Otherwise, look for `MISSING`, a formula error, a date that isn't real, or a check-out on or before its check-in |

`/direct-bookings.ics` answers **503** while the direct tab is unreadable. It deliberately
does not send an empty calendar. Empty would tell Airbnb that every direct booking is gone,
and Airbnb would put those nights back on sale.

---

## The rules it follows

**Only dates leave.** Airbnb's export can carry reservation details in each event's
description. The parser reads DTSTART, DTEND and STATUS only, so nothing else can be passed
on. The browser never sees either link.

**A failure is never an empty calendar.** These are treated as failures, never as "no
bookings":

- an HTML error page (Airbnb answers a dead link with one, and a 200)
- a feed cut off mid-download
- an event with an unreadable date

A failure makes the status `partial` or `unknown`, and the picker stops promising. It does
not release nights.

**An empty but valid calendar is an answer. A blank one is not.** A brand-new listing has no
bookings, and "checked, nothing booked" still says free. But "valid" means a whole
`BEGIN:VCALENDAR … END:VCALENDAR`, or the tab's `check_in,check_out` header with nothing
under it. A blank body is never read as "no bookings".

**An enquiry holds nothing.** Only the four statuses above hold a night. Otherwise every tap
of the WhatsApp button would close one.

**A checkout day is still sellable.** Every comparison is half-open. One guest leaving on
the 10th and another arriving on the 10th share a date but not a night.

---

## What it does not do

- **The three-hour gap.** A direct stay confirmed now can still be sold on Airbnb until
  Airbnb next re-reads the site's calendar: up to about three hours. Every iCal-based sync has
  this gap. For a same-day confirmation, mark the row confirmed, then run
  `curl.exe https://kito-oak-haven.vercel.app/direct-bookings.ics` until the stay shows (Google
  republishes in about five minutes). Only then press Refresh on the connected calendar in
  her Airbnb. A Refresh pressed earlier fetches the old copy, and Airbnb does not look again
  for three hours. Or have her team block the nights by hand.
- **Nights sold off both channels.** Nights her team sells by phone are invisible here until
  they are blocked on Airbnb. That is a question about their process, not this code.
- **Her own settings.** Blocks she sets on Airbnb (how far ahead she opens, nights she closes)
  arrive as taken nights. That is deliberate: they are her decisions.

---

## History

Until 26 Sep 2026 this file described an Apps Script (kept, for its reasoning, at
`scripts/superseded/apps-script-Calendar.js`, out of the folder `clasp push` uploads) that
pulled the Airbnb feed into the booking sheet every three hours. It was never switched
on. Apps Script must be granted permission before it may fetch anything from outside Google,
and that prompt never appeared (commit `7be40c2`, which moved the chat to Vercel for the
same reason). The rules above are carried over from it, and its tests became
`scripts/test-calendar-sync.mjs`.
