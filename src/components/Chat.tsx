"use client";

import { useEffect, useRef, useState } from "react";
import { plainHref } from "@/lib/booking";
import { longDate, type Selection } from "@/lib/availability";
import { Icon } from "./Icon";

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  /** Lets a typed stay move the calendar, instead of asking the guest to enter it twice. */
  onDates?: (sel: Selection) => void;
};

const OPENERS = [
  "What happens when the power goes out?",
  "Can I check in late?",
  "Is the pool actually heated?",
];

export function Chat({ onDates }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [caught, setCaught] = useState<Selection | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking, caught]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || thinking) return;

    const history = turns.slice(-8);
    setTurns((t) => [...t, { role: "user", content: message }]);
    setDraft("");
    setThinking(true);

    try {
      // Same origin, so no CORS and no token to ship. The key lives in the
      // Vercel project's environment and never reaches this bundle.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      const data = await res.json();

      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content:
            data.reply ||
            "I could not reach the desk just then. WhatsApp is the fastest route from here.",
        },
      ]);

      if (data.dates?.checkIn && data.dates?.checkOut) {
        setCaught(data.dates);
        onDates?.({ checkIn: data.dates.checkIn, checkOut: data.dates.checkOut });
      }
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: "Something went wrong reaching the desk. Message us on WhatsApp and a person will answer.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {/* The trigger is the lozenge from the wordmark, not a speech bubble.
          One gold mark that catches light, sitting quietly until it is wanted. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close the desk" : "Ask about the apartment"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/40 bg-pine-950/95 shadow-[0_10px_36px_-10px_rgba(6,19,16,.8)] backdrop-blur transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 sm:bottom-7 sm:right-7"
      >
        <span
          className={`block transition-transform duration-500 ${open ? "rotate-[135deg]" : ""}`}
          style={{
            width: 13,
            height: 13,
            transform: open ? undefined : "rotate(45deg)",
            background:
              "linear-gradient(100deg,#8a6832,#c6a15b 18%,#f2e4c2 34%,#d7b878 48%,#ad8442 66%,#e6cf9c 84%,#9c7439)",
          }}
        />
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex max-h-[min(560px,72vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-sm border border-gold-500/40 bg-cream-50 text-left shadow-[0_30px_70px_-24px_rgba(6,19,16,.7)] sm:bottom-28 sm:right-7">
          <div className="border-b border-gold-600/25 px-5 py-4">
            <p className="font-display text-xl leading-none text-ink-900">The desk</p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-ink-500">
              An assistant, not a person. It knows the apartment — a real person answers on WhatsApp.
            </p>
          </div>

          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {turns.length === 0 && (
              <div className="space-y-2">
                {OPENERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="block w-full rounded-sm border border-gold-600/25 px-3 py-2.5 text-left text-[12.5px] text-ink-700 transition-colors hover:border-gold-600 hover:bg-cream-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {turns.map((t, i) =>
              t.role === "user" ? (
                <p key={i} className="ml-8 text-right text-[13px] leading-relaxed text-ink-900">
                  {t.content}
                </p>
              ) : (
                /* The property answers on headed paper: a hairline gold rule,
                   then the serif. Not a grey bubble. */
                <div key={i} className="mr-6 border-t border-gold-600/35 pt-2.5">
                  <p className="font-display text-[16.5px] leading-[1.45] text-ink-900">{t.content}</p>
                </div>
              )
            )}

            {thinking && (
              <div className="mr-6 flex gap-1.5 border-t border-gold-600/35 pt-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rotate-45 bg-gold-500"
                    style={{ animation: `kito-pulse 1.1s ${i * 0.16}s infinite ease-in-out` }}
                  />
                ))}
              </div>
            )}

            {caught?.checkIn && caught?.checkOut && (
              <p className="border-l-2 border-gold-500 bg-cream-100 py-2 pl-3 text-[12px] leading-snug text-ink-700">
                {longDate(caught.checkIn)} &rarr; {longDate(caught.checkOut)} is on the calendar above.
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-2 border-t border-gold-600/25 px-3 py-3"
          >
            <input
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about the apartment"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || thinking}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-pine-900 text-cream-100 transition-opacity disabled:opacity-30"
            >
              &rarr;
            </button>
          </form>

          <a
            href={plainHref("Hi! I have a question about Kito Oak Haven — ")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border-t border-gold-600/25 bg-cream-100 py-3 text-[12px] font-medium text-ink-700 transition-colors hover:bg-cream-200"
          >
            <Icon name="whatsapp" className="h-3.5 w-3.5" />
            Talk to a person on WhatsApp
          </a>
        </div>
      )}

      <style>{`
        @keyframes kito-pulse {
          0%, 100% { opacity: .25; transform: rotate(45deg) scale(.8); }
          50%      { opacity: 1;   transform: rotate(45deg) scale(1); }
        }
      `}</style>
    </>
  );
}
