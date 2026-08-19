import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from "remotion";

/**
 * Kito Oak Haven — desktop hero loop.
 *
 * Deliberately NOT the social reel. That one has labels, an end card and a
 * 9:16 canvas because its job is to send people here. This one sits *behind*
 * the headline, so it carries no text at all and must never pull focus from
 * the words on top of it.
 *
 * Three properties it has to have:
 *
 *  1. SEAMLESS. Opacity is a circular function of frame, so the last shot
 *     dissolves back into the first with no visible cut at the wrap point.
 *  2. SLOW. Every move is under 8% over three seconds. A hero that moves fast
 *     reads as a slideshow; a hero that barely moves reads as photography that
 *     happens to breathe.
 *  3. LANDSCAPE ONLY. All five frames are native 6720x4480, so a 1920x1080
 *     canvas is a downscale — no upscaling artefacts anywhere.
 *
 * Desktop only. The mobile hero stays a still: shipping this over Kenyan
 * mobile data would cost more bookings than the motion wins.
 */

const SHOTS = [
  { slug: "hero-bedroom", dir: 1 },  // establish — the brightest frame
  { slug: "living-wide", dir: -1 },  // warmth, the terracotta comes in
  { slug: "living-close", dir: 1 },  // texture, closer in
  { slug: "balcony", dir: -1 },      // the view: this is the beat that lands
  { slug: "bed-city", dir: 1 },      // close on the city from the bed
] as const;

const FPS = 30;
const SHOT = 3 * FPS;              // 3s per frame
const FADE = 0.8 * FPS;            // 0.8s dissolve
export const HERO_DURATION = SHOT * SHOTS.length; // 15s, loops cleanly

/** Shortest distance between two points on a circle of length `len`. */
const circDist = (a: number, b: number, len: number) => {
  const d = Math.abs(a - b) % len;
  return Math.min(d, len - d);
};

export const HeroLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const cycle = HERO_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: "#faf7f1" }}>
      {SHOTS.map((shot, i) => {
        const centre = i * SHOT + SHOT / 2;
        const d = circDist(frame, centre, cycle);

        // Plateau at full opacity, then ramp down across the dissolve window.
        const opacity = interpolate(
          d,
          [(SHOT - FADE) / 2, (SHOT + FADE) / 2],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        if (opacity <= 0.001) return null;

        // Ken Burns, measured from this shot's own start so each entrance is
        // fresh. Direction alternates so consecutive shots never drift the
        // same way — that repetition is what makes motion feel automated.
        const local = ((frame - i * SHOT) % cycle + cycle) % cycle;
        const scale = interpolate(local, [0, SHOT + FADE], [1.075, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const shift = interpolate(local, [0, SHOT + FADE], [0, 1.6 * shot.dir], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <AbsoluteFill key={shot.slug} style={{ opacity }}>
            <Img
              src={staticFile(`gallery/${shot.slug}-2400.jpg`)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale}) translateX(${shift}%)`,
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
