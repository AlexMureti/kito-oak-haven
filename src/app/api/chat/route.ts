import { NextRequest, NextResponse } from "next/server";

// The chat runs here rather than in the browser because an API key placed in
// a client bundle is a key anyone can read and spend. It also runs here rather
// than in Apps Script, which needs an interactive OAuth consent for outbound
// requests that never reliably fired — and would have blocked the calendar
// ingest for the same reason.
//
// The key comes from NVIDIA_API_KEY in the Vercel project's environment. It is
// never sent to the client and never logged.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

// Probed against this account. A listed model is not a deployed one, and ids
// go stale without warning — meta/llama-3.3-70b-instruct answered 410 eight
// days after its end of life.
const MODELS = ["moonshotai/kimi-k3", "minimaxai/minimax-m3"];

const MAX_CHARS = 600;
const MAX_TURNS = 8;

/**
 * Everything the model is allowed to know.
 *
 * Kept as one block so it cannot drift into inventing amenities. Anything not
 * in here gets "I'll check" and a push to WhatsApp, which is the only honest
 * answer about a real apartment somebody will physically arrive at.
 */
const FACTS = `
Kito Oak Haven is a private one-bedroom apartment on the seventh floor of Oak
Classic Residence, George Padmore Road, Kilimani, Nairobi, Kenya.

Rate: KSh 7,000 per night, booked direct, nothing added at checkout. Payment is
by M-Pesa. A deposit holds the dates; the balance is settled on arrival once the
guest is inside and satisfied.

Sleeps two to three. King bed, hotel-grade cotton, blackout drapes. Full kitchen
with a gas cooktop, air fryer, blender, coffee maker and a water purifier
dispenser. LG washing machine in the unit. Smart TV and soundbar. Private
balcony with city views. Rainfall shower with instant hot water.

Building: heated indoor pool and a full gym on the second floor, open 6am to
9pm, no extra fee. An automatic backup generator takes the load in 10 to 15
seconds, so wifi, lights, water pump and lifts stay on through an outage.
Dedicated fiber line and a real desk — video calls hold.

No pets and no smoking — both are declared in the site's own structured data,
so this is settled, not a guess.

Check-in is contactless by smart keypad lock, from 2:00 PM; check-out by 11:00
AM. Because there is no key to hand over, early arrival and late departure are
usually possible if asked in advance. There is a caretaker on site and the
building is gated.

Cancellation: free up to 48 hours before arrival with the deposit refunded in
full. Inside 48 hours the deposit is held against the dates, but if the nights
are re-let they are refunded.

Airport transfer: give us your flight number and a driver is arranged at the
guest's own cost, quoted up front. Roughly 30 to 45 minutes from JKIA. Uber and
Bolt work — set the destination to Oak Classic Residence.

Nearby: Yaya Centre and Adlife Plaza 8 minutes on foot. Carrefour and Chandarana
10 minutes on foot. Nairobi Hospital 8 minutes by car. The CBD 12 minutes by car.

NOT KNOWN — say you will check and point to WhatsApp, never guess:
parking, exact wifi speed in Mbps, air conditioning.
`.trim();

function systemPrompt(today: string): string {
  return `You answer questions from guests on the Kito Oak Haven website. Warm, brief and specific — two or three sentences, because the guest is on a phone.

TODAY is ${today}. The property is in Nairobi (UTC+3).

=== THE ONLY FACTS YOU HAVE ===
${FACTS}
=== END OF FACTS ===

Rules you must not break:

1. NEVER say a date is available, free, or open. You cannot see the calendar. If asked about specific dates, say you will confirm and suggest sending them on WhatsApp.
2. NEVER invent a fact that is not above. If you do not know, say you will check and point the guest to WhatsApp. Guessing about a real apartment somebody will physically arrive at is the worst thing you can do.
3. Never quote a price other than KSh 7,000 per night.
4. Do not claim to be a person or an employee. If asked, say you are an assistant on the website and a real person answers on WhatsApp.
5. Money is KSh. Distances in minutes. Kenyan context, not American.

If the guest mentions dates, still answer their question — the website reads the dates separately and shows them on the calendar.

Finally, on the LAST line only and with nothing else on it, output:
DATES: {"checkIn":"YYYY-MM-DD or null","checkOut":"YYYY-MM-DD or null","guests":number or null}

checkOut is the day they LEAVE. "14th to the 18th" means checkIn 14, checkOut 18. "3 nights from the 14th" means checkIn 14, checkOut 17. Resolve relative dates against TODAY and never return a past date. If a month is not stated, use the next occurrence at or after TODAY. If you cannot tell, use null. Do not guess.`;
}

type Turn = { role: "user" | "assistant"; content: string };

/** Nairobi is UTC+3 with no daylight saving. */
function todayInNairobi(): string {
  return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
}

/**
 * A crude per-instance limiter. Serverless resets this on every cold start, so
 * it is a speed bump rather than a wall — enough to stop a loop hammering the
 * endpoint, not enough to call it rate limiting. The real cap is max_tokens
 * and the short model list.
 */
const seen = new Map<string, { n: number; until: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const rec = seen.get(ip);
  if (!rec || now > rec.until) {
    seen.set(ip, { n: 1, until: now + 60_000 });
    return false;
  }
  rec.n++;
  return rec.n > 12;
}

/** Reasoning models spend tokens thinking, and those count against the budget. */
function paramsFor(model: string) {
  return /kimi|gpt-oss/i.test(model)
    ? { temperature: 1, seed: 0, max_tokens: 4096, reasoning_effort: "low" }
    : { temperature: 0.3, max_tokens: 500 };
}

async function complete(key: string, messages: unknown[]) {
  for (const model of MODELS) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, ...paramsFor(model) }),
      });

      if (!res.ok) continue;

      const body = await res.json();
      const msg = body?.choices?.[0]?.message ?? {};
      const text: string = msg.content || msg.reasoning_content || "";
      if (text.trim()) return text;
    } catch {
      // Next model rather than failing the guest.
    }
  }
  return null;
}

/** Splits the visible reply from the DATES line the model appends. */
function split(raw: string) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  let dates: { checkIn: string | null; checkOut: string | null; guests: number | null } | null = null;
  const kept: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*DATES:\s*(\{.*\})\s*$/);
    if (!m) {
      kept.push(line);
      continue;
    }
    try {
      const d = JSON.parse(m[1]);
      dates = {
        checkIn: iso.test(d.checkIn ?? "") ? d.checkIn : null,
        checkOut: iso.test(d.checkOut ?? "") ? d.checkOut : null,
        guests: typeof d.guests === "number" ? d.guests : null,
      };
      if (dates.checkIn && dates.checkOut && dates.checkOut <= dates.checkIn) dates.checkOut = null;
    } catch {
      dates = null;
    }
  }

  return { reply: kept.join("\n").replace(/```[a-z]*|```/g, "").trim(), dates };
}

export async function POST(req: NextRequest) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, reply: "The assistant is not configured yet." });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) {
    return NextResponse.json({
      ok: false,
      reply: "That is a lot of questions at once. WhatsApp is the fastest route from here.",
    });
  }

  let payload: { message?: string; history?: Turn[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reply: "" });
  }

  const message = String(payload.message ?? "").slice(0, MAX_CHARS).trim();
  if (!message) return NextResponse.json({ ok: false, reply: "" });

  const history = (Array.isArray(payload.history) ? payload.history : [])
    .slice(-MAX_TURNS)
    .map((t) => ({
      role: t.role === "assistant" ? "assistant" : "user",
      content: String(t.content ?? "").slice(0, MAX_CHARS),
    }));

  const raw = await complete(key, [
    { role: "system", content: systemPrompt(todayInNairobi()) },
    ...history,
    { role: "user", content: message },
  ]);

  if (raw === null) {
    return NextResponse.json({
      ok: false,
      reply: "I could not reach the desk just then. WhatsApp is the fastest route from here.",
    });
  }

  const { reply, dates } = split(raw);
  return NextResponse.json({ ok: true, reply, dates });
}
