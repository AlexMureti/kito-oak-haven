# Kito Oak Haven — social reel (Remotion)

A 9:16 vertical cut for Instagram Reels, TikTok and WhatsApp Status, plus
square and landscape variants. Six shots, ~2.3s each, slow alternating camera
drift, gold end card with the direct-booking line.

**Not installed yet** — installing Remotion pulls a headless Chromium (~150MB+),
so that step is left for you to run deliberately:

```bash
cd remotion && npm install
```

Then either open the visual editor:

```bash
cd remotion && npm run studio
```

or render straight to a file:

```bash
cd remotion && npm run render
```

Output lands in `remotion/out/`. Rendering 400 frames at 1080x1920 on this
laptop takes a few minutes; `Config.setConcurrency(2)` in `remotion.config.ts`
keeps the machine usable while it works.

## Why the site hero is not this video

The website hero is a cross-fading still sequence, not an MP4. It gets the same
walkthrough feel for roughly 250KB instead of several megabytes, starts on the
first frame with no buffering, and does not punish a guest browsing on Kenyan
mobile data. Video earns its cost as a *distribution* asset — something that
plays inside Instagram and sends people to the site — which is exactly what
this renders.

## Source images

`Config.setPublicDir("../public")` points Remotion at the site's own
`public/gallery/*-2400.jpg` crops, so the reel and the site can never drift out
of sync. Re-run `node scripts/build-photos.mjs` in the site root and the reel
picks up the new frames automatically.
