"use client";

import { useEffect, useState } from "react";
import { onBookingClick, plainHref } from "@/lib/booking";
import { site } from "@/lib/site";
import { Icon } from "./Icon";

/**
 * Mobile booking bar. Appears once the hero is behind you and hides again over
 * the booking section, so it never competes with the primary CTA it duplicates.
 * Most traffic here will be a phone opened from a WhatsApp link — on that
 * screen the action has to be permanently within thumb reach.
 */
export function StickyBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.95;
      const book = document.getElementById("book");
      const atBook = book ? book.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
      setShow(past && !atBook);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{
        transform: show ? "translateY(0)" : "translateY(110%)",
        transition: "transform .6s cubic-bezier(.22,1,.36,1)",
      }}
      aria-hidden={!show}
    >
      <div
        className="flex items-center justify-between gap-4 px-[var(--pad)] py-3.5"
        style={{
          background: "rgba(250,247,241,.96)",
          boxShadow: "0 -10px 30px -18px rgba(27,43,34,.45)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid color-mix(in srgb, var(--color-gold-500) 22%, transparent)",
          paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="min-w-0">
          <p className="t-small truncate text-ink-900">
            {site.currency} {site.nightlyKsh?.toLocaleString("en-KE")} a night, direct
          </p>
          <p className="t-small truncate text-ink-500">
            Replies in {site.replyTypical}
          </p>
        </div>
        <a
          className="btn btn-gold flex-none !px-6 !py-2.5 !text-[0.86rem]"
          href={plainHref("Hi! I'd like to book Kito Oak Haven.")}
          onClick={onBookingClick(
            { source: "sticky-bar" },
            (ref) => `Hi! I'd like to book Kito Oak Haven. My dates are: 

Ref: ${ref}`
          )}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={show ? 0 : -1}
        >
          <Icon name="whatsapp" className="h-4 w-4" />
          Check dates
        </a>
      </div>
    </div>
  );
}
