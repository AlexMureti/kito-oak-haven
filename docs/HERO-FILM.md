# Kito hero film — shot list and Flow prompts

Six shots, built to Google's own Veo 3.1 prompt structure, each seeded from a
crop that already exists in `public/gallery/`. The footage comes out of Kito's
own rooms, so nothing here depends on media Alex cannot claim.

Structure used throughout, from Google's prompting guide (not a blog's summary
of it): **[Cinematography] + [Subject] + [Action] + [Context] + [Style &
Ambiance]**.

Two rules from that guide that change the output more than anything else:

- **Motivate the move.** "Dolly in" gives you a generic push. "Dolly in past
  the foot of the bed until the skyline resolves through the glass" gives you
  the shot. The camera needs a reason.
- **Never phrase a negative as a negation.** Not "no people" — Veo will often
  put people in. Say "an empty corridor". Describe the frame you want.

Settings for every shot: **16:9**, **6 seconds**, **audio off**. A hero that
autoplays with sound is a reason to close the tab.

---

## The sequence

Arrive, settle, rest, rise, hold, let go. Six shots, thirty-six seconds, loops
back to the first. No cut shorter than 2.5s — the building is calm and the film
should be too.

---

### 1 · Arrival — seed `arrival-door`

> Slow dolly-in at eye level, 35mm lens, shallow depth of field. A dark timber
> apartment door with a brushed-steel keypad lock. The keypad wakes and glows
> faintly as the camera settles a metre from the handle. An empty seventh-floor
> corridor behind it, warm downlights receding along a polished floor. Warm
> low-contrast grade, early evening, patient and cinematic.

*Why it opens:* the promise of the whole listing is that you walk in at 2am and
nobody hands you anything. Lead with the thing you actually sell.

---

### 2 · The room — seed `living-wide`

> Slow lateral dolly moving left, 24mm wide lens, deep focus. A pale linen sofa
> and a low walnut table. Late-afternoon light travels across the floor while
> sheer curtains breathe against the glass. A bright open living room with city
> light beyond the window. Warm neutral grade, soft natural daylight, unhurried.

*Why second:* this is the frame that sells the stay. Give it room and no cuts.

---

### 3 · Rest — seed `bed-city`

> Slow dolly-in past the foot of the bed toward the window, 35mm lens, shallow
> depth of field. A made bed in white cotton. The camera glides past it and the
> Nairobi skyline resolves through the glass. A quiet bedroom at golden hour,
> blackout drapes drawn back. Warm amber grade, long shadows, still and intimate.

*The strongest frame in the whole set.* If only one shot gets rendered, this one.

---

### 4 · Above the city — seed `balcony`

> Slow crane rise, 28mm lens, deep focus. A private balcony with a slim steel
> rail. The camera lifts and the Kilimani skyline opens out beneath the rail.
> Seventh floor at low sun, distant rooftops and trees. Warm golden grade, hazy
> air, expansive.

*Why a crane:* it is the only move that states "seventh floor" without a caption.

---

### 5 · The pool — seed `pool`

> Static locked-off wide shot, 24mm lens, deep focus. A still indoor swimming
> pool lit from beneath the surface. The water holds almost motionless while a
> single slow ripple crosses it. A quiet heated pool room, tiled surround, glass
> wall along one side. Cool teal-green water against warm lamplight, calm.

*Why it holds still:* five moving shots in a row is a showreel. One motionless
frame in the middle is what makes the others read as deliberate. It is also the
amenity most Kilimani listings cannot show at all.

---

### 6 · And then — seed `bed-city-alt`

> Very slow push toward the window, 50mm lens, shallow depth of field. The city
> beyond the bedroom glass. The skyline settles as the last daylight goes and
> lights begin in the towers. Dusk over Nairobi. Deep blue and amber grade,
> restful, final.

*Why it ends here:* it rhymes with shot 3 from the opposite time of day, so the
loop back to the door reads as a night passing rather than a video restarting.

---

## Two Flow features worth using

**First-and-last-frame.** Where two crops show the same room, hand Veo both and
let it generate the move between them instead of inventing one. Pairs that work:

| Start | End | Gives you |
|---|---|---|
| `bed-city` | `bed-city-alt` | Shot 3 into shot 6 as one continuous dusk |
| `balcony-door` | `balcony` | A genuine step-through onto the balcony |
| `entry-through` | `living-wide` | The walk-in, which no single still can show |

**Ingredients-to-video.** Feed the same two or three reference crops on every
generation. It is what keeps six separately-generated shots looking like one
apartment instead of six apartments. Without it the grade and the wood tone
drift between shots and the film reads as stock.

---

## One seed is weaker than the others

Checked on disk, 3 Sep: seven of the eight crops named above exist at **2400px**.
`pool` exists at **1000px** — it came off WhatsApp rather than the camera. Veo
will upscale it and the softness will show against six sharp shots.

Two options, in order of preference: reshoot the pool on a phone in daylight,
which takes five minutes and is the better answer; or keep it as the locked-off
static shot, where an absence of camera movement hides softness far better than
a push-in would. The static framing in shot 5 was chosen for rhythm, but it
also happens to be the most forgiving thing to do with the weakest source.

---

## Grade note

Everything above says *warm*. That is not taste, it is brand: the mark is
antique gold, and gold only reads as metal against a warm ground. A cool or
neutral grade will fight the logo in every frame it sits over. The pool is the
one deliberate exception — cool water against warm lamplight is the contrast
that makes it look heated rather than municipal.

---

## On OpenMontage

Alex raised it. I read what it installs rather than guessing, so here is the
straight answer.

**What it is:** a real project — Python plus Node, AGPLv3, twelve production
pipelines, and it drives Remotion underneath. `make setup` clones, creates a
venv, installs `requirements.txt`, runs `npm install` in `remotion-composer/`,
and adds Piper TTS. It ships `CLAUDE.md` and several hundred skill files that an
agent reads to orchestrate the work. It does not install a daemon and it does
not inject hooks by itself. It runs without any API key and optionally talks to
sixty-odd providers including Veo and Kling.

**The real risks, in order:**

1. `make setup` executes shell scripts and installs arbitrary Python and npm
   packages on the machine that holds client National IDs and live lender keys.
   That is the specific thing `STANDARD.md` forbids without reading every script
   first, and "reading every script" here means several hundred files.
2. **Two repositories carry this name** — `Open-Montage/OpenMontage` and
   `calesthio/OpenMontage`. Tens of thousands of stars inside days. Stars are
   gameable, and installing the wrong one of two identically-named repos is how
   supply-chain attacks land.
3. Its skill files enter an agent's context by design. That is a large amount of
   third-party instruction on a machine with production credentials on it.

**And the part that settles it: it is the wrong tool for this job anyway.** Its
strength is assembling documentary montages from Archive.org, NASA, Pexels and
Wikimedia — stock footage, ranked and cut automatically. Kito does not need
stock footage. It needs six shots of one apartment that Alex already owns
photographs of. The half of OpenMontage that would actually help is the Remotion
composer, and `remotion/` is already installed in this repo with a `HeroLoop`
composition written.

Verdict: interesting, not obviously malicious, **not worth the exposure for
this.** Revisit it on a machine that does not hold client data.

---

## What I did not verify

I did not run OpenMontage and I did not read its scripts line by line — the
assessment above is from its own documentation and repository description. I
also could not view any reference site directly: the browser pane navigated but
every screenshot and page read returned a policy error for the whole session,
so the design research behind this is sourced and attributed rather than seen.
