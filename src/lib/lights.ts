/**
 * The box at the end of the string of lights on "Kilimani" (Climbers.tsx).
 *
 * A shop-bought string comes with a controller of eight settings (in waves,
 * sequential, slo-glo, chasing, slow fade, twinkle, steady on) and a
 * "combination" that runs through them in a fixed order. Alex, 29 Oct 2026:
 * "random patterns of lights... different lightings that are not purely
 * predictable". So this box draws its next lighting at random, keeps it for a
 * random time, and draws every timing inside it afresh: the string never plays
 * the same minute twice.
 *
 * Only opacity, filter and transform move, through the Web Animations API, so
 * the page does no layout for it. It stops under reduced motion, when the
 * headline is off screen and when the tab is hidden.
 */

export type Light = {
  el: HTMLElement;
  /** 0 at the foot of its letter's stroke, 1 at the top. */
  rise: number;
  /** 0 at the left of the word, 1 at the right. */
  across: number;
};

type Lighting = "twinkle" | "glints" | "climb" | "waves" | "glow";

/** How often each is drawn: twinkling is the string's resting state. */
const ODDS: [Lighting, number][] = [
  ["twinkle", 4],
  ["glints", 2],
  ["climb", 2],
  ["waves", 1.5],
  ["glow", 1],
];

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Any lighting but the last one. */
function draw(last: Lighting | null): Lighting {
  const pool = ODDS.filter(([l]) => l !== last);
  let r = Math.random() * pool.reduce((t, [, w]) => t + w, 0);
  for (const [l, w] of pool) {
    r -= w;
    if (r <= 0) return l;
  }
  return pool[0][0];
}

export function runLights(box: HTMLElement, lights: Light[]): () => void {
  if (!lights.length || typeof box.animate !== "function") return () => {};
  const timers = new Set<number>();
  const playing = new Set<Animation>();
  let on = false;
  let last: Lighting | null = null;

  const after = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (on) fn();
    }, ms);
    timers.add(id);
  };

  // Eased between every pair of keyframes, not across the whole run.
  const play = (el: HTMLElement, frames: Keyframe[], duration: number, delay = 0, iterations = 1) => {
    const a = el.animate(
      frames.map((f) => ({ easing: "ease-in-out", ...f })),
      { duration, delay, iterations },
    );
    playing.add(a);
    a.onfinish = () => playing.delete(a);
  };

  /** Each starts its lighting and says how long it runs, in ms. */
  const lightings: Record<Lighting, () => number> = {
    // Every bulb on its own clock, like the old twinkle bulbs: each dims and
    // comes back when it likes, and now and then a loose one catches twice.
    twinkle() {
      const length = rand(8000, 16000);
      const end = performance.now() + length;
      for (const { el } of lights) {
        const flick = () => {
          const low = rand(0.18, 0.5);
          const loose = Math.random() < 0.18;
          const frames: Keyframe[] = loose
            ? [{ opacity: 1 }, { opacity: low, offset: 0.2 }, { opacity: 0.85, offset: 0.42 }, { opacity: low * 0.8, offset: 0.62 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: low, offset: rand(0.3, 0.5) }, { opacity: 1 }];
          const ms = rand(380, 1100) * (loose ? 1.5 : 1);
          play(el, frames, ms);
          const wait = ms + rand(600, 4000);
          if (performance.now() + wait < end) after(wait, flick);
        };
        after(rand(0, 2400), flick);
      }
      return length;
    },

    // Steady, with one bulb at a time catching the light.
    glints() {
      const length = rand(4500, 9000);
      const end = performance.now() + length;
      let prev = -1;
      const glint = () => {
        let i = Math.floor(Math.random() * lights.length);
        if (i === prev) i = (i + 1) % lights.length;
        prev = i;
        play(lights[i].el, [
          { filter: "brightness(1)", transform: "scale(1)" },
          { filter: "brightness(1.8)", transform: "scale(1.35)", offset: 0.25 },
          { filter: "brightness(1)", transform: "scale(1)" },
        ], rand(520, 900));
        const wait = rand(180, 800);
        if (performance.now() + wait < end) after(wait, glint);
      };
      glint();
      return length;
    },

    // Ours: the string dims, then the light climbs every letter from its foot
    // to its top, the letters along the word a moment apart.
    climb() {
      const passes = Math.random() < 0.5 ? 1 : 2;
      let t = 0;
      for (let p = 0; p < passes; p++) {
        const up = rand(800, 1300);
        const along = rand(500, 1300);
        for (const l of lights) {
          const at = 400 + l.rise * up + l.across * along;
          const total = at + 600;
          play(l.el, [
            { opacity: 1, filter: "brightness(1)" },
            { opacity: 0.25, filter: "brightness(1)", offset: 350 / total },
            { opacity: 0.25, filter: "brightness(1)", offset: at / total },
            { opacity: 1, filter: "brightness(1.6)", offset: (at + 180) / total },
            { opacity: 1, filter: "brightness(1)" },
          ], total, t);
        }
        t += 400 + up + along + 600 + rand(900, 2200);
      }
      return t;
    },

    // In waves: a soft dip runs along the word, one way or the other.
    waves() {
      const passes = 1 + Math.floor(Math.random() * 3);
      let t = 0;
      let leftward = Math.random() < 0.5;
      for (let p = 0; p < passes; p++) {
        const span = rand(1100, 1800);
        for (const l of lights) {
          const at = (leftward ? 1 - l.across : l.across) * span + l.rise * 120;
          play(l.el, [{ opacity: 1 }, { opacity: 0.28 }, { opacity: 1 }], 700, t + at);
        }
        t += span + 820 + rand(300, 1200);
        if (Math.random() < 0.6) leftward = !leftward;
      }
      return t;
    },

    // Slo-glo: the whole string breathes together, slowly.
    glow() {
      const breaths = Math.random() < 0.5 ? 1 : 2;
      const ms = rand(2400, 3400);
      const low = rand(0.4, 0.6);
      for (const { el } of lights) play(el, [{ opacity: 1 }, { opacity: low }, { opacity: 1 }], ms, 0, breaths);
      return ms * breaths;
    },
  };

  const next = () => {
    const l = draw(last);
    last = l;
    box.dataset.lights = l;
    after(lightings[l]() + rand(1000, 2800), next); // steady on in between
  };

  const start = () => {
    if (on) return;
    on = true;
    after(rand(300, 1200), next);
  };

  const stop = () => {
    on = false;
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    playing.forEach((a) => a.cancel());
    playing.clear();
    delete box.dataset.lights;
  };

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  let inView = false;
  const update = () => {
    if (inView && !calm.matches && !document.hidden) start();
    else stop();
  };
  const io = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    update();
  });
  io.observe(box);
  calm.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);

  return () => {
    stop();
    io.disconnect();
    calm.removeEventListener("change", update);
    document.removeEventListener("visibilitychange", update);
  };
}
