"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Photo, photoData } from "./Photo";
import type { Beat } from "@/lib/site";

/**
 * The walkthrough's layout mechanics — STORYBOARD.md v3.
 *
 * THE CONTRACT: every beat below must look and MOVE unlike its neighbours.
 * An amateur property site is a stack of equal rectangles that fade in; the
 * whole reason this file has eight components instead of one loop is to make
 * that impossible. Three rules are enforced structurally:
 *
 *   1. Scale varies violently — 100vw bleed next to a 38vw detail.
 *   2. Type interlocks with the image. There is not one caption-under-photo.
 *   3. Portrait frames stay portrait; they are never letterboxed.
 *
 * Gold appears only on interactive or structural marks, never as decoration,
 * so it keeps meaning "this is a thing, not a flourish".
 */

/**
 * Motion styles derived from useTransform read as different values during SSR
 * than on the client's first paint, which React reports as a hydration
 * mismatch. Gating on mount and rendering the transform's OWN start value until
 * then makes both passes agree, with no flash of the un-transformed layout.
 */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const GOLD = "#C8972F";
const INK = "#1B2B22";

/** Section numeral in the fluted serif — the recurring structural mark. */
function Numeral({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span
      className={`block font-serif text-[13px] tracking-[0.4em] ${className}`}
      style={{ color: GOLD }}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: `${INK}99` }}>
      {children}
    </p>
  );
}

function Tags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
      {tags.map((t) => (
        <li key={t} className="text-[11px] uppercase tracking-[0.16em]" style={{ color: `${INK}80` }}>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** Words block. Shared type rhythm; placement is each layout's business. */
function Words({ beat, n, className = "" }: { beat: Beat; n: number; className?: string }) {
  return (
    <div className={className}>
      <Numeral n={n} className="mb-5" />
      <Eyebrow>{beat.eyebrow}</Eyebrow>
      <h3
        className="mt-4 font-serif text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.08] tracking-[-0.01em]"
        style={{ color: INK }}
      >
        {beat.title}
      </h3>
      <p className="mt-5 max-w-[46ch] text-[15px] leading-[1.75]" style={{ color: `${INK}B3` }}>
        {beat.body}
      </p>
      <Tags tags={beat.tags} />
    </div>
  );
}

/** Frame. Applies the manifest's art-directed focal point as object-position. */
function Frame({
  slug,
  sizes,
  className = "",
  priority = false,
}: {
  slug: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const focus = (photoData[slug] as { focus?: string })?.focus ?? "50% 50%";
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ ["--focus" as string]: focus }}
    >
      <Photo
        slug={slug}
        sizes={sizes}
        priority={priority}
        className="block h-full w-full"
        imgClassName="h-full w-full object-cover [object-position:var(--focus)]"
      />
    </div>
  );
}

// ---------------------------------------------------------------- 01 pinned
/** Inset frame held for one viewport; eases in and pans as you scroll past. */
function Pinned({ beat, n }: { beat: Beat; n: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], still ? [1, 1] : [1, 1.07]);
  const x = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "2%"]);

  return (
    <section ref={ref} className="py-[clamp(4rem,9vw,9rem)]">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-[var(--pad,1.5rem)] lg:grid-cols-12 lg:gap-16">
        <Words beat={beat} n={n} className="lg:col-span-4 lg:pr-4" />
        <div className="lg:col-span-8">
          <motion.div style={{ scale, x }} className="origin-center">
            <Frame slug={beat.photos[0]} sizes="(min-width:1024px) 62vw, 92vw" className="aspect-[4/3] lg:aspect-[3/2]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- 02 duo
/** Two frames that deliberately collide. Magazines do this; albums never do. */
function Duo({ beat, n }: { beat: Beat; n: number }) {
  return (
    <section className="py-[clamp(4rem,9vw,9rem)]">
      <div className="mx-auto max-w-[1400px] px-[var(--pad,1.5rem)]">
        <div className="relative">
          <Frame slug={beat.photos[0]} sizes="(min-width:768px) 74vw, 100vw" className="aspect-[16/10] w-full md:w-[74%]" />
          {/* overlapping second frame — the collision */}
          <div className="relative z-10 -mt-10 ml-auto w-[64%] md:absolute md:-bottom-14 md:right-0 md:mt-0 md:w-[38%]">
            <Frame slug={beat.photos[1]} sizes="(min-width:768px) 38vw, 64vw" className="aspect-[4/5] shadow-[0_30px_80px_-30px_rgba(27,43,34,0.45)]" />
          </div>
        </div>
        <Words beat={beat} n={n} className="mt-16 md:mt-24 md:max-w-[52%]" />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- 03 strip
/** The one lateral move on the site — like turning your head at the table. */
function Strip({ beat, n }: { beat: Beat; n: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["2%", "-46%"]);
  const mounted = useMounted();

  // Deliberately unequal widths: wide, tall detail, small square, wide.
  const spans = ["w-[78vw] md:w-[46vw]", "w-[52vw] md:w-[24vw]", "w-[60vw] md:w-[28vw]", "w-[78vw] md:w-[42vw]"];
  const ratios = ["aspect-[3/2]", "aspect-[3/4]", "aspect-square", "aspect-[3/2]"];

  return (
    <section ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-[1400px] px-[var(--pad,1.5rem)]">
          <Words beat={beat} n={n} className="max-w-[46ch]" />
        </div>
        <motion.div
          style={mounted ? { x } : { transform: "translateX(2%)" }}
          className="flex items-end gap-[clamp(1rem,2.4vw,2.5rem)] pl-[var(--pad,1.5rem)]"
        >
          {beat.photos.map((slug, i) => (
            <Frame
              key={slug}
              slug={slug}
              sizes="(min-width:768px) 40vw, 70vw"
              className={`${spans[i] ?? spans[0]} ${ratios[i] ?? ratios[0]} shrink-0`}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- 04 still
/** After a horizontal scrub, stillness IS the effect. No motion at all. */
function Still({ beat, n }: { beat: Beat; n: number }) {
  return (
    <section className="py-[clamp(6rem,14vw,14rem)]">
      <div className="mx-auto max-w-[1000px] px-[var(--pad,1.5rem)] text-center">
        <Numeral n={n} className="mb-6" />
        <Eyebrow>{beat.eyebrow}</Eyebrow>
        <h3
          className="mx-auto mt-5 max-w-[18ch] font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.06]"
          style={{ color: INK }}
        >
          {beat.title}
        </h3>
        <Frame slug={beat.photos[0]} sizes="(min-width:1024px) 62vw, 92vw" className="mt-14 aspect-[3/2]" />
        <p className="mx-auto mt-10 max-w-[48ch] text-[15px] leading-[1.85]" style={{ color: `${INK}B3` }}>
          {beat.body}
        </p>
        <div className="flex justify-center">
          <Tags tags={beat.tags} />
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- 05 split
/** Portrait frame bleeding to the viewport edge; type holds the other side. */
function Split({ beat, n }: { beat: Beat; n: number }) {
  return (
    <section className="py-[clamp(4rem,9vw,9rem)]">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_42vw] md:gap-0">
        <div className="px-[var(--pad,1.5rem)] md:pl-[max(var(--pad,1.5rem),calc((100vw-1400px)/2))] md:pr-16">
          <div className="relative">
            {/* fluted vertical rules — the K */}
            <div className="absolute -left-6 top-1 hidden h-full w-px md:block" style={{ background: `linear-gradient(180deg, ${GOLD}00, ${GOLD}66, ${GOLD}00)` }} />
            <Words beat={beat} n={n} />
          </div>
        </div>
        {/* bleeds right, stays portrait */}
        <Frame slug={beat.photos[0]} sizes="(min-width:768px) 42vw, 100vw" className="aspect-[3/4] w-full md:h-[86vh] md:aspect-auto" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 06 reveal
/** Crop opens from tight to full bleed — the morning-coffee reveal. */
function Reveal({ beat, n }: { beat: Beat; n: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const width = useTransform(scrollYProgress, [0, 1], still ? ["100%", "100%"] : ["58%", "100%"]);
  const radius = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [2, 0]);
  const mounted = useMounted();

  return (
    <section ref={ref} className="py-[clamp(4rem,9vw,9rem)]">
      <motion.div
        style={mounted ? { width, borderRadius: radius } : { width: "58%", borderRadius: 2 }}
        className="mx-auto overflow-hidden"
      >
        <Frame slug={beat.photos[0]} sizes="100vw" className="aspect-[16/9] md:aspect-[21/9]" />
      </motion.div>
      <div className="mx-auto mt-14 grid max-w-[1400px] gap-10 px-[var(--pad,1.5rem)] md:grid-cols-12">
        <Words beat={beat} n={n} className="md:col-span-6 md:col-start-6" />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- 07 cards
/** Three-card stagger. Benefit first, spec small — never the other way round. */
function Cards({ beat, n }: { beat: Beat; n: number }) {
  return (
    <section className="py-[clamp(4rem,9vw,9rem)]">
      <div className="mx-auto max-w-[1400px] px-[var(--pad,1.5rem)]">
        <Words beat={beat} n={n} className="max-w-[52ch]" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {beat.photos.slice(0, 3).map((slug, i) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              className={i === 1 ? "md:mt-12" : i === 2 ? "md:mt-6" : ""}
            >
              <Frame slug={slug} sizes="(min-width:768px) 31vw, 92vw" className="aspect-[4/5]" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ 08 full
/** Full bleed with type set into the frame's own negative space. */
function Full({ beat, n }: { beat: Beat; n: number }) {
  return (
    <section className="relative">
      <Frame slug={beat.photos[0]} sizes="100vw" className="h-[86vh] w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1400px] px-[var(--pad,1.5rem)]">
          <div className="max-w-[34ch] rounded-[2px] bg-white/82 p-8 backdrop-blur-[2px] md:p-10">
            <Numeral n={n} className="mb-4" />
            <Eyebrow>{beat.eyebrow}</Eyebrow>
            <h3 className="mt-4 font-serif text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[1.08]" style={{ color: INK }}>
              {beat.title}
            </h3>
            <p className="mt-4 text-[15px] leading-[1.75]" style={{ color: `${INK}B3` }}>
              {beat.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const LAYOUTS = { pinned: Pinned, duo: Duo, strip: Strip, still: Still, split: Split, reveal: Reveal, cards: Cards, full: Full } as const;

export function BeatSection({ beat, n }: { beat: Beat; n: number }) {
  const Component = LAYOUTS[beat.layout];
  return <Component beat={beat} n={n} />;
}
