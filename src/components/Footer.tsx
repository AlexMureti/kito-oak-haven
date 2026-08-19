import { nav, site } from "@/lib/site";
import { Icon } from "./Icon";

export function Footer() {
  return (
    <footer className="on-white">
      <div className="shell section-tight">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            {/* The designed lockup, used as designed — mark, wordmark and
                tagline together, at the one size on the page with room for it. */}
            <picture>
              <source type="image/webp" srcSet="/logo-lockup-320.webp" />
              <img
                src="/logo-lockup-320.png"
                width={320}
                height={320}
                alt={`${site.name} — ${site.tagline}`}
                loading="lazy"
                decoding="async"
                className="-ml-3 h-auto w-[190px]"
              />
            </picture>
            <p className="t-small pretty mt-4 max-w-xs text-ink-500">
              A privately hosted one-bedroom apartment in {site.building},{" "}
              {site.street}, {site.area}, {site.city}.
            </p>
          </div>

          <nav>
            <h2 className="t-small uppercase tracking-[0.2em] text-gold-600/70">Explore</h2>
            <ul className="mt-4 space-y-2.5">
              {nav.map((n) => (
                <li key={n.href}>
                  <a className="t-small text-ink-700 hover:text-gold-600" href={n.href}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="t-small uppercase tracking-[0.2em] text-gold-600/70">Reach us</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  className="t-small flex items-center gap-2 text-ink-700 hover:text-gold-600"
                  href={`https://wa.me/${site.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="whatsapp" className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  className="t-small text-ink-700 hover:text-gold-600"
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                >
                  {site.phone}
                </a>
              </li>
              <li>
                <a
                  className="t-small text-ink-700 hover:text-gold-600"
                  href={`tel:${site.phoneAlt.replace(/\s/g, "")}`}
                >
                  {site.phoneAlt}
                </a>
              </li>
              {site.email && (
                <li>
                  <a
                    className="t-small flex items-center gap-2 text-ink-700 hover:text-gold-600"
                    href={`mailto:${site.email}`}
                  >
                    <Icon name="mail" className="h-3.5 w-3.5" />
                    {site.email}
                  </a>
                </li>
              )}
              <li className="t-small pt-1 text-ink-500">
                Replies {site.replyHours}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-gold-500/15 pt-7">
          <p className="t-small text-ink-500">
            © {new Date().getFullYear()} {site.name}. {site.area}, {site.city}, {site.country}.
          </p>
          {/* The acorn from the mark, as the final full stop. */}
          <span aria-hidden className="text-gold-500/50" title="">
            ❦
          </span>
        </div>
      </div>
    </footer>
  );
}
