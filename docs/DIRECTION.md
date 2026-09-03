# Kito — creative direction

Written 3 September 2026, after Alex said the work reads as safe and that a
demo page is not what wins this.

---

## The reframe that matters more than any of the design notes

**I built a page *about* the booking system. It should be the booking widget
*on* the site.**

Everything so far asks Sylvia to read a document and then reply. She does not
reply. She has a group of people specifically so she does not have to. She
calls. So the deliverable is not a page she studies — it is
`kito-oak-haven.vercel.app` opening on her phone with a live availability
calendar in it, while Alex is on the phone with her.

That is the difference between showing someone a project and showing them a
product, and it is the whole gap he keeps pointing at.

### It also dissolves the Airbnb-link problem

The last two rounds went into helping a stranger on a WhatsApp group find one
menu item. That was solving the wrong end.

She already offered the real answer: *"if she can manage to see how I was
handling bookings she could add me to the group."* **Ask for access on the
call.** With access, Alex opens Airbnb, clicks Export, and copies the link
himself in thirty seconds — no explaining, no relay, no chance of the wrong
listing. The link checker built on 3 Sep stays as a fallback for the case
where access is refused; it is not the plan.

---

## What is actually winning right now

Researched 3 September 2026, sources named so this can be re-checked rather
than believed.

| Technique | Source |
|---|---|
| **Film grain / CSS noise for tactile depth**, explicitly chosen over heavy WebGL to avoid processor lag | Fireart, *Web Design Trends 2026* |
| **Editorial typography as the primary architectural element** — oversized, viewport-scaled, reacting to scroll | Figma, Tilda, Fireart, all three independently |
| **Full-screen imagery with location-based storytelling**, reading as a lifestyle brand rather than a hotel | The Hoxton, via Mediaboom's 2026 teardown |
| **Restrained palette, clean type, clearly separated sections** | The Ned London, same source |
| **Magazine layout, editorial photography, subtle scroll interaction** | Casa Cook, same source |
| **High-contrast availability CTA above the fold, sticky, worded "Check Availability", embedded so it does not feel like a third-party tool** | Mediaboom; corroborated by PriceLabs' 2026 direct-booking guide |
| Every extra second of load costs about **7% of conversions**; LCP under 2.5s, INP under 200ms, CLS under 0.1 | PriceLabs, *Hotel Direct Booking Websites: 12 Best Practices for 2026* |
| Average hotel site converts **2.2–3.9%**; strong boutique properties clear **5%** | BookBetterDirect benchmarks, 2026 |
| Scarcity messaging works **only when true** — false urgency damages trust permanently | PriceLabs |

Three of those are already Kito's instincts. The site has a restrained palette,
real editorial type in Cormorant, and honest scarcity (none, because none is
true). What it does not have is **motion, grain, and a live availability
control** — and those are exactly the three that make a page feel expensive.

---

## The hero has to move

Every site in that list opens with motion. Kito opens with a cross-fade of
stills, which was the right call when the argument was about Kenyan mobile
data, and is the wrong call now that it is the first thing a client judges.

**The free path is already installed.** `remotion/` has `node_modules`, a
`HeroLoop` composition, and `Reel.tsx`. It renders locally from the crops
already in `public/gallery/`. No credits, no subscription, and the media is
derived from the property's own photography rather than anything scraped.

### Shot list, from crops that exist on disk

Slow push-ins, no cuts faster than 2.5s. The building is calm; the film should
be too.

| # | Crop | Move | Why it is in |
|---|---|---|---|
| 1 | `arrival-door` | Slow push toward the handle | Opens on arrival, which is the promise |
| 2 | `living-wide` | Drift left, light blooming | The room that sells the stay |
| 3 | `bed-city` | Push past the bed to the window | The single strongest frame in the set |
| 4 | `balcony` | Rise, city coming up under the rail | Seventh floor, stated visually |
| 5 | `pool` | Hold, near-still, faint ripple | The amenity most Kilimani listings cannot show |
| 6 | `bed-city-alt` | Settle, hold on the skyline | Lands where it started: rest |

Grade warm and low-contrast so the gold reads as metal against it. **Silent** —
sound on a hero that autoplays is a reason to close the tab.

### If credits ever exist

An image-to-video model (Kling v3.0, Seedance 2.5, Cinema Studio) takes a start
frame and animates it, so the same six crops become genuine camera moves rather
than Ken Burns pans. Checked 3 Sep: balance is **0 credits, free plan.** Not a
recommendation to spend — recorded so the option is known, not so it is bought.

---

## Two cheap things that read as expensive

**Grain.** A single tiled noise layer at low opacity over the pine sections.
Named in the 2026 research as the current way to get tactile depth without the
lag of WebGL. On a brand whose mark is struck foil, grain is not decoration —
it is the paper the foil is stamped into. Costs one PNG and one CSS rule.

**Type that behaves like a magazine, not a website.** Cormorant is already the
right face and is being used politely. The research is unanimous that oversized
viewport-scaled headlines reacting to scroll are the defining move of the year.
The walkthrough beats are where this belongs — not the hero, which already has
the film.

---

## What I could not do, stated plainly

- **I did not look at any of these sites.** The browser pane navigated but every
  read and screenshot returned "Policy check temporarily unavailable" for the
  whole session. Everything above is from written sources with the source
  named, not from seeing the work. That is a real limit on this document and it
  should be re-done when the pane works.
- **I did not generate any media.** Balance is zero.
- **The mobile layout of the booking page is still unverified on a real phone**,
  for the same browser reason.

---

## Order of work

1. Call Sylvia. Show the site. Ask for team access, not for a link.
2. Render the hero film from the existing crops. Ship it silent, poster
   fallback, ≤5MB.
3. Move the availability calendar out of the demo page and into the site as
   the booking control, with the WhatsApp message prefilled with dates that
   are already known free.
4. Grain, then the type pass on the walkthrough.
