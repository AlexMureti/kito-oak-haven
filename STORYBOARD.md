# KITO OAK HAVEN — The Walkthrough
### Site script v3 · light direction · rebuilt against the 19 Aug shoot · 2026-08-19

**Supersedes v2 (26 Jul).** v2 was written for a dark, forest-green, "velvet room-shadow" treatment against the old KRC_85xx set. The 19 Aug shoot (64 frames, 6720×4480, no watermarks) is **high-key: white walls, pale wood, blue-grey textiles, terracotta and red accents, hard Nairobi daylight**. Dark cinema over these frames would read as a different building. The ground flips to light. Everything else in the film survives.

---

## THE ONE RULE: this must never look like an album

An amateur property site is **a stack of equal rectangles that fade in** — every image the same width, same corner radius, same reveal, caption underneath. That is the failure mode, and every decision below exists to break it.

**Four anti-slideshow laws, enforced per beat:**

1. **No two consecutive beats share a layout mechanic.** Full-bleed pin → inset duo → horizontal scrub → still portrait → split reveal. If two neighbours feel alike, one of them is wrong.
2. **Scale varies violently.** A 100vw frame is followed by a 38vw detail crop. The dining place-setting is *small and precise*; the balcony is *enormous*. Equal sizing is the tell of an album.
3. **Type interlocks with image, never sits beneath it.** Headlines overlap the frame edge, occupy negative space *inside* the photograph, or hold a column beside it. There is not one caption-under-photo on this site.
4. **Portraits stay portrait.** Twenty of the 64 frames are 4480×6720. They are used tall and narrow against white space — never letterboxed into a landscape slot. The orientation change *is* the rhythm.

**The brand, restated for light ground:** antique gold and forest green become **structure, not atmosphere** — section numerals, hairline rules, the fluted-K vertical details, the acorn signature, and every interactive element. Gold still behaves like metal, still catches a slow sheen, and still appears *only* where something is clickable, so it never stops meaning "touch this." Green anchors type and rules. The photography carries the light.

---

## BEAT 0 — THE TRAILER (Hero)

**FRAME:** `8582` — bed, chandelier, "My favourite place" sign, blown-out window light. The brightest frame in the set; it establishes the ground.
**LAYOUT:** Full-bleed, 100vh. Image held at 1.06 scale drifting to 1.0 over 8s — Ken Burns, CSS only. No video weight on Kenyan mobile data.
**MOVE:** No scroll dependency. The logo mark resolves in gold. One line fades up. A slim gold thread pulses once at the base.
**WORDS:** "Your key to Kilimani." — sub: "A private one-bedroom above George Padmore Road. Book direct, stay better."
**CRAFT:** White scrim at 12%, lower third only — enough for type contrast, never a grey wash over the room. Gold takes an 8° sheen sweep every ~9s.
**MOBILE:** Same frame, focal point pinned to the bed, no drift.

## BEAT 1 — THE DOOR (Arrival)

**FRAME:** `8575` — entry door, dark wood dining round, terracotta chairs, sculptural mirror.
**LAYOUT:** **Pinned, one viewport.** Frame inset to 82vw with a generous white margin — the beat after a full-bleed hero must not be another full-bleed.
**MOVE:** On scroll the frame eases 1.0 → 1.07 and pans 2% right: the sensation of stepping in. A single gold glint animates once on the lock.
**WORDS:** Set in the white margin **to the left of the frame**, vertically centred — a column, not a caption. "No keys. No waiting. Your own code, from the moment you land."
**CRAFT:** Numeral **01** in the fluted serif, gold hairline, in the margin above the text.

## BEAT 2 — THE LIGHT (Living room)

**FRAMES:** `8596` (wide, both sofas, coffee table) → `8593` (closer, red pillows, framed trio).
**LAYOUT:** **Inset duo, offset.** 8596 large and left; 8593 smaller, *overlapping its lower-right corner* by ~8%. A deliberate collision — magazines do this, albums never do.
**MOVE:** Crossfade on scroll between standing and seated eye-lines. Text drifts 0.9×, images 1.05×.
**WORDS:** "Sink in. The afternoon does its thing through sheer linen." Amenity tags float up and hold: *Smart TV · Soundbar · Fiber Wi-Fi*.
**CRAFT:** Terracotta enters here — a rule under the section title, keyed to the red pillows.

## BEAT 3 — GATHER (Dining + Kitchen) — the horizontal moment

**FRAMES:** `8576` (dining wide) → `8607` (sculptural mirror, close) → `8604` (place setting, pampas, wine glass) → `8610` (kitchen).
**LAYOUT:** **Horizontal scroll-scrub strip** — the one lateral move on the site, like turning your head at the table. The frames are deliberately unequal: wide, tall detail, small square, wide.
**WORDS:** "Cook properly. Host quietly. The kitchen isn't a prop." Tags: *Gas cooktop · Air fryer · Blender · Coffee · Purified water*.
**CRAFT:** The place-setting frame gets gallery lighting — a warm-white spotlight gradient. **Acorn №1** hides in this section's corner ornament.

## BEAT 4 — REST (Bedroom) — the exhale

**FRAME:** `8570` — bed, vanity, round mirror, grey rug. Chosen over 8569 and 8571 for the cleanest centre.
**LAYOUT:** **Still. Centred. Enormous white margin.** No pin, no parallax, no crossfade. After a horizontal scrub, stillness is the effect.
**MOVE:** Lenis lerp eases; the frame rises 24px into place and stops.
**WORDS:** "The bed you'll mention in your review." — *King · Hotel-grade cotton · Blackout drapes*.
**CRAFT:** Leading opens two steps. This section is engineered to run slower than any other.

## BEAT 5 — RESET (Bathroom)

**FRAME:** `8592` — rainfall shower, glass, window. **Portrait, used tall.**
**LAYOUT:** **Split.** The image occupies the right 42% at full bleed to the viewport edge; type holds the left in white. Asymmetry immediately after a centred beat.
**WORDS:** "Rainfall pressure. Hot, always — the building's generator has your back in fifteen seconds."
**CRAFT:** Fine vertical gold rules on the type side. The K's flutes again.

## BEAT 6 — ABOVE THE CITY (Balcony) — the reveal

**FRAMES:** `8578` (bench, fruit bowl, skyline), with `8587` (balcony door, curtains) as the approach.
**LAYOUT:** Starts **cropped tight** on the railing at 60vw and **opens to 100vw full bleed** as you scroll. The morning-coffee reveal.
**MOVE:** Scale 1.15 → 1.0 as the crop widens; the sky gains 8% dynamic range on the way.
**WORDS:** "Seventh-floor mornings. Kilimani at your feet."
**CRAFT:** The one beat allowed true daylight blue at full saturation. It resets the eye before the closing act.

## BEAT 7 — THE BUILDING (Gym) — the underplayed asset

**FRAMES:** `8631` / `8633` / `8628` — three gym angles, real equipment, natural light.
**LAYOUT:** Three-card stagger-rise, each card front-loaded with the **benefit**, spec in small type beneath.
**WORDS:** "A gym you'd actually use." Not "fitted fitness centre."
**POOL:** No frame exists. The pool stays a **typographic claim only** until she sends one — never an empty card, never a stock photo. *(Open item for Alex.)*

## BEAT 8 — THE VIEW FROM BED

**FRAMES:** `8585` / `8586` — bed with the city through the window.
**LAYOUT:** Full bleed, type set into the frame's own negative space (the wall, upper left).
**WORDS:** "Wake up over the city." The emotional close, immediately before the commercial section.

## BEATS 9–12 — DIRECT · ASSURANCES · KILIMANI · BOOK

Unchanged from v2 in intent, now on light ground, with the **savings calculator** as the spine: the guest enters their own Airbnb quote, sees the direct price and the saving, and the WhatsApp deep link arrives prefilled with those figures. Ships correct without a nightly rate ever being set.

---

## FRAMES THAT MUST NEVER APPEAR

`8615` `8616` `8617` `8623` `8625` — laundry beside a gas cylinder, water heater on a bare wall, exposed plumbing. Airbnb compliance documentation, not marketing.

Also cut: four duplicate living-room-TV frames, and two of the three near-identical bedroom wides.

**Used: roughly 22 of 64.** That restraint is the difference between a site and an album.
