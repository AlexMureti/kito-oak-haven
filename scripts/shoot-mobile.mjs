import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.env.SHOT_DIR;
const BASE = "http://localhost:3000/?still=1";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 120000,
  args: ["--no-sandbox", "--force-device-scale-factor=2", "--hide-scrollbars"],
});
const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await m.goto(BASE, { waitUntil: "load", timeout: 45000 });
await m.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise(r=>setTimeout(r,120)); }
  window.scrollTo(0,0);
  await Promise.all(Array.from(document.images).map(i=>i.complete?0:i.decode().catch(()=>0)));
  await new Promise(r=>setTimeout(r,500));
});
// viewport hero
await m.screenshot({ path: `${OUT}/m_hero.png` });
for (const sel of ["#space","#amenities","#location","#book"]) {
  const el = await m.$(sel);
  if (el) { await el.screenshot({ path: `${OUT}/m_${sel.slice(1)}.png` }); console.log("m clip", sel); }
}
await browser.close();
console.log("MOBILE DONE");
