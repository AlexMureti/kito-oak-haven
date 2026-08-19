// Kito Oak Haven — watermark removal + responsive web export.
//
// The mark is a fixed, low-alpha composite in all 28 frames:
//     observed = src*(1-a) + C*a
//
// Averaging all 28 frames destroys room detail (28 different rooms -> smooth
// blob) but preserves the mark perfectly, because it is identical and aligned.
// So high-passing the FRAME MEAN isolates the mark's additive field, stroke
// interiors included:
//     markField = mean(frames) - blur(mean(frames))
//
// Removal subtracts k*markField per frame, with k solved per frame by
// minimising high-frequency energy in the mark box (the mark's contribution
// scales with how far the local background sits from the mark colour).
//
// Run:  node scripts/dewatermark.mjs          (full run, writes public/gallery)
//       node scripts/dewatermark.mjs --probe  (field + 3 test frames only)
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "C:/Users/Alexx/Downloads/KITO OAK HAVEN";
const ROOT = "C:/Users/Alexx/Videos/Self_improvement/kito-oak-haven-site";
const PROBE = process.argv.includes("--probe");

const WORK_W = 2560;              // working + max delivered width
const BAND = [0.40, 0.60];        // rows we touch at all
const BOX = { x0: 0.325, x1: 0.675, y0: 0.462, y1: 0.535 };  // mark bbox + margin
const FEATHER = 0.012;            // soft edge, fraction of frame

sharp.cache(false);
sharp.concurrency(2);             // 15W CPU — keep it civil

const files = (await readdir(SRC)).filter((f) => /^KRC_\d+\.JPG$/i.test(f)).sort();

// ---------- pass 1: frame mean over the band ----------
let H = 0, bandY = 0, bandH = 0;
let sum = null;
console.log(`pass 1 — averaging ${files.length} frames @${WORK_W}px`);
for (let i = 0; i < files.length; i++) {
  const { data, info } = await sharp(path.join(SRC, files[i]))
    .resize({ width: WORK_W, kernel: "lanczos3" })
    .raw().toBuffer({ resolveWithObject: true });
  if (!H) {
    H = info.height;
    bandY = Math.round(H * BAND[0]);
    bandH = Math.round(H * BAND[1]) - bandY;
    sum = new Float64Array(WORK_W * bandH * 3);
  }
  const off = bandY * WORK_W * 3;
  for (let j = 0; j < sum.length; j++) sum[j] += data[off + j];
  process.stdout.write(`\r  ${i + 1}/${files.length}`);
}
console.log("");

const mean = new Float32Array(sum.length);
for (let j = 0; j < sum.length; j++) mean[j] = sum[j] / files.length;

// ---------- isolate the mark: high-pass the mean ----------
const meanU8 = Buffer.from(Float32Array.from(mean, (v) => Math.max(0, Math.min(255, v))));
const meanBlur = await sharp(meanU8, { raw: { width: WORK_W, height: bandH, channels: 3 } })
  .blur(10).raw().toBuffer();

// Soft-window the field to the mark box so we never touch clean pixels.
const field = new Float32Array(sum.length);
const fx0 = BOX.x0 * WORK_W, fx1 = BOX.x1 * WORK_W;
const fy0 = BOX.y0 * H - bandY, fy1 = BOX.y1 * H - bandY;
const fpx = FEATHER * WORK_W, fpy = FEATHER * H;
const ramp = (v, edge, soft) => Math.max(0, Math.min(1, (v - edge) / soft));
let peak = 0;
for (let y = 0; y < bandH; y++) {
  const wy = Math.min(ramp(y, fy0 - fpy, fpy), ramp(fy1 + fpy, y, fpy));
  for (let x = 0; x < WORK_W; x++) {
    const wx = Math.min(ramp(x, fx0 - fpx, fpx), ramp(fx1 + fpx, x, fpx));
    const w = wx * wy;
    const p = (y * WORK_W + x) * 3;
    for (let c = 0; c < 3; c++) {
      const d = (mean[p + c] - meanBlur[p + c]) * w;
      field[p + c] = d;
      if (Math.abs(d) > peak) peak = Math.abs(d);
    }
  }
}
console.log(`mark field peak amplitude: ${peak.toFixed(2)}/255`);

await mkdir(path.join(ROOT, "scripts/_mask"), { recursive: true });
await sharp(Uint8Array.from(field, (v) => Math.max(0, Math.min(255, 128 + v * 6))),
  { raw: { width: WORK_W, height: bandH, channels: 3 } })
  .png().toFile(path.join(ROOT, "scripts/_mask/field.png"));

const boxX0 = Math.max(1, Math.floor(fx0 - fpx)), boxX1 = Math.min(WORK_W - 1, Math.ceil(fx1 + fpx));
const boxY0 = Math.max(1, Math.floor(fy0 - fpy)), boxY1 = Math.min(bandH - 1, Math.ceil(fy1 + fpy));

// 3px cross high-pass. Strips the room's smooth content, keeps stroke detail.
const hp = (buf, q) =>
  buf[q] - 0.25 * (buf[q - 3] + buf[q + 3] + buf[q - WORK_W * 3] + buf[q + WORK_W * 3]);

// Project a frame onto the mark pattern.
//   residue(k) = <hp(band - k*field), field> = <hp(band),field> - k*<hp(field),field>
// so the least-squares k is num/den. Same call with the cleaned band returns
// the leftover projection, which should land at ~0.
let den = 0;
for (let y = boxY0; y < boxY1; y++) {
  for (let x = boxX0; x < boxX1; x++) {
    const p = (y * WORK_W + x) * 3;
    for (let c = 0; c < 3; c++) {
      const f = field[p + c];
      if (f !== 0) den += hp(field, p + c) * f;
    }
  }
}
function markProjection(band) {
  let num = 0;
  for (let y = boxY0; y < boxY1; y++) {
    for (let x = boxX0; x < boxX1; x++) {
      const p = (y * WORK_W + x) * 3;
      for (let c = 0; c < 3; c++) {
        const f = field[p + c];
        if (f !== 0) num += hp(band, p + c) * f;
      }
    }
  }
  return den !== 0 ? num / den : 0;
}
console.log(`field self-projection denominator: ${den.toExponential(3)}`);

// ---------- pass 2: remove + export ----------
const SIZES = [
  { w: 2560, q: { avif: 58, webp: 76, jpg: 82 } },
  { w: 1600, q: { avif: 56, webp: 74, jpg: 80 } },
  { w: 800,  q: { avif: 54, webp: 72, jpg: 78 } },
];
const OUTDIR = path.join(ROOT, "public/gallery");
const targets = PROBE ? ["KRC_8542.JPG", "KRC_8568.JPG", "KRC_8590.JPG"] : files;
await mkdir(OUTDIR, { recursive: true });
if (PROBE) await mkdir(path.join(ROOT, "scripts/_mask/probe"), { recursive: true });

console.log(`\npass 2 — removing mark from ${targets.length} frame(s)`);
const manifest = [];
for (let i = 0; i < targets.length; i++) {
  const f = targets[i];
  const id = f.match(/(\d+)/)[1];
  const full = sharp(path.join(SRC, f)).resize({ width: WORK_W, kernel: "lanczos3" });
  const { data } = await full.raw().toBuffer({ resolveWithObject: true });

  // Work on a float copy of the band.
  const off = bandY * WORK_W * 3;
  const band = new Float32Array(WORK_W * bandH * 3);
  for (let j = 0; j < band.length; j++) band[j] = data[off + j];

  // Least-squares scale for this frame, then subtract.
  // Alpha scales with |C - background|, so a dark surface under the mark needs
  // a much larger k than a bright one. Clamp only guards against a bad solve.
  const k = Math.max(0, Math.min(8, markProjection(band)));

  const residual = new Float32Array(band.length);
  for (let j = 0; j < band.length; j++) {
    const v = band[j] - k * field[j];
    residual[j] = v;
    data[off + j] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }
  const leftover = markProjection(residual);

  const cleaned = sharp(data, { raw: { width: WORK_W, height: H, channels: 3 } });
  const meta = { id, k: +k.toFixed(3), leftover: +leftover.toFixed(4) };

  if (PROBE) {
    await cleaned.clone().extract({ left: 0, top: bandY, width: WORK_W, height: bandH })
      .png().toFile(path.join(ROOT, `scripts/_mask/probe/${id}-after.png`));
    await sharp(path.join(SRC, f)).resize({ width: WORK_W, kernel: "lanczos3" })
      .extract({ left: 0, top: bandY, width: WORK_W, height: bandH })
      .png().toFile(path.join(ROOT, `scripts/_mask/probe/${id}-before.png`));
  } else {
    for (const s of SIZES) {
      const base = cleaned.clone().resize({ width: s.w, kernel: "lanczos3" });
      const suffix = s.w === 2560 ? "" : `-${s.w}`;
      await base.clone().avif({ quality: s.q.avif, effort: 4 }).toFile(path.join(OUTDIR, `img_${id}${suffix}.avif`));
      await base.clone().webp({ quality: s.q.webp, effort: 4 }).toFile(path.join(OUTDIR, `img_${id}${suffix}.webp`));
      await base.clone().jpeg({ quality: s.q.jpg, mozjpeg: true, progressive: true }).toFile(path.join(OUTDIR, `img_${id}${suffix}.jpg`));
    }
    // 20px blur placeholder as an inline-able base64 data URI
    const tiny = await cleaned.clone().resize({ width: 20 }).blur(1.2).webp({ quality: 40 }).toBuffer();
    meta.blur = `data:image/webp;base64,${tiny.toString("base64")}`;
    const dims = await sharp(path.join(SRC, f)).metadata();
    meta.aspect = +(dims.width / dims.height).toFixed(4);
  }
  manifest.push(meta);
  process.stdout.write(`\r  ${i + 1}/${targets.length}  ${f}  k=${k.toFixed(2)} leftover=${leftover.toFixed(3)}`);
}
console.log("");

const ks = manifest.map((m) => m.k);
const lo = manifest.map((m) => Math.abs(m.leftover));
console.log(`k: min ${Math.min(...ks).toFixed(2)} max ${Math.max(...ks).toFixed(2)} mean ${(ks.reduce((a, b) => a + b, 0) / ks.length).toFixed(2)}`);
console.log(`|leftover| mean ${(lo.reduce((a, b) => a + b, 0) / lo.length).toFixed(4)} (0 = mark fully cancelled)`);

if (!PROBE) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(ROOT, "src/lib/photos.json"),
    JSON.stringify(Object.fromEntries(manifest.map((m) => [`img_${m.id}`, { blur: m.blur, aspect: m.aspect }])), null, 2));
  console.log(`wrote src/lib/photos.json (${manifest.length} entries)`);
}
