// ============================================================
// Booking attribution.
//
// WHAT THIS IS FOR: the commission is KSh 1,000 per night on guests who
// come from this website. The owner takes payment on her own M-Pesa, which
// no third party can read — there is no API for a personal number. So the
// only thing that can prove a booking originated here is a reference the
// guest carries into the WhatsApp conversation.
//
// HOW IT WORKS: every booking CTA mints a short reference, logs it, and
// embeds it in the prefilled WhatsApp message. When the guest sends that
// message the reference arrives in the chat, and it matches a row in the
// sheet. Attribution is proven without asking the guest to do anything.
//
// WHAT IT IS NOT: this is not a booking system. It does not hold dates, it
// cannot confirm availability, and a logged row is an enquiry, not a stay.
// The WhatsApp conversation remains the real record.
//
// FAILURE POSTURE: logging must never cost a booking. Every call is wrapped
// so that a dead endpoint, a blocked request or an offline guest still gets
// a working WhatsApp link. The log is the thing that degrades, never the CTA.
// ============================================================

import { site } from "./site";

// Ambiguous glyphs removed — this reference gets read aloud, retyped, and
// squinted at on a phone screen. No 0/O, no 1/I/L.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function mintRef(): string {
  let out = "";
  const rand =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint8Array(4)))
      : [0, 0, 0, 0].map(() => Math.floor(Math.random() * 256));
  for (const n of rand) out += ALPHABET[n % ALPHABET.length];
  return `KOH-${out}`;
}

export type BookingIntent = {
  /** Which CTA the guest used — tells you what actually converts. */
  source: string;
  /** Nights the guest selected, where the CTA knows it. */
  nights?: number;
  /** The Airbnb figure the guest typed in, where they typed one. */
  quoteKsh?: number;
};

/**
 * Fires the log and returns the reference. Never throws.
 *
 * sendBeacon is used deliberately: the very next thing that happens is a
 * navigation to WhatsApp, and a normal fetch would be cancelled mid-flight.
 * A beacon is queued by the browser and survives the page going away.
 */
export function logIntent(intent: BookingIntent): string {
  const ref = mintRef();
  const endpoint = site.bookingLogUrl;
  if (!endpoint) return ref; // not configured yet — CTA still works

  try {
    const payload = JSON.stringify({
      ref,
      source: intent.source,
      nights: intent.nights ?? null,
      quoteKsh: intent.quoteKsh ?? null,
      nightlyKsh: site.nightlyKsh ?? null,
      commissionKsh: intent.nights ? intent.nights * 1000 : null,
      at: new Date().toISOString(),
      // Where the guest came from, if the browser says. No cookies, no
      // fingerprinting, nothing that needs a consent banner.
      referrer: typeof document !== "undefined" ? document.referrer || "direct" : "",
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      // text/plain avoids a CORS preflight. Apps Script cannot answer an
      // OPTIONS request, so a JSON content-type would fail every time.
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    } else if (typeof fetch !== "undefined") {
      void fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: payload,
      }).catch(() => {});
    }
  } catch {
    // Swallowed on purpose. A booking is worth more than a log row.
  }
  return ref;
}

/**
 * Click handler for a booking CTA. Mints the reference, logs it, then opens
 * WhatsApp with the reference already in the message.
 *
 * This is a CLICK handler and not an href builder on purpose. Building the
 * URL during render would mint and log a reference every time the component
 * painted — every page load, every re-render — filling the sheet with rows
 * for people who never clicked anything. Intent happens on click or not at
 * all.
 *
 * The anchor keeps a plain wa.me href underneath, so middle-click, "open in
 * new tab", and a JS failure all still reach WhatsApp. They just arrive
 * without a reference, which is a lost attribution rather than a lost guest.
 */
export function onBookingClick(
  intent: BookingIntent,
  message: (ref: string) => string
) {
  return (e: { preventDefault: () => void }) => {
    const ref = logIntent(intent);
    const url = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message(ref))}`;
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };
}

/** Plain fallback href — no reference, always works. */
export function plainHref(message?: string): string {
  return message
    ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${site.whatsapp}`;
}
