"use client";

import { useEffect, useState } from "react";
import { Photo } from "./Photo";
import { site, heroFacts } from "@/lib/site";
import { Icon } from "./Icon";

// The cinematic pass through the home. A cross-fading still sequence rather
// than video: same walkthrough feel for ~250KB instead of a multi-MB MP4 on
// Kenyan mobile data, and the first frame is there instantly with no buffering.
const SEQUENCE = ["hero-bedroom", "living-wide", "balcony"] as const;
const HOLD = 5200;

export function Hero() {
  const [i, setI] = useState(0);
  // Gated in JS, not CSS. A `hidden` <video> still downloads, and the entire
  // reason the loop is desktop-only is to keep ~2MB off Kenyan mobile data.
  // Rendering it conditionally means the phone never requests the file at all.
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    setLoop(wide && !reduce);
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % SEQUENCE.length), HOLD);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="top"
      className="on-white grain relative isolate flex min-h-[100svh] flex-col justify-between overflow-hidden"
    >
      {/* The crops are wide by necessity (see scripts/build-photos.mjs), and a
          2:1 band inside a 390x844 phone viewport would object-cover down to a
          zoomed sliver. So the photograph is a band at the top on mobile and
          goes full-bleed behind the type only once the viewport is wide enough
          to carry it. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[38svh] md:inset-0 md:h-full">
        {SEQUENCE.map((slug, n) => (
          <div
            key={slug}
            aria-hidden={n !== i}
            className="absolute inset-0 transition-opacity duration-[2200ms]"
            style={{ opacity: n === i ? 1 : 0, transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
          >
            <Photo
              slug={slug}
              sizes="100vw"
              priority={n === 0}
              className="block h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
          </div>
        ))}
        {/* Desktop hero loop — 15s, silent, seamless, cut from the same
            6720x4480 frames so it is a downscale rather than an upscale. It
            layers over the still sequence, which stays underneath as the
            instant first paint and the mobile experience. */}
        {loop && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/hero/loop.mp4"
            poster="/hero/poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        )}

        {/* Scrim: keeps type legible over any frame and sets the photograph
            into the page in pine green instead of letting it float. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              // Light ground (STORYBOARD v3): the room stays bright. The wash only
            // thickens where type and buttons actually sit, so the photograph is
            // never a grey field with words on it.
            // Two washes, not one. The horizontal gives the type column an actual
            // ground so the logo, eyebrow and nav stop dissolving into the pale
            // curtain; the vertical only thickens under the buttons. The right
            // half of the room — bed, cushions, mirror — stays untouched.
            "linear-gradient(to right, rgba(250,247,241,.88) 0%, rgba(250,247,241,.58) 30%, rgba(250,247,241,0) 60%), " +
            "linear-gradient(to bottom, rgba(250,247,241,.22) 0%, rgba(250,247,241,.02) 24%, rgba(250,247,241,.14) 55%, rgba(250,247,241,.86) 100%)",
          }}
        />
      </div>

      <div className="shell flex flex-1 items-end pb-8 pt-[34svh] md:items-center md:pb-10 md:pt-32">
        <div className="max-w-3xl">
          <p className="eyebrow eyebrow-on-light reveal">
            {site.area} · {site.city}
          </p>

          <h1 className="t-display balance mt-4 text-ink-900 sm:mt-5">
            Your key to
            <br />
            <span className="gold-metal-ink">Kilimani</span>
          </h1>

          <p className="t-lead pretty mt-5 max-w-xl text-ink-700 reveal d1 sm:mt-7">
            A private one-bedroom on the seventh floor of {site.building} — heated
            pool, backup power that actually works, and Yaya Centre eight minutes
            down the road. Booked directly with the person who owns it.
          </p>

          <div className="reveal d2 mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
            <a
              className="btn btn-gold"
              href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
                "Hi! I'd like to check availability at Kito Oak Haven for these dates: "
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="whatsapp" className="h-4 w-4" />
              Check your dates
            </a>
            <a className="btn btn-ink" href="#walkthrough">
              Walk through it first
            </a>
          </div>

          <p className="t-small reveal d3 mt-5 text-ink-500">
            {site.directDiscountPct}% below Airbnb · replies in {site.replyTypical},{" "}
            {site.replyHours}
          </p>
        </div>
      </div>

      <div className="shell relative z-10 pb-8">
        <div className="rule mb-6 opacity-40">
          <i />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {heroFacts.map((f) => (
              <div key={f.label}>
                <dt className="t-h3 text-gold-600">{f.value}</dt>
                <dd className="t-small mt-0.5 uppercase tracking-[0.2em] text-ink-500">
                  {f.label}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center gap-2">
            {SEQUENCE.map((slug, n) => (
              <button
                key={slug}
                type="button"
                onClick={() => setI(n)}
                aria-label={`Show view ${n + 1} of ${SEQUENCE.length}`}
                aria-current={n === i}
                className="h-[3px] w-9 rounded-full transition-colors duration-500"
                style={{ background: n === i ? "var(--color-gold-400)" : "rgba(233,220,200,.24)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
