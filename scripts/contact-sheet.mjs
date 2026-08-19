// Contact sheet of all 28 frames with the watermark box drawn, so crops can be
// art-directed against the real constraint instead of guessed.
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "C:/Users/Alexx/Downloads/KITO OAK HAVEN";
const OUT = "C:/Users/Alexx/Videos/Self_improvement/kito-oak-haven-site/scripts/_mask";
const BOX = { x0: 0.325, x1: 0.675, y0: 0.462, y1: 0.535 };

const TW = 470, COLS = 4, PAD = 6, LABEL = 20;
sharp.cache(false);
sharp.concurrency(2);

const files = (await readdir(SRC)).filter((f) => /^KRC_\d+\.JPG$/i.test(f)).sort();
const rows = Math.ceil(files.length / COLS);
let TH = 0;

const tiles = [];
for (const f of files) {
  const id = f.match(/(\d+)/)[1];
  const buf = await sharp(path.join(SRC, f)).resize({ width: TW }).toBuffer();
  const m = await sharp(buf).metadata();
  TH = m.height;
  // Draw the watermark box + a label as an SVG overlay.
  const svg = Buffer.from(
    `<svg width="${TW}" height="${TH}">
      <rect x="${BOX.x0 * TW}" y="${BOX.y0 * TH}" width="${(BOX.x1 - BOX.x0) * TW}" height="${(BOX.y1 - BOX.y0) * TH}"
            fill="rgba(255,0,80,.28)" stroke="#ff0050" stroke-width="1.5"/>
      <line x1="0" y1="${0.45 * TH}" x2="${TW}" y2="${0.45 * TH}" stroke="#00e5ff" stroke-width="1" stroke-dasharray="6 4"/>
      <line x1="0" y1="${0.55 * TH}" x2="${TW}" y2="${0.55 * TH}" stroke="#00e5ff" stroke-width="1" stroke-dasharray="6 4"/>
      <line x1="${0.30 * TW}" y1="0" x2="${0.30 * TW}" y2="${TH}" stroke="#7cff00" stroke-width="1" stroke-dasharray="6 4"/>
      <line x1="${0.70 * TW}" y1="0" x2="${0.70 * TW}" y2="${TH}" stroke="#7cff00" stroke-width="1" stroke-dasharray="6 4"/>
      <rect x="0" y="0" width="86" height="22" fill="#000"/>
      <text x="5" y="16" font-family="monospace" font-size="15" fill="#fff">${id}</text>
    </svg>`
  );
  tiles.push(await sharp(buf).composite([{ input: svg, top: 0, left: 0 }]).toBuffer());
}

const SW = COLS * TW + (COLS + 1) * PAD;
const SH = rows * (TH + LABEL) + (rows + 1) * PAD;
await mkdir(OUT, { recursive: true });
await sharp({ create: { width: SW, height: SH, channels: 3, background: "#111" } })
  .composite(tiles.map((input, i) => ({
    input,
    left: PAD + (i % COLS) * (TW + PAD),
    top: PAD + Math.floor(i / COLS) * (TH + LABEL + PAD),
  })))
  .jpeg({ quality: 82 })
  .toFile(path.join(OUT, "contact-sheet.jpg"));

console.log(`sheet ${SW}x${SH} — ${files.length} frames, ${TW}x${TH} each`);
console.log(`red box = watermark. cyan lines = y 0.45 / 0.55 safe cuts. green = x 0.30 / 0.70 safe cuts.`);
