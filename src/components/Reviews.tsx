import { reviews, airbnb, site } from "@/lib/site";
import { Icon } from "./Icon";

/**
 * Renders nothing while `reviews` is empty.
 *
 * Deliberate: invented testimonials on a real, bookable property are fraud,
 * and a reader who senses one stops believing the rest of the page. Paste the
 * real Airbnb reviews into src/lib/site.ts and this section appears.
 */
export function Reviews() {
  if (!reviews.length) return null;

  return (
    <section id="reviews" className="section">
      <div className="shell-narrow text-center">
        <p className="eyebrow reveal">Guests</p>
        {airbnb.reviewCount > 0 && (
          <p className="t-small reveal d1 mt-4 text-ink-500">
            {airbnb.rating.toFixed(2)} average across {airbnb.reviewCount} stays
            {airbnb.url ? (
              <>
                {" · "}
                <a
                  className="underline decoration-gold-500/50 hover:text-gold-700"
                  href={airbnb.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  verified on Airbnb
                </a>
              </>
            ) : null}
          </p>
        )}
      </div>

      <div className="shell mt-14 grid gap-10 md:grid-cols-3">
        {reviews.map((r, i) => (
          <blockquote key={r.name + i} className={`reveal d${(i % 3) + 1}`}>
            <div className="flex gap-0.5 text-gold-500" aria-label="Five stars">
              {Array.from({ length: 5 }).map((_, n) => (
                <Icon key={n} name="star" className="h-3.5 w-3.5" />
              ))}
            </div>
            <p className="t-body pretty mt-5">&ldquo;{r.quote}&rdquo;</p>
            <footer className="t-small mt-5 uppercase tracking-[0.16em] text-ink-500">
              {r.name} · {r.origin} · {r.nights}
            </footer>
          </blockquote>
        ))}
      </div>

      <p className="shell t-small mt-12 text-center text-ink-500">
        Every stay is hosted personally{site.host ? ` by ${site.host}` : ""}, on {site.phone}.
      </p>
    </section>
  );
}
