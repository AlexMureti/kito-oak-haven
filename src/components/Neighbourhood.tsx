import { neighbourhood, site } from "@/lib/site";
import { MapPlate } from "./MapPlate";

// BEAT 8. The storyboard is explicit that this beat carries no photograph —
// the plate is the shot. The list stays alongside it: the plate is the feeling,
// the list is the fact, and the list is what a screen reader and Google get.
export function Neighbourhood() {
  return (
    <section id="neighbourhood" className="on-cream section grain relative overflow-hidden">
      <div className="shell relative">
        <div className="max-w-3xl">
          <p className="eyebrow eyebrow-on-light reveal">The neighbourhood</p>
          <h2 className="t-h2 balance reveal d1 mt-5 text-ink-900">
            Everything Nairobi asks of a week —
            <br className="hidden sm:block" />{" "}
            <span className="gold-metal-ink">minutes out, quiet in</span>.
          </h2>
          <p className="t-lead pretty reveal d2 mt-7 text-ink-700">
            {site.street}, off Argwings Kodhek. Walking times are walking times,
            not optimistic ones — and driving times assume Nairobi traffic rather
            than an empty road.
          </p>
        </div>

        <div className="mt-14 grid gap-12 lg:mt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-16">
          <MapPlate />

          <dl className="reveal d2">
            {neighbourhood.map((n) => (
              <div
                key={n.place}
                className="flex items-baseline justify-between gap-6 border-t border-gold-500/15 py-4"
              >
                <div>
                  <dt className="t-body text-ink-900">{n.place}</dt>
                  <dd className="t-small mt-0.5 text-ink-500">{n.meta}</dd>
                </div>
                <span className="t-small whitespace-nowrap font-medium uppercase tracking-[0.16em] text-gold-600">
                  {n.time}
                </span>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
