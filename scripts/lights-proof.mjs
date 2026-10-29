// Lights proof: is the string on "Kilimani" playing at random, and does it stay
// still when it should? Usage: node scripts/lights-proof.mjs [url] [seconds]
// Prints the lightings drawn, how irregular each bulb's dips are, whether two
// visits get different colours, and the reduced-motion and off-screen states.
import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2] || "http://localhost:3000/";
const seconds = Number(process.argv[3] || 50);

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  protocolTimeout: 300000, args: ["--no-sandbox", "--hide-scrollbars"] });
const errors = [];

async function open(motion) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.setViewport({ width: 1440, height: 900 });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: motion }]);
  await p.goto(url, { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector(".climb-bulbs i", { timeout: 30000 });
  return p;
}
const colours = (p) => p.$$eval(".climb-bulbs i", (is) => is.map((i) => i.dataset.c));
const state = (p) => p.evaluate(() => {
  const box = document.querySelector(".climb-bulbs").parentElement;
  const is = [...document.querySelectorAll(".climb-bulbs i")];
  return {
    lighting: box.dataset.lights || null,
    running: document.getAnimations().filter((a) => is.includes(a.effect?.target)).length,
    dim: is.map((i) => parseFloat(getComputedStyle(i).opacity) < 0.9),
  };
});

// 1. Motion allowed: sample the string.
const p = await open("no-preference");
const first = await colours(p);
const seen = [];
const dips = first.map(() => []);
const wasDim = first.map(() => false);
const t0 = Date.now();
while (Date.now() - t0 < seconds * 1000) {
  const s = await state(p);
  if (s.lighting && seen[seen.length - 1] !== s.lighting) seen.push(s.lighting);
  s.dim.forEach((d, i) => { if (d && !wasDim[i]) dips[i].push(Date.now() - t0); wasDim[i] = d; });
  await new Promise((r) => setTimeout(r, 120));
}
const gaps = dips.flatMap((ts) => ts.slice(1).map((t, k) => t - ts[k]));
const mean = gaps.reduce((a, g) => a + g, 0) / (gaps.length || 1);
const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / (gaps.length || 1));
console.log("bulbs", first.length, "| colours", first.join(" "));
console.log("lightings drawn, in order:", seen.join(" > "));
console.log(`dips: ${dips.flat().length} in ${seconds}s; gap between a bulb's dips: mean ${Math.round(mean)} ms, spread ${Math.round(sd)} ms (0 would be a metronome)`);

// 2. Off screen: it should stop, and start again on the way back.
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await new Promise((r) => setTimeout(r, 1500));
const away = await state(p);
await p.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 3500));
const back = await state(p);
console.log("scrolled away:", away.lighting, away.running, "running | back:", back.lighting, back.running, "running");

// 3. A second visit deals its own colours.
await p.reload({ waitUntil: "load" });
await p.waitForSelector(".climb-bulbs i");
const second = await colours(p);
console.log("second visit colours:", second.join(" "), "| same order as the first:", second.join() === first.join());

// 4. Reduced motion: lit and still.
const q = await open("reduce");
await new Promise((r) => setTimeout(r, 4000));
const calm = await state(q);
console.log("reduced motion: lighting", calm.lighting, "| running", calm.running, "| dim bulbs", calm.dim.filter(Boolean).length);

console.log("page errors:", errors.length ? errors : "none");
await b.close();
