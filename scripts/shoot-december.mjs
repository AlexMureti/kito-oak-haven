// Phone-width shots of the December layer next to today's page: hero, the strip, the chat opener.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2];
// A port for a local `next start`, or a full URL for a Vercel preview.
const AT = process.argv[3] || "3011";
const BASE = AT.startsWith("http") ? AT.replace(/\/$/, "") : `http://localhost:${AT}`;
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 120000,
  args: ["--no-sandbox", "--force-device-scale-factor=2", "--hide-scrollbars"],
});

async function shoot(path, tag, { reduce = false, wide = false } = {}) {
  const p = await browser.newPage();
  // This PC has Windows reduced motion on, and headless Chrome inherits it; a guest phone usually does not.
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }]);
  if (wide) await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  else await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({ path: `${OUT}/${tag}-hero.png` });
  const strip = await p.$("#december");
  if (strip) {
    await strip.scrollIntoView();
    await new Promise((r) => setTimeout(r, 1500));
    await strip.screenshot({ path: `${OUT}/${tag}-strip.png` });
    const rows = await p.$$eval("#december li a", (as) => as.map((a) => a.innerText.replace(/\n/g, " | ")));
    console.log(tag, "strip rows:", rows);
  }
  // Chat opener
  const launcher = await p.$('button[aria-label="Ask about the apartment"]');
  if (launcher) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 600));
    await launcher.click();
    await new Promise((r) => setTimeout(r, 900));
    await p.screenshot({ path: `${OUT}/${tag}-chat.png` });
  }
  console.log(tag, "os-reduce:", await p.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches));
  const h1 = await p.$eval("h1", (h) => h.innerText.replace(/\n/g, " / "));
  const lights = await p.$(".lights");
  const cls = await p.evaluate(() => {
    const el = document.querySelector(".lights");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el, "::before");
    return { top: r.top, height: r.height, width: r.width, anim: cs.animationName, bg: cs.backgroundImage.slice(0, 40) };
  });
  console.log(tag, "h1:", h1, "| lights:", lights ? JSON.stringify(cls) : "none");
  await p.close();
}

await shoot("/?still=1", "today");
await shoot("/december?still=1", "december");
await shoot("/december?still=1", "december-reduced", { reduce: true });
await shoot("/december?still=1", "december-wide", { wide: true });
await browser.close();
console.log("DONE", OUT);
