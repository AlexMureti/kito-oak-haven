import { faqs } from "@/lib/site";
import { Icon } from "./Icon";

export function Faq() {
  return (
    <section id="faq" className="section">
      <div className="shell-narrow">
        <p className="eyebrow reveal">Questions</p>
        <h2 className="t-h2 balance reveal d1 mt-5">
          The ones worth
          <br />
          answering properly
        </h2>

        <div className="reveal d2 mt-12">
          {/* `pending` entries are withheld entirely — a collapsed <details>
              still ships its text to the browser. */}
          {faqs.filter((f) => !f.pending).map((f) => (
            <details key={f.q} className="group border-t border-ink-900/12 py-1">
              <summary className="flex items-start justify-between gap-6 py-5">
                <h3 className="t-h3 text-[1.22rem] leading-snug">{f.q}</h3>
                <span className="chev mt-1.5 flex-none text-gold-600">
                  <Icon name="arrowDown" className="h-4 w-4" />
                </span>
              </summary>
              <p className="t-body pretty pb-6 pr-10 text-ink-700">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
