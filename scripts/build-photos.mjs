// Kito Oak Haven — responsive export from the clean 19 Aug 2026 shoot.
//
// HISTORY: v1 of this file existed to dodge a photographer's watermark strip by
// cropping every frame to a window that cleared it. That is why the old heroes
// came out at 2.0-2.5:1 — they were not art direction, they were evasion.
//
// The 19 Aug re-shoot ("OAK CLASSIC REDO", 64 frames, 6720x4480, no watermark)
// makes all of that dead. Every window below is the FULL FRAME. Crops are done
// at render time in CSS via `focus`, so the same export serves a tight mobile
// portrait and a wide desktop band without re-encoding.
//
// Casting follows STORYBOARD.md v3. Frames listed under "MUST NEVER APPEAR"
// there (laundry, water heater, exposed plumbing) are absent by design.
import sharp from "sharp";
import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const SRC = "C:/Users/Alexx/Videos/Self_improvement/kito-oak-haven-site/scripts/_originals/OAK CLASSIC REDO";
const ROOT = "C:/Users/Alexx/Videos/Self_improvement/kito-oak-haven-site";
const OUT = path.join(ROOT, "public/gallery");
const WIDTHS = [2400, 1600, 1000, 600];

sharp.cache(false);
sharp.concurrency(2);

// `focus` is a CSS object-position value. It is the art direction: it decides
// what survives when a component crops this frame to a band or a tall column.
const PLAN = [
  // ---- BEAT 0: the trailer ----
  { slug: "hero-bedroom", src: "KRC_8582", focus: "50% 45%",
    alt: "Bright bedroom with a white bed, round mirror and a globe chandelier under blown-out window light",
    caption: "Your key to Kilimani" },

  // ---- BEAT 1: arrival ----
  { slug: "arrival-door", src: "KRC_8575", focus: "60% 50%",
    alt: "Entry door beside a round hardwood dining table with burnt-orange chairs and a sculptural wall mirror",
    caption: "No keys, no waiting" },

  // ---- BEAT 2: the light ----
  { slug: "living-wide", src: "KRC_8596", focus: "50% 55%",
    alt: "Open living room with two cream sofas, a white coffee table and red and terracotta cushions",
    caption: "The living room" },
  { slug: "living-close", src: "KRC_8593", focus: "50% 50%",
    alt: "Cream sofa dressed with red and plaid cushions beneath a row of framed prints",
    caption: "Sink in" },

  // ---- BEAT 3: gather (the horizontal strip) ----
  { slug: "dining-wide", src: "KRC_8576", focus: "50% 55%",
    alt: "Round hardwood dining table with four burnt-orange chairs on a faded rug",
    caption: "Room to gather" },
  { slug: "mirror-detail", src: "KRC_8607", focus: "50% 45%",
    alt: "Sculptural free-form wall mirror with a dried pampas stem beside it",
    caption: "The house jewellery" },
  { slug: "table-setting", src: "KRC_8604", focus: "50% 55%",
    alt: "Dark wood table laid with black slate plates, a glass vase of pampas grass and a wine glass",
    caption: "Host quietly" },
  { slug: "kitchen", src: "KRC_8610", focus: "50% 50%",
    alt: "Compact white kitchen with a gas cooktop, coffee maker and stainless sink under a window",
    caption: "The kitchen is not a prop" },
  { slug: "kitchen-detail", src: "KRC_8613", focus: "50% 50%",
    alt: "Two-burner gas cooktop with cookware, set into a white stone counter",
    caption: "Cook properly" },

  // ---- BEAT 4: rest ----
  { slug: "bedroom-still", src: "KRC_8570", focus: "50% 50%",
    alt: "King bed in white cotton beside a blue-grey vanity, round mirror and soft grey rug",
    caption: "The bed you will mention in your review" },

  // ---- BEAT 5: reset ----
  { slug: "shower", src: "KRC_8592", focus: "50% 45%",
    alt: "Walk-in rainfall shower behind clear glass, lit by a tall window",
    caption: "Rainfall pressure, hot always" },
  { slug: "bathroom-vanity", src: "KRC_8590", focus: "50% 50%",
    alt: "Bathroom vanity with a wide mirror, sage cabinet and glass shower screen beyond",
    caption: "The bathroom" },

  // ---- BEAT 6: above the city ----
  { slug: "balcony", src: "KRC_8578", focus: "50% 50%",
    alt: "Balcony bench and timber table with a bowl of fruit, looking out over the Nairobi skyline",
    caption: "Seventh-floor mornings" },
  { slug: "balcony-door", src: "KRC_8588", focus: "55% 50%",
    alt: "Sliding balcony door framed by curtains, opening onto seating and the city beyond",
    caption: "The way out to the air" },

  // ---- BEAT 7: the building ----
  { slug: "gym-wide", src: "KRC_8631", focus: "50% 50%",
    alt: "Residents gym with cardio machines and benches along a wall of windows",
    caption: "A gym you would actually use" },
  { slug: "gym-weights", src: "KRC_8633", focus: "50% 50%",
    alt: "Free weights, dumbbell rack and benches in a mirrored gym",
    caption: "Free weights and racks" },
  { slug: "gym-floor", src: "KRC_8628", focus: "50% 50%",
    alt: "Gym floor with resistance machines and a treadmill under natural light",
    caption: "Open from six" },

  // ---- BEAT 7 continued: the pool ----
  // Client-supplied via WhatsApp, so it lands at 1200x1600 rather than the
  // shoot's 6720x4480. Fine at card size; do NOT use it full-bleed.
  { slug: "pool", src: "POOL_01", focus: "50% 55%",
    alt: "Indoor heated pool with blue mosaic tiling, loungers and a wall of windows",
    caption: "Heated pool, indoors" },

  // ---- BEAT 8: the view from bed ----
  { slug: "bed-city", src: "KRC_8586", focus: "50% 50%",
    alt: "Bed beside a floor-to-ceiling window looking across the Kilimani skyline",
    caption: "Wake up over the city" },
  { slug: "bed-city-alt", src: "KRC_8587", focus: "50% 50%",
    alt: "Morning light across a white bed with the city visible through the window",
    caption: "Morning, seven floors up" },

  // ---- supporting detail ----
  { slug: "entry-through", src: "KRC_8585", focus: "50% 55%",
    alt: "View from the entry hallway past a console table through to the dining and living area",
    caption: "The way in" },
  { slug: "console", src: "KRC_8573", focus: "50% 50%",
    alt: "Dark wood console table with a woven basket and a dried stem in a vase",
    caption: "The entry" },
  { slug: "living-media", src: "KRC_8600", focus: "50% 50%",
    alt: "Wall-mounted smart TV and soundbar above a low white media unit",
    caption: "Smart TV and soundbar" },
];

// ---------------------------------------------------------------- build ----
const ONLY = (process.env.ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const TARGETS = ONLY.length ? PLAN.filter((p) => ONLY.includes(p.slug)) : PLAN;
if (ONLY.length) console.log(`ONLY set — rebuilding ${TARGETS.length} of ${PLAN.length} frames.`);

const missing = [];
for (const p of TARGETS) {
  try { await stat(path.join(SRC, `${p.src}.jpg`)); }
  catch { missing.push(p.src); }
}
if (missing.length) {
  console.error("REFUSING TO BUILD — source frames not found:");
  for (const m of missing) console.error(`  ${m}.jpg`);
  process.exit(1);
}
console.log(`${TARGETS.length} frames located in the clean set. No watermark windows needed.`);

await mkdir(OUT, { recursive: true });

let manifest = {};
if (ONLY.length) {
  const { readFile } = await import("node:fs/promises");
  try { manifest = JSON.parse(await readFile(path.join(ROOT, "src/lib/photos.json"), "utf8")); } catch {}
  for (const s of ONLY) delete manifest[s];
}
for (let i = 0; i < TARGETS.length; i++) {
  const p = TARGETS[i];
  const file = path.join(SRC, `${p.src}.jpg`);
  const meta = await sharp(file).metadata();
  const { width, height } = meta;

  const base = sharp(file);
  const sizes = WIDTHS.filter((w) => w <= width);
  if (!sizes.length) sizes.push(width);

  for (const w of sizes) {
    const r = base.clone().resize({ width: w, kernel: "lanczos3" })
      // Gentle finishing: flat-lit interiors benefit from a touch of contrast
      // and warmth rather than shipping raw.
      .modulate({ saturation: 1.04 })
      .linear(1.03, -4)
      .sharpen({ sigma: 0.6, m1: 0.4, m2: 0.5 });
    await r.clone().avif({ quality: 60, effort: 4 }).toFile(path.join(OUT, `${p.slug}-${w}.avif`));
    await r.clone().webp({ quality: 78, effort: 4 }).toFile(path.join(OUT, `${p.slug}-${w}.webp`));
    await r.clone().jpeg({ quality: 84, mozjpeg: true, progressive: true }).toFile(path.join(OUT, `${p.slug}-${w}.jpg`));
  }

  const tiny = await base.clone().resize({ width: 24 }).blur(1.1).webp({ quality: 42 }).toBuffer();
  manifest[p.slug] = {
    alt: p.alt,
    caption: p.caption,
    focus: p.focus,
    width, height,
    aspect: +(width / height).toFixed(4),
    orient: width > height ? "landscape" : "portrait",
    widths: sizes,
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    from: p.src,
  };
  process.stdout.write(`\r  ${i + 1}/${TARGETS.length}  ${p.slug} ${width}x${height} x${sizes.length}   `);
}
console.log("");

await writeFile(path.join(ROOT, "src/lib/photos.json"), JSON.stringify(manifest, null, 2));
const files = await readdir(OUT);
let bytes = 0;
for (const f of files) bytes += (await stat(path.join(OUT, f))).size;
console.log(`wrote ${files.length} files, ${(bytes / 1048576).toFixed(1)}MB total`);
console.log(`manifest -> src/lib/photos.json (${Object.keys(manifest).length} images)`);
