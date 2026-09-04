// Turn a guest's WhatsApp message into a booking enquiry.
//
//   node scripts/enquiry.mjs "hi, looking for a place 14th to 18th next month for 2"
//   node scripts/enquiry.mjs --file message.txt
//
// The split that matters: the model reads language, the arithmetic decides
// availability. An LLM guessing whether nights are free is a guest arriving at
// an occupied flat; assess() deciding it is a comparison that cannot be wrong.
// So the model's only job is turning "the 14th to the 18th" into two ISO dates,
// and everything after that is the same code the site runs.
//
// The key is never read by anyone but this process. Put it in .env.local
// (already covered by .gitignore's .env*) as:
//
//   NVIDIA_API_KEY=...
//
// It is never printed, and it is redacted out of any error this script raises.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assess,
  addDays,
  longDate,
  nightsBetween,
  todayInNairobi,
} from "../src/lib/availability.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://integrate.api.nvidia.com/v1";

// Nights already sold. Empty until the owner's Airbnb feed is connected —
// see scripts/apps-script-calendar.gs. Kept here rather than invented so this
// tool never claims a night is free on the strength of nothing.
const HOLDS = [];

function loadKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY.trim();

  const envFile = join(ROOT, ".env.local");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }

  console.error(
    "No NVIDIA_API_KEY found.\n\n" +
      "Put it in .env.local at the project root:\n" +
      "  NVIDIA_API_KEY=your-key\n\n" +
      ".env* is already gitignored, and nothing here ever prints it."
  );
  process.exit(1);
}

/** Strips the key out of anything on its way to a terminal or a log. */
function redact(text, key) {
  return String(text).split(key).join("***REDACTED***");
}

/**
 * Removes what the model does not need to do its job.
 *
 * The message may carry a phone number or an email. Extracting dates does not
 * require either, and sending a guest's contact details to a third-party
 * inference endpoint is processing personal data for no reason — which under
 * the Data Protection Act 2019 is exactly the kind of thing that has to be
 * justified. Easier not to send it.
 */
function stripContactDetails(text) {
  return String(text)
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]");
}

async function api(path, key, init = {}) {
  const res = await fetch(ENDPOINT + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`NVIDIA ${path} returned ${res.status}: ${redact(body.slice(0, 300), key)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(body);
}

/**
 * Candidate models, best first.
 *
 * /models lists more than the account can actually invoke — asking for one of
 * the others comes back 404 "Function not found for account", which reads like
 * a broken key and is not. So this returns an ordered list and the caller
 * walks it until one answers.
 */
async function candidateModels(key) {
  if (process.env.NVIDIA_MODEL) return [process.env.NVIDIA_MODEL];

  const { data } = await api("/models", key);
  const ids = data.map((m) => m.id);

  // Probed against this account, because /models is not a guide to what will
  // answer. kimi-k3 is the pick; minimax-m3 is the proven fallback.
  // gpt-oss-20b responds but leaves message.content null, mistral-nemotron
  // 500s, and the nemotron and mistral-large ids 404 as not-deployed.
  // Re-probe rather than trust this list: meta/llama-3.3-70b-instruct reached
  // end of life on 2026-08-26 and now answers 410, which is what sent me
  // looking in the first place.
  const preferred = [
    "moonshotai/kimi-k3",
    "minimaxai/minimax-m3",
    "openai/gpt-oss-20b",
  ];

  const ordered = [
    ...preferred.filter((p) => ids.includes(p)),
    ...ids.filter((id) => /instruct/i.test(id) && !preferred.includes(id)),
  ];

  if (!ordered.length) {
    throw new Error(`No instruct model listed. Saw: ${ids.slice(0, 12).join(", ")}`);
  }
  return ordered;
}

/**
 * Request settings per model.
 *
 * kimi-k3 has thinking permanently on, so it spends tokens reasoning before it
 * answers and those count against max_tokens — a 300-token budget that is
 * ample for a normal model gets consumed by the thinking and returns nothing.
 * Effort is set low on purpose: pulling two dates out of a sentence is not a
 * reasoning problem, and max effort only buys latency here.
 *
 * Temperature 1 with a fixed seed follows NVIDIA's own sample. The determinism
 * that matters comes from the seed and a strict schema, not from temperature 0,
 * which some reasoning models refuse outright.
 */
function paramsFor(model) {
  if (/kimi|gpt-oss|reason/i.test(model)) {
    return { temperature: 1, seed: 0, max_tokens: 8192, reasoning_effort: "low" };
  }
  return { temperature: 0, max_tokens: 400 };
}

/** Tries each candidate until one is actually deployed for this account. */
async function complete(key, models, messages) {
  const refused = [];

  for (const model of models.slice(0, 8)) {
    try {
      const out = await api("/chat/completions", key, {
        method: "POST",
        body: JSON.stringify({ model, ...paramsFor(model), messages }),
      });

      // Reasoning models answer with content null and put the text in
      // reasoning_content. Treating that as an empty reply throws on .trim()
      // and looks like the model failed when it actually answered.
      const msg = out.choices?.[0]?.message ?? {};
      const content = msg.content ?? msg.reasoning_content ?? "";
      if (!content.trim()) {
        refused.push(`${model} (empty reply)`);
        continue;
      }
      return { model, content };
    } catch (err) {
      // 404 not deployed for this account, 403 not entitled, 500 the model is
      // listed but broken today. All three mean "try the next one", not "stop".
      if (err.status === 404 || err.status === 403 || err.status === 500) {
        refused.push(`${model} (${err.status})`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `None of the listed models are deployed for this account.\n` +
      `Tried: ${refused.join(", ")}\n` +
      `Pick one from build.nvidia.com and set NVIDIA_MODEL.`
  );
}

const SYSTEM = `You extract booking dates from short messages sent to a Nairobi holiday apartment.

Return ONLY a JSON object, no prose, with these keys:
  checkIn   string  the arrival date as YYYY-MM-DD, or null if not stated
  checkOut  string  the departure date as YYYY-MM-DD, or null if not stated
  guests    number  how many people, or null if not stated
  nights    number  nights requested if the guest said a count rather than dates, else null
  note      string  anything else worth a human seeing, in under 12 words

Rules:
- checkOut is the day they LEAVE, not the last night. "14th to the 18th" means checkIn 14, checkOut 18.
- "3 nights from the 14th" means checkIn the 14th, checkOut the 17th.
- Resolve relative dates against TODAY, given below. Never return a date in the past.
- If a month is not stated, choose the next occurrence of that day-of-month at or after TODAY.
- If you cannot tell, use null. Do not guess.`;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Model did not return JSON:\n${text.slice(0, 300)}`);
  return JSON.parse(raw.slice(start, end + 1));
}

async function main() {
  const args = process.argv.slice(2);
  let message;

  const fileIdx = args.indexOf("--file");
  if (fileIdx !== -1) message = readFileSync(args[fileIdx + 1], "utf8");
  else message = args.join(" ");

  if (!message.trim()) {
    console.error('Usage: node scripts/enquiry.mjs "guest message here"');
    process.exit(1);
  }

  const key = loadKey();
  const today = todayInNairobi();

  try {
    const models = await candidateModels(key);
    const safe = stripContactDetails(message);

    const { model, content } = await complete(key, models, [
      { role: "system", content: SYSTEM },
      { role: "user", content: `TODAY is ${today}.\n\nMessage:\n${safe}` },
    ]);

    const parsed = extractJson(content);

    // The model may return nights instead of a checkout. Close that here
    // rather than asking it to do arithmetic it is bad at.
    let { checkIn, checkOut } = parsed;
    if (checkIn && !checkOut && parsed.nights > 0) checkOut = addDays(checkIn, parsed.nights);

    console.log(`\nmodel      ${model}`);
    console.log(`today      ${today}`);
    console.log(`guests     ${parsed.guests ?? "not stated"}`);
    if (parsed.note) console.log(`note       ${parsed.note}`);
    console.log("");

    if (!checkIn || !checkOut) {
      console.log("Could not read dates from that message. Ask the guest directly.");
      return;
    }

    const verdict = assess(checkIn, checkOut, today, HOLDS);
    const nights = nightsBetween(checkIn, checkOut);

    console.log(`arriving   ${longDate(checkIn)}`);
    console.log(`leaving    ${longDate(checkOut)}`);
    console.log(`nights     ${nights}`);
    console.log(`verdict    ${verdict.state.toUpperCase()}`);

    if (verdict.state === "clash") {
      console.log(`clashes on ${verdict.clashNights.map(longDate).join(", ")}`);
      if (verdict.alternative) {
        console.log(`nearest    ${longDate(verdict.alternative.start)} to ${longDate(verdict.alternative.end)}`);
      }
    }

    console.log("\n--- draft reply ---");
    if (verdict.state === "free" && HOLDS.length === 0) {
      console.log(
        `Hi! ${longDate(checkIn)} to ${longDate(checkOut)}, ${nights} ${nights === 1 ? "night" : "nights"} — let me confirm those are still open and come straight back to you.`
      );
    } else if (verdict.state === "free") {
      console.log(
        `Hi! ${longDate(checkIn)} to ${longDate(checkOut)} is free — ${nights} ${nights === 1 ? "night" : "nights"}. A deposit holds it and the balance is settled on arrival.`
      );
    } else if (verdict.state === "clash" && verdict.alternative) {
      console.log(
        `Hi! Those nights are taken, but ${longDate(verdict.alternative.start)} to ${longDate(verdict.alternative.end)} is open — same ${nights} ${nights === 1 ? "night" : "nights"}. Would that work?`
      );
    } else {
      console.log(`Hi! Let me check those dates and come back to you shortly.`);
    }
    console.log("");
  } catch (err) {
    console.error("\n" + redact(err.message, key) + "\n");
    process.exit(1);
  }
}

main();
