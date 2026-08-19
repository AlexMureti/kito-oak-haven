import { assurances } from "@/lib/site";
import { Icon } from "./Icon";

/**
 * Amenities, written as answers to the things people actually worry about
 * before booking a Nairobi apartment: power, water, internet, security.
 * A feature list says "generator". A reassurance says "the power does not go
 * out", which is the sentence the guest is looking for.
 */
export function Assurances() {
  return (
    <section id="assurances" className="section">
      <div className="shell">
        <div className="max-w-2xl">
          <p className="eyebrow reveal">What&rsquo;s handled</p>
          <h2 className="t-h2 balance reveal d1 mt-5">
            The things you would otherwise
            <br />
            have to ask about
          </h2>
        </div>

        <div className="mt-14 grid gap-x-12 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
          {assurances.map((a, i) => (
            <div key={a.title} className={`reveal d${(i % 3) + 1}`}>
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-pine-900"
                style={{ background: "color-mix(in srgb, var(--color-gold-400) 22%, transparent)" }}
              >
                <Icon name={a.icon} className="h-5 w-5" />
              </span>
              <h3 className="t-h3 mt-5 text-[1.28rem]">{a.title}</h3>
              <p className="t-body pretty mt-3 text-ink-700">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
