"use client";

import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";
import { Icon } from "./Icon";

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the sheet on Escape, and stop the page scrolling behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-700"
        style={{
          background: solid ? "rgba(250,247,241,.93)" : "transparent",
          backdropFilter: solid ? "blur(10px)" : "none",
          borderBottom: `1px solid ${solid ? "color-mix(in srgb, var(--color-gold-500) 18%, transparent)" : "transparent"}`,
          transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div className="shell flex items-center justify-between py-4">
          {/* Wordmark only. The logo's K is a fluted column with an acorn in
              it, and the lockup already contains the words — setting a letter
              beside the name just reads as "Kkito". The full mark belongs where
              it has room to be seen, which is the footer. Type here follows the
              lockup's own treatment: letterspaced serif caps in gold. */}
          <a href="#top" aria-label={`${site.name}, home`} className="group">
            <span className="block font-display text-[0.86rem] uppercase leading-none tracking-[0.22em] text-gold-700 transition-colors duration-500 group-hover:text-gold-600 sm:text-[1.15rem] sm:tracking-[0.34em]">
              {site.name}
            </span>
            <span className="mt-1.5 hidden text-[0.54rem] uppercase tracking-[0.32em] text-ink-500 sm:block">
              {site.tagline}
            </span>
          </a>

          <nav className="hidden items-center gap-9 lg:flex">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="t-small text-ink-700 transition-colors hover:text-gold-600"
              >
                {n.label}
              </a>
            ))}
            <a
              className="btn btn-gold !px-6 !py-2.5 !text-[0.84rem]"
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="whatsapp" className="h-3.5 w-3.5" />
              Check dates
            </a>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center text-ink-900 lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className="relative block h-3 w-6">
              <span
                className="absolute left-0 block h-px w-6 bg-current transition-all duration-500"
                style={{ top: open ? 6 : 0, rotate: open ? "45deg" : "0deg" }}
              />
              <span
                className="absolute left-0 block h-px w-6 bg-current transition-all duration-500"
                style={{ top: open ? 6 : 12, rotate: open ? "-45deg" : "0deg" }}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile sheet */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{
          background: "rgba(250,247,241,.98)",
          backdropFilter: "blur(8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .5s cubic-bezier(.22,1,.36,1)",
        }}
        aria-hidden={!open}
      >
        <nav className="shell flex h-full flex-col justify-center gap-2">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="t-h3 border-b border-gold-500/15 py-4 text-ink-900"
            >
              {n.label}
            </a>
          ))}
          <a
            className="btn btn-gold mt-8"
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <Icon name="whatsapp" className="h-4 w-4" />
            Check your dates
          </a>
        </nav>
      </div>
    </>
  );
}
