import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Easing,
} from "remotion";
import { site } from "../../src/lib/site";

/**
 * Kito Oak Haven — social reel.
 *
 * This is a distribution asset, not the website hero. A 9:16 vertical cut for
 * Instagram Reels / TikTok / WhatsApp Status, whose job is to send people to
 * the site. The site's own hero is a still sequence because shipping a
 * multi-megabyte MP4 to Kenyan mobile data would cost more conversions than
 * the motion wins.
 *
 * The source crops are wide (2:1 to 3:1) and this canvas is 9:16, so each shot
 * is scaled to cover and given a slow opposing drift — the wide frame becomes
 * the camera move rather than a problem.
 */

export const SHOTS = [
  { slug: "dining", label: "Arrive", dir: 1 },
  { slug: "living-hero", label: "Settle in", dir: -1 },
  { slug: "kitchen", label: "Cook properly", dir: 1 },
  { slug: "bedroom-hero", label: "Sleep well", dir: -1 },
  { slug: "balcony-hero", label: "Seventh floor", dir: 1 },
  { slug: "detail-mirror", label: "Kilimani, Nairobi", dir: -1 },
] as const;

const SHOT_FRAMES = 70; // ~2.33s at 30fps
const DISSOLVE = 12;

const GOLD = "#d7b878";
const PINE = "#061310";

function Shot({ slug, dir, label }: { slug: string; dir: number; label: string }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const t = frame / SHOT_FRAMES;
  // Slow push plus a lateral drift, direction alternating between shots so the
  // cuts feel like one continuous handheld move rather than a slideshow.
  const scale = interpolate(t, [0, 1], [1.14, 1.24], { easing: Easing.inOut(Easing.ease) });
  const shiftX = interpolate(t, [0, 1], [0, dir * -0.045 * width]);

  const fadeIn = interpolate(frame, [0, DISSOLVE], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [SHOT_FRAMES - DISSOLVE, SHOT_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const captionIn = interpolate(frame, [DISSOLVE, DISSOLVE + 16], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), backgroundColor: PINE }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(`gallery/${slug}-2400.jpg`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateX(${shiftX}px)`,
          }}
        />
      </AbsoluteFill>

      {/* Grade: lift the blacks toward pine, warm the highlights toward gold. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, rgba(6,19,16,.42) 0%, rgba(6,19,16,.06) 34%, rgba(6,19,16,.55) 78%, rgba(6,19,16,.92) 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: height * 0.16,
        }}
      >
        <div
          style={{
            opacity: captionIn,
            transform: `translateY(${(1 - captionIn) * 24}px)`,
            fontFamily: "Georgia, serif",
            fontSize: width * 0.075,
            color: "#faf7f1",
            letterSpacing: "-0.01em",
            textShadow: "0 2px 30px rgba(6,19,16,.6)",
          }}
        >
          {label}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Reel() {
  const { width, height, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // End card holds over the last shot.
  const endStart = durationInFrames - 58;
  const endIn = interpolate(frame, [endStart, endStart + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: PINE }}>
      {SHOTS.map((s, i) => (
        <Sequence
          key={s.slug}
          from={i * (SHOT_FRAMES - DISSOLVE)}
          durationInFrames={SHOT_FRAMES}
        >
          <Shot slug={s.slug} dir={s.dir} label={s.label} />
        </Sequence>
      ))}

      <AbsoluteFill
        style={{
          opacity: endIn,
          justifyContent: "center",
          alignItems: "center",
          // .78 let the final shot's caption ghost through behind the card,
          // showing "Kilimani, Nairobi" twice — once sharp, once blurred, which
          // reads as a render fault rather than depth.
          background: "rgba(6,19,16,.95)",
        }}
      >
        <div style={{ textAlign: "center", padding: width * 0.1 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: width * 0.115,
              lineHeight: 1.04,
              color: "#faf7f1",
            }}
          >
            Kito Oak
            <br />
            <span style={{ color: GOLD }}>Haven</span>
          </div>
          <div
            style={{
              marginTop: height * 0.028,
              fontSize: width * 0.032,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "#d9c6a6",
            }}
          >
            Kilimani · Nairobi
          </div>
          <div
            style={{
              marginTop: height * 0.05,
              display: "inline-block",
              padding: `${height * 0.016}px ${width * 0.07}px`,
              borderRadius: 999,
              background: `linear-gradient(100deg,#8a6832,#c6a15b 30%,#f2e4c2 50%,#ad8442 80%)`,
              color: PINE,
              fontSize: width * 0.036,
              fontWeight: 600,
            }}
          >
            Book direct — 15% less
          </div>

          {/* Reels and TikTok have no clickable link, so the number has to be
              readable on the frame itself — otherwise the offer above is a
              dead end. Pulled from the site's single source of truth so the
              video can never quote a number the site has stopped using. */}
          <div
            style={{
              marginTop: height * 0.026,
              fontFamily: "Georgia, serif",
              fontSize: width * 0.042,
              color: "#faf7f1",
              letterSpacing: "0.01em",
            }}
          >
            WhatsApp {site.phone}
          </div>
          <div
            style={{
              marginTop: height * 0.008,
              fontSize: width * 0.023,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#d9c6a6",
              opacity: 0.75,
            }}
          >
            Replies {site.replyHours}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const REEL_DURATION = SHOTS.length * (SHOT_FRAMES - DISSOLVE) + DISSOLVE;
