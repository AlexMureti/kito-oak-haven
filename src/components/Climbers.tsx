"use client";

import { useEffect, useRef, useState } from "react";
import { deal, runLights } from "@/lib/lights";

/**
 * A string of lights climbing each letter of a word, like a creeper up a post
 * (Alex, 28 Oct 2026: "Kilimani having lights on it like climbers on each
 * individual letter").
 *
 * The letters are real HTML text, so nothing here is drawn by hand. After the
 * font has loaded, every letter is painted onto a small canvas and its
 * vertical strokes are read off the ink: a stem is a run of columns whose
 * longest unbroken run of ink is nearly the tallest in the glyph (the dot of
 * an i, the bowl of an a and the arms of a K all fall short). Around each stem
 * a helix is drawn, one path for the half-turns in front of the stroke and one
 * for the half-turns behind it, and a bulb hangs at every turn. Positions are
 * taken from the laid-out text (one DOM Range per letter), so kerning and the
 * viewport size are already accounted for; a resize re-measures.
 *
 * The colours are dealt afresh on every visit, and src/lib/lights.ts plays
 * the string, changing them as it goes.
 */

type Stem = { x: number; top: number; bottom: number }; // em, relative to the glyph origin and the baseline
type Bulb = { x: number; y: number; rise: number; across: number; colour: string };
type Helix = { front: string; back: string; bulbs: Bulb[] };

const SAMPLE = 256; // canvas px per em while reading the glyphs

function readStems(letter: string, font: string): Stem[] {
  const c = document.createElement("canvas");
  c.width = SAMPLE * 2;
  c.height = SAMPLE * 2;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const ox = SAMPLE * 0.5;
  const baseline = SAMPLE * 1.3;
  ctx.font = font;
  ctx.fillStyle = "#000";
  ctx.fillText(letter, ox, baseline);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const w = c.width;
  const h = c.height;

  // Per column: the longest unbroken run of ink and where it sits.
  const runs: { len: number; top: number; bottom: number }[] = [];
  let tallest = 0;
  for (let x = 0; x < w; x++) {
    let best = { len: 0, top: 0, bottom: 0 };
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const ink = y < h && data[(y * w + x) * 4 + 3] > 128;
      if (ink && start < 0) start = y;
      if (!ink && start >= 0) {
        if (y - start > best.len) best = { len: y - start, top: start, bottom: y };
        start = -1;
      }
    }
    runs.push(best);
    if (best.len > tallest) tallest = best.len;
  }
  if (!tallest) return [];

  // Columns at (nearly) the tallest run, grouped into stems.
  const stems: Stem[] = [];
  const cut = tallest * 0.82;
  let from = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && runs[x].len >= cut;
    if (on && from < 0) from = x;
    if (!on && from >= 0) {
      const mid = Math.round((from + x - 1) / 2);
      stems.push({
        x: (mid - ox) / SAMPLE,
        top: (runs[mid].top - baseline) / SAMPLE,
        bottom: (runs[mid].bottom - baseline) / SAMPLE,
      });
      from = -1;
    }
  }
  return stems;
}

/**
 * A helix up one stem, in px of the overlay box. Two bulbs on a short stem,
 * three on a tall one, spaced up its height on alternate sides; the wire makes
 * half a turn between bulbs, in front of the stroke on one side and behind it
 * on the other.
 */
function wind(cx: number, top: number, bottom: number, em: number, into: Helix) {
  const A = em * 0.1; // half-width of the helix: clears a Cormorant stem on both sides
  const h = bottom - top;
  const n = Math.min(3, Math.max(2, Math.round(h / (em * 0.22)))); // bulbs on this stem
  const steps = n * 12;
  let front = "";
  let back = "";
  let wasFront: boolean | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * n * Math.PI; // bulb k sits at theta = pi/2 + k pi, i.e. at height (k + 1/2) / n
    const x = cx + A * Math.sin(theta);
    const y = bottom - t * h;
    const isFront = Math.cos(theta) >= 0;
    const pt = `${x.toFixed(1)} ${y.toFixed(1)}`;
    if (isFront !== wasFront) {
      if (isFront) front += `M${pt}`;
      else back += `M${pt}`;
      wasFront = isFront;
    } else if (isFront) front += `L${pt}`;
    else back += `L${pt}`;
  }
  for (let k = 0; k < n; k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const rise = (k + 0.5) / n;
    into.bulbs.push({ x: cx + A * side, y: bottom - rise * h, rise, across: 0, colour: "" });
  }
  into.front += front;
  into.back += back;
}

export function Climbers({ children, className }: { children: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const bulbs = useRef<HTMLSpanElement>(null);
  const [helix, setHelix] = useState<Helix | null>(null);

  useEffect(() => {
    const wrap = box.current;
    const word = text.current;
    if (!wrap || !word) return;
    let alive = true;
    const stemsByLetter = new Map<string, Stem[]>();
    let fontKey = "";
    const colours = deal(60); // kept through re-measures, so a resize doesn't reshuffle

    const measure = () => {
      if (!alive) return;
      const node = word.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const cs = getComputedStyle(word);
      const em = parseFloat(cs.fontSize);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${SAMPLE}px ${cs.fontFamily}`;
      if (font !== fontKey) {
        stemsByLetter.clear();
        fontKey = font;
      }
      // The baseline, read from the page: a zero-size inline-block sits on it.
      const mark = probe.current;
      if (!mark) return;
      const origin = wrap.getBoundingClientRect();
      const out: Helix = { front: "", back: "", bulbs: [] };
      const range = document.createRange();
      for (let i = 0; i < children.length; i++) {
        const ch = children[i];
        if (ch === " ") continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width) continue;
        let stems = stemsByLetter.get(ch);
        if (!stems) {
          stems = readStems(ch, font);
          stemsByLetter.set(ch, stems);
        }
        const left = r.left - origin.left;
        const baseline = mark.getBoundingClientRect().top - origin.top;
        let lastX = -Infinity;
        for (const s of stems) {
          if (s.x - lastX < 0.36) continue; // the middle stem of an m: a wire there is clutter
          lastX = s.x;
          wind(left + s.x * em, baseline + s.top * em, baseline + s.bottom * em, em, out);
        }
      }
      const xs = out.bulbs.map((b) => b.x);
      const x0 = Math.min(...xs);
      const width = Math.max(...xs) - x0 || 1;
      out.bulbs.forEach((b, i) => {
        b.across = (b.x - x0) / width;
        b.colour = colours[i % colours.length];
      });
      setHelix(out);
    };

    document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [children]);

  // The controller plays the string, restarted whenever the bulbs move.
  useEffect(() => {
    const wrap = box.current;
    const row = bulbs.current;
    if (!helix || !wrap || !row) return;
    const els = Array.from(row.children) as HTMLElement[];
    return runLights(wrap, helix.bulbs.map((b, i) => ({ el: els[i], rise: b.rise, across: b.across })));
  }, [helix]);

  return (
    <span ref={box} className="relative isolate inline-block">
      <svg className="climb climb-back" aria-hidden="true">
        {helix && <path d={helix.back} />}
      </svg>
      <span ref={text} className={className}>
        {children}
      </span>
      <span ref={probe} aria-hidden="true" className="inline-block h-0 w-0 align-baseline" />
      <svg className="climb climb-front" aria-hidden="true">
        {helix && <path d={helix.front} />}
      </svg>
      <span ref={bulbs} className="climb climb-bulbs" aria-hidden="true">
        {helix?.bulbs.map((b, i) => (
          <i key={i} data-c={b.colour} style={{ left: b.x, top: b.y }} />
        ))}
      </span>
    </span>
  );
}
