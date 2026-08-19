// Visual verification. Renders the real page in Chrome and writes section
// screenshots so the design is checked by eye, not by hope.
//   SHOT_DIR=... node scripts/shoot.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.env.SHOT_DIR ?? "./scripts/_shots";
const BASE = `http://localhost:${process.env.PORT ?? 3000}/?still=1`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 180000,
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars"],
});

async function ready(page) {
  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      Array.from(document.images).map((i) => (i.complete ? 0 : i.decode().catch(() => 0)))
    );
    await new Promise((r) => setTimeout(r, 700));
  });
}

const d = await browser.newPage();
await d.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await ready(d);
await d.screenshot({ path: `${OUT}/desktop_full.png`, fullPage: true });
await d.screenshot({ path: `${OUT}/hero.png` });
console.log("desktop + hero");

for (const sel of ["#direct", "#walkthrough", "#assurances", "#neighbourhood", "#book", "#faq", "footer"]) {
  const el = await d.$(sel);
  if (!el) { console.log("missing", sel); continue; }
  const name = sel.replace(/[#.]/g, "") || "footer";
  await el.screenshot({ path: `${OUT}/sec_${name}.png` }).catch((e) => console.log("skip", name, e.message));
  console.log("clipped", name);
}

const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await ready(m);
await m.screenshot({ path: `${OUT}/mobile_full.png`, fullPage: true });
await m.screenshot({ path: `${OUT}/mobile_hero.png` });
console.log("mobile done");

await browser.close();
console.log("ALL DONE");
