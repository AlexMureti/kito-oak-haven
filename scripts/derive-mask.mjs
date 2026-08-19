// Recover the watermark's alpha mask by STACKING all 28 frames.
//
// The mark is an identical semi-transparent composite in every photo:
//     observed = source*(1-a) + markColor*a
// Room content differs per frame; the mark does not. So:
//   1. crop the band where the mark lives (cheap — ~1MP not 30MP)
//   2. per frame, subtract a blurred copy of itself -> isolates thin strokes + real edges
//   3. average across 28 frames -> real edges cancel, the mark reinforces
// The result is the mark's shape. Written out as a PNG for visual checking.
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const SRC = "C:/Users/Alexx/Downloads/KITO OAK HAVEN";
const OUT = "C:/Users/Alexx/Videos/Self_improvement/kito-oak-haven-site/scripts/_mask";

// Work at final web width; no need for 6720px.
const W = 2560;
// Generous band around the centred mark (fractions of height).
const Y0 = 0.42, Y1 = 0.58;

const files = (await readdir(SRC)).filter((f) => /^KRC_\d+\.JPG$/i.test(f)).sort();
console.log(`stacking ${files.length} frames at ${W}px wide, band y ${Y0}-${Y1}`);

let H = 0, bandH = 0, bandY = 0;
let acc = null;   // Float32 accumulator of (frame - blur(frame))
let accAbs = null; // accumulates |deviation| to measure consistency
let n = 0;

for (const f of files) {
  const base = sharp(path.join(SRC, f)).resize({ width: W, kernel: "lanczos3" });
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  if (!H) {
    H = info.height;
    bandY = Math.floor(H * Y0);
    bandH = Math.floor(H * Y1) - bandY;
    acc = new Float32Array(W * bandH * 3);
    accAbs = new Float32Array(W * bandH * 3);
    console.log(`  frame ${W}x${H}, band rows ${bandY}..${bandY + bandH} (${bandH}px tall)`);
  }

  // Extract band, and a blurred copy of the same band.
  const bandBuf = Buffer.alloc(W * bandH * 3);
  data.copy(bandBuf, 0, bandY * W * 3, (bandY + bandH) * W * 3);

  const blurred = await sharp(bandBuf, { raw: { width: W, height: bandH, channels: 3 } })
    .blur(5)
    .raw()
    .toBuffer();

  for (let i = 0; i < bandBuf.length; i++) {
    const d = bandBuf[i] - blurred[i];
    acc[i] += d;
    accAbs[i] += Math.abs(d);
  }
  n++;
  process.stdout.write(`\r  processed ${n}/${files.length}`);
}
console.log("");

// Mean signed deviation = the mark's fingerprint.
const mean = new Float32Array(acc.length);
let maxAbs = 0;
for (let i = 0; i < acc.length; i++) {
  mean[i] = acc[i] / n;
  if (Math.abs(mean[i]) > maxAbs) maxAbs = Math.abs(mean[i]);
}
console.log(`peak mean deviation: ${maxAbs.toFixed(2)} (of 255)`);

// Consistency ratio: |mean| / mean|dev|. Near 1 => same every frame (the mark).
// Near 0 => cancels out (real room edges).
const vis = Buffer.alloc(W * bandH * 3);
const ratioMap = new Float32Array(W * bandH);
for (let p = 0; p < W * bandH; p++) {
  let sMean = 0, sAbs = 0;
  for (let c = 0; c < 3; c++) { sMean += mean[p * 3 + c]; sAbs += accAbs[p * 3 + c] / n; }
  const ratio = sAbs > 0.5 ? Math.abs(sMean) / sAbs : 0;
  ratioMap[p] = ratio;
  const amp = Math.min(255, Math.abs(sMean / 3) * 26);
  vis[p * 3] = amp; vis[p * 3 + 1] = amp; vis[p * 3 + 2] = Math.min(255, ratio * 255);
}

await sharp(vis, { raw: { width: W, height: bandH, channels: 3 } })
  .png()
  .toFile(path.join(OUT, "stack-mean.png"));

// Where is the mark, in fractions of the FULL frame?
let minX = W, maxX = 0, minY = bandH, maxY = 0, strong = 0;
for (let y = 0; y < bandH; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    let s = 0; for (let c = 0; c < 3; c++) s += Math.abs(mean[p * 3 + c]);
    if (s / 3 > 2.2 && ratioMap[p] > 0.45) {
      strong++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
console.log(`strong+consistent pixels: ${strong}`);
if (strong > 200) {
  console.log(`mark bbox in band: x ${minX}..${maxX}, y ${minY}..${maxY}`);
  console.log(`as frame fractions: x ${(minX / W).toFixed(4)}..${(maxX / W).toFixed(4)}  y ${((bandY + minY) / H).toFixed(4)}..${((bandY + maxY) / H).toFixed(4)}`);
} else {
  console.log("NOT ENOUGH consistent signal — mark may not be pixel-aligned across frames.");
}
console.log(`\nwrote ${path.join(OUT, "stack-mean.png")} — R/G = deviation strength, B = cross-frame consistency`);
