// Probe the watermark's pixel signature on the ORIGINAL full-res files.
// Goal: find a channel rule that isolates the periwinkle overlay from the room.
import sharp from "sharp";
import path from "node:path";

const SRC = "C:/Users/Alexx/Downloads/KITO OAK HAVEN";
const file = process.argv[2] ?? "KRC_8542.JPG"; // kitchen: watermark sits on flat white tile

const img = sharp(path.join(SRC, file));
const meta = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const at = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2]];
};

// Scan the horizontal band where the mark lives and score "blue excess"
// over a neutral surface: B - (R+G)/2, only where R,G are close (neutral).
const rows = [];
for (let y = Math.floor(H * 0.42); y < Math.floor(H * 0.60); y += 4) {
  let maxExcess = 0, sum = 0, n = 0, hits = 0;
  for (let x = Math.floor(W * 0.28); x < Math.floor(W * 0.74); x += 4) {
    const [r, g, b] = at(x, y);
    const neutralish = Math.abs(r - g) < 26;
    const excess = b - (r + g) / 2;
    if (neutralish && r > 110) {
      sum += excess; n++;
      if (excess > maxExcess) maxExcess = excess;
      if (excess > 8) hits++;
    }
  }
  if (n > 0) rows.push({ y, avgExcess: +(sum / n).toFixed(2), maxExcess: +maxExcess.toFixed(1), hits });
}

console.log(`${file}  ${W}x${H} ch=${C} fmt=${meta.format}`);
console.log("row scan (blue-excess over neutral pixels):");
for (const r of rows) console.log(`  y=${r.y} (${(r.y / H).toFixed(3)})  avg=${r.avgExcess}  max=${r.maxExcess}  hits>8=${r.hits}`);

// Column extent on the single worst row
const worst = rows.reduce((a, b) => (b.maxExcess > a.maxExcess ? b : a), rows[0]);
let minX = W, maxX = 0;
for (let x = 0; x < W; x += 2) {
  const [r, g, b] = at(x, worst.y);
  if (Math.abs(r - g) < 26 && r > 110 && b - (r + g) / 2 > 10) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
}
console.log(`\nworst row y=${worst.y}: mark spans x ${minX}..${maxX}  (${(minX / W).toFixed(3)}..${(maxX / W).toFixed(3)})`);

// Sample actual mark pixels vs clean pixels nearby
console.log("\nsample mark pixels:");
let shown = 0;
for (let x = minX; x < maxX && shown < 8; x += 7) {
  const [r, g, b] = at(x, worst.y);
  if (b - (r + g) / 2 > 12) { console.log(`  x=${x}  rgb(${r},${g},${b})  excess=${(b - (r + g) / 2).toFixed(1)}`); shown++; }
}
console.log("clean reference pixels (same row, outside span):");
for (const x of [Math.floor(W * 0.08), Math.floor(W * 0.15), Math.floor(W * 0.85), Math.floor(W * 0.92)]) {
  const [r, g, b] = at(x, worst.y);
  console.log(`  x=${x}  rgb(${r},${g},${b})  excess=${(b - (r + g) / 2).toFixed(1)}`);
}
