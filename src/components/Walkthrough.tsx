import { BeatSection } from "./Beats";
import { walkthrough } from "@/lib/site";

/**
 * The walkthrough — the film.
 *
 * This component is deliberately thin. It used to render every beat through one
 * identical template (a 21:9 band, a caption bar, a counter, a paragraph
 * underneath) which is exactly what makes a property site read as an album.
 * All layout intelligence now lives per-beat in Beats.tsx, and the order below
 * is the edit: pinned, duo, strip, still, split, reveal, cards, full — no two
 * neighbours sharing a mechanic.
 */
export function Walkthrough() {
  return (
    <section id="walkthrough" className="bg-white">
      <div className="mx-auto max-w-[1400px] px-[var(--pad,1.5rem)] pb-4 pt-[clamp(5rem,11vw,10rem)]">
        <div className="max-w-[42ch]">
          <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "#1B2B2299" }}>
            The space
          </p>
          <h2
            className="mt-5 font-serif text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.04] tracking-[-0.015em]"
            style={{ color: "#1B2B22" }}
          >
            Come in and look around
          </h2>
          <p className="mt-6 text-[16px] leading-[1.75]" style={{ color: "#1B2B22B3" }}>
            Eight rooms, in the order you would actually meet them.
          </p>
        </div>
      </div>

      {walkthrough.map((beat, i) => (
        <BeatSection key={beat.photos[0]} beat={beat} n={i + 1} />
      ))}
    </section>
  );
}
