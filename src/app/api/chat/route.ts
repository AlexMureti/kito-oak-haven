import { NextRequest, NextResponse } from "next/server";

// The chat runs here rather than in the browser because an API key placed in
// a client bundle is a key anyone can read and spend. It also runs here rather
// than in Apps Script, which needs an interactive OAuth consent for outbound
// requests that never reliably fired — and would have blocked the calendar
// ingest for the same reason.
//
// The key comes from GEMINI_API_KEY in the Vercel project's environment (the
// "kito-agent" key, 8 Oct 2026). It is never sent to the client and never
// logged. Gemini replaced NVIDIA entirely on 8 Oct: the NVIDIA fallback once
// leaked a reasoning model's raw thinking to a guest as gibberish.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gemini's native endpoint, not its OpenAI-compatible one: Google documents
// auth keys (AQ...) with the x-goog-api-key header on this endpoint
// (ai.google.dev/gemini-api/docs/api-key, updated 6 Oct 2026).
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
// Stable ids on ai.google.dev/gemini-api/docs/models (updated 6 Oct 2026).
// Flash-Lite first: fast and cheap, and enough for a hospitality desk.
const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];

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

Contact: WhatsApp or call +254 740 180 214 — the same number for both. Typical
reply is under 15 minutes, 7am to 10pm EAT.

How booking works: the guest chooses dates, on the calendar on this page or by
telling you in this chat. A "Send these dates on WhatsApp" button then opens
WhatsApp with the dates and a booking reference already written. A real person
confirms the dates there and takes the M-Pesa deposit that holds them.

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
6. If the guest asks for a number, a phone, WhatsApp, or how to reach someone, give +254 740 180 214 plainly (WhatsApp or call). Never say you do not have it.
7. If the guest wants to book or reserve, or asks you to book for them: you cannot confirm a booking yourself, so never say a stay is booked, reserved or confirmed. Ask for the check-in and check-out dates, and how many guests, if you do not have them yet. Once you have both dates, tell them to tap "Send these dates on WhatsApp" just below this chat — the message is already written — or to message +254 740 180 214.
8. Answer in the language the guest writes in (English or Swahili).

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

type Msg = { role: string; content: string };

/**
 * Gemini: the system prompt rides as systemInstruction; "assistant" is "model".
 * Returns the reply and which model gave it, or null plus what each model did
 * (an HTTP status, "timeout", "empty"), which goes out in a response header so
 * a failure can be seen from outside without logging anything a guest typed.
 */
async function complete(messages: Msg[]) {
  const key = process.env.GEMINI_API_KEY ?? "";
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const tried: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${GEMINI}/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
        // A guest waiting more than ~12 s is better served by WhatsApp.
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        tried.push(`${model}:${res.status}`);
        continue;
      }
      const body = await res.json();
      // Thought parts are the model thinking aloud: never shown to a guest.
      const parts: { text?: string; thought?: boolean }[] = body?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      if (text.trim()) return { text, via: model };
      tried.push(`${model}:empty`);
    } catch (e) {
      tried.push(`${model}:${e instanceof Error && e.name === "TimeoutError" ? "timeout" : "error"}`);
    }
  }
  return { text: null, via: tried.join(" ") || "none" };
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
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, reply: "The assistant is not configured yet." },
      { headers: { "x-kito-ai": "no-key" } },
    );
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

  const { text, via } = await complete([
    { role: "system", content: systemPrompt(todayInNairobi()) },
    ...history,
    { role: "user", content: message },
  ]);
  const headers = { "x-kito-ai": via };

  if (text === null) {
    return NextResponse.json(
      { ok: false, reply: "I could not reach the desk just then. WhatsApp is the fastest route from here." },
      { headers },
    );
  }

  const { reply, dates } = split(text);
  return NextResponse.json({ ok: true, reply, dates }, { headers });
}
