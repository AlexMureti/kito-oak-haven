"use client";

import { onBookingClick, plainHref } from "@/lib/booking";
import { site } from "@/lib/site";
import { Photo } from "./Photo";
import { Icon } from "./Icon";

const trust = [
  { icon: "lock", label: "Deposit holds the dates", note: "Balance on arrival" },
  { icon: "check", label: "Unit & caretaker details", note: "Sent before you travel" },
  { icon: "calendar", label: "Flexible dates", note: "Early and late check-out usually fine" },
];

export function Booking() {
  return (
    <section id="book" className="relative isolate overflow-hidden on-white grain">
      <div className="absolute inset-0 -z-10">
        <Photo
          slug="living-media"
          sizes="100vw"
          className="block h-full w-full"
          imgClassName="h-full w-full object-cover"
        />
        {/* Light ground (STORYBOARD v3). This was a flat 86% near-black over the
            photograph, which on the flipped theme left dark type on a dark field.
            A cream wash at the same strength keeps the room legible underneath
            while giving the copy a surface it can actually sit on. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(250,247,241,.94) 0%, rgba(250,247,241,.86) 45%, rgba(250,247,241,.94) 100%)",
          }}
        />
      </div>

      <div className="shell section relative text-center">
        <p className="eyebrow eyebrow-on-light reveal">Book direct</p>
        <h2 className="t-h2 balance reveal d1 mx-auto mt-5 max-w-3xl text-ink-900">
          Send us your dates.
          <br />
          <span className="gold-metal-ink">You&rsquo;ll hear back the same hour.</span>
        </h2>
        <p className="t-lead pretty reveal d2 mx-auto mt-7 max-w-xl text-ink-700">
          WhatsApp is genuinely the fastest way — messages land on a real phone,
          not a booking desk, and dates are held the same day. Typical reply is{" "}
          {site.replyTypical}, {site.replyHours}.
        </p>

        <div className="reveal d3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            className="btn btn-gold"
            href={plainHref("Hi! I'd like to book Kito Oak Haven. My dates are: ")}
            onClick={onBookingClick(
              { source: "booking-section" },
              (ref) => `Hi! I'd like to book Kito Oak Haven. My dates are: 

Ref: ${ref}`
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="whatsapp" className="h-4 w-4" />
            Message on WhatsApp
          </a>
          <a className="btn btn-ink" href={`tel:${site.phone.replace(/\s/g, "")}`}>
            Call {site.phone}
          </a>
        </div>

        {/* A signature, not a stray name — renders only when site.host is set. */}
        {site.host && (
          <p className="reveal d3 mt-8 font-display text-lg text-gold-700/90">
            <span className="t-small mr-2.5 uppercase tracking-[0.28em] text-ink-500">
              Hosted by
            </span>
            {site.host}
          </p>
        )}

        <ul className="reveal d4 mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          {trust.map((t) => (
            <li key={t.label} className="flex flex-col items-center">
              <Icon name={t.icon} className="h-5 w-5 text-gold-600" />
              <span className="t-small mt-3 text-ink-900">{t.label}</span>
              <span className="t-small mt-1 text-ink-500">{t.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
