"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Motion runtime: Lenis smooth scroll, SSR-safe reveals, and a scroll-linked
 * `--p` custom property (0 → 1 across an element's pass through the viewport)
 * that drives the photo drift in CSS. Everything degrades to fully-visible,
 * fully-usable static content with no JS or with reduced-motion set.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Static-capture escape hatch for the screenshot script.
    if (new URLSearchParams(window.location.search).has("still")) {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => el.classList.add("seen"));
      return;
    }

    let lenis: Lenis | null = null;
    let raf = 0;
    const drifters = Array.from(document.querySelectorAll<HTMLElement>(".drift, .drift-slow"));

    const updateDrift = () => {
      const vh = window.innerHeight;
      for (const el of drifters) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        // 0 when the element's top enters from below, 1 when its bottom leaves.
        const p = (vh - r.top) / (vh + r.height);
        el.style.setProperty("--p", String(Math.max(0, Math.min(1, p))));
      }
    };

    if (!reduce) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
      });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      lenis.on("scroll", updateDrift);
      updateDrift();
    }

    // Reveals — arm only what starts below the fold.
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("seen");
              io?.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      const vh = window.innerHeight;
      for (const el of els) {
        if (el.getBoundingClientRect().top < vh * 0.9) {
          el.classList.add("seen");
        } else {
          el.classList.add("armed");
          io.observe(el);
        }
      }
    } else {
      els.forEach((el) => el.classList.add("seen"));
    }

    window.addEventListener("resize", updateDrift);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      io?.disconnect();
      window.removeEventListener("resize", updateDrift);
    };
  }, []);

  return <>{children}</>;
}
