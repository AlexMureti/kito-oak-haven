"use client";

import { useState } from "react";
import { site } from "@/lib/site";
import { Icon } from "./Icon";

/**
 * The conversion spine: prove the saving instead of asserting it.
 *
 * The guest already has an Airbnb quote open in another tab — that is the
 * number they trust. So the calculator takes THEIR quote as the input and does
 * the arithmetic in front of them. It also means this ships without waiting on
 * a nightly rate, and stays correct when the rate changes.
 */
const fmt = (n: number) => n.toLocaleString("en-KE", { maximumFractionDigits: 0 });

export function Direct() {
  const [quote, setQuote] = useState(9500);
  const [nights, setNights] = useState(4);

  // The direct price is the OWNER'S RATE, not a percentage of whatever the
  // guest types. The old logic quoted 85% of their input, so someone entering
  // 20,000 was told 17,000/night for a 7,000 apartment — the page inventing a
  // price it had no authority to offer. Now the rate is fixed and the guest's
  // quote only determines what THEY save, which is true by construction.
  const directNight = site.nightlyKsh ?? Math.round((quote * (100 - site.directDiscountPct)) / 100);
  const airbnbTotal = quote * nights;
  const directTotal = directNight * nights;
  const saving = Math.max(0, airbnbTotal - directTotal);

  return (
    <section id="direct" className="on-cream section grain relative overflow-hidden">
      <div className="shell relative">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <div>
            <p className="eyebrow eyebrow-on-light reveal">Why book direct</p>
            <h2 className="t-h2 balance reveal d1 mt-5 text-ink-900">
              Same apartment. Same host.
              <br />
              <span className="gold-metal-ink">
                {site.currency} {fmt(site.nightlyKsh ?? 0)} a night.
              </span>
            </h2>
            <p className="t-lead pretty reveal d2 mt-7 text-ink-700">
              That is the rate, direct, with nothing added at checkout. What a
              booking platform charges on top is its host commission and guest
              service fee — money that goes to the platform rather than into the
              apartment. Book here and it simply is not charged.
            </p>

            <ul className="reveal d3 mt-9 space-y-4">
              {[
                "You pay a deposit to hold the dates, not the full stay upfront.",
                "Building, unit number and the caretaker's phone before you travel.",
                "The balance is settled on arrival, once you are inside and satisfied.",
                "M-Pesa. You are dealing with a person, not a support queue.",
              ].map((line) => (
                <li key={line} className="t-body flex gap-3.5 text-ink-700">
                  <Icon name="check" className="mt-1 h-4 w-4 flex-none text-gold-600" />
                  <span className="pretty">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The calculator */}
          <div className="reveal d2">
            <div
              className="rounded-sm border border-gold-500/25 p-7 sm:p-9"
              style={{ background: "rgba(255,255,255,.86)", backdropFilter: "blur(6px)" }}
            >
              <p className="eyebrow eyebrow-on-light">Do the arithmetic</p>
              <h3 className="t-h3 mt-3 text-ink-900">
                What is Airbnb quoting you?
              </h3>
              <p className="t-small mt-2 text-ink-500">
                Enter their nightly figure for your dates. Nothing is sent anywhere —
                this runs in your browser.
              </p>

              <label className="mt-7 block">
                <span className="t-small uppercase tracking-[0.18em] text-ink-500">
                  Airbnb nightly rate ({site.currency})
                </span>
                <input
                  type="number"
                  min={1000}
                  max={100000}
                  step={100}
                  value={quote}
                  onChange={(e) => setQuote(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-2 w-full rounded-sm border border-gold-500/30 bg-white/70 px-4 py-3 font-display text-2xl text-gold-700 outline-none focus:border-gold-400"
                />
              </label>

              <label className="mt-6 block">
                <span className="t-small flex items-baseline justify-between uppercase tracking-[0.18em] text-ink-500">
                  <span>Nights</span>
                  <span className="font-display text-xl normal-case tracking-normal text-gold-700">
                    {nights}
                  </span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--color-gold-400)]"
                />
              </label>

              <dl className="mt-8 space-y-3 border-t border-gold-500/20 pt-7">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="t-small text-ink-500">
                    On Airbnb, {nights} {nights === 1 ? "night" : "nights"}
                  </dt>
                  <dd className="t-body text-ink-700 line-through decoration-terracotta-500/70">
                    {site.currency} {fmt(airbnbTotal)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="t-small text-ink-500">
                    Direct ({site.currency} {fmt(directNight)}/night)
                  </dt>
                  <dd className="font-display text-3xl text-ink-900">
                    {site.currency} {fmt(directTotal)}
                  </dd>
                </div>
              </dl>

              <div
                className="mt-7 flex items-baseline justify-between gap-4 rounded-sm px-5 py-4"
                style={{ background: "color-mix(in srgb, var(--color-gold-500) 14%, transparent)" }}
              >
                <span className="t-small uppercase tracking-[0.18em] text-gold-700">
                  You keep
                </span>
                <span className="gold-metal-ink font-display text-3xl">
                  {site.currency} {fmt(saving)}
                </span>
              </div>

              <a
                className="btn btn-gold mt-7 w-full"
                href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
                  `Hi! I would like to book Kito Oak Haven for ${nights} ${
                    nights === 1 ? "night" : "nights"
                  }. Airbnb quoted me ${site.currency} ${fmt(quote)} a night. Are these dates available?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="whatsapp" className="h-4 w-4" />
                Send this to the host
              </a>
              <p className="t-small mt-3 text-center text-ink-500">
                Opens WhatsApp with the figures filled in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
