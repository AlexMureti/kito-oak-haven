// Motion proof: capture the SAME scroll-driven beat at several scroll depths.
// If the frames are identical, the motion is dead. If they differ, it moves.
import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  protocolTimeout: 180000, args: ["--no-sandbox", "--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3000/", { waitUntil: "load", timeout: 60000 });
// let fonts/images settle
await p.evaluate(() => new Promise(r => setTimeout(r, 2500)));
const total = await p.evaluate(() => document.body.scrollHeight);
for (const pct of [0.16, 0.20, 0.24, 0.28]) {
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(total * pct));
  await p.evaluate(() => new Promise(r => setTimeout(r, 1400)));
  await p.screenshot({ path: `scripts/_shots/motion_${Math.round(pct*100)}.png` });
  console.log("captured", pct);
}
await b.close();
