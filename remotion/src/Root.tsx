import React from "react";
import { Composition } from "remotion";
import { Reel, REEL_DURATION } from "./Reel";
import { HeroLoop, HERO_DURATION } from "./HeroLoop";

export const RemotionRoot: React.FC = () => (
  <>
    {/* Vertical — Instagram Reels, TikTok, WhatsApp Status. The main cut. */}
    <Composition
      id="reel-vertical"
      component={Reel}
      durationInFrames={REEL_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    {/* Square — feed posts. */}
    <Composition
      id="reel-square"
      component={Reel}
      durationInFrames={REEL_DURATION}
      fps={30}
      width={1080}
      height={1080}
    />
    {/* Landscape — YouTube, or an embed if one is ever wanted. */}
    <Composition
      id="reel-wide"
      component={Reel}
      durationInFrames={REEL_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
    {/* Desktop site hero — no text, seamless loop, sits behind the headline. */}
    <Composition
      id="hero-loop"
      component={HeroLoop}
      durationInFrames={HERO_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
