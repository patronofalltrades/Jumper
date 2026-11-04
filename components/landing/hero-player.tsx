"use client";

import { Player } from "@remotion/player";
import { CardsScene, type CardsSceneProps } from "@/components/landing/hero-cards";
import { CARDS, CARDS_LOOP, CARDS_STILL } from "@/components/landing/hero-timing";

// The Remotion Player of the task-card track. hero-track.tsx loads this file after the page, so Remotion is not in
// the first load.
// - The key makes a new Player when "reduced motion" changes: the Player reads autoPlay only one time.
// - initiallyMuted: the scene has no sound. A muted Player makes no AudioContext. Without a tap from the visitor,
//   the browser stops an AudioContext, and the Player then stays on frame 0.
export default function HeroPlayer({ still, ...props }: CardsSceneProps & { still: boolean }) {
  return (
    <Player
      key={String(still)}
      component={CardsScene}
      inputProps={props}
      durationInFrames={CARDS_LOOP}
      compositionWidth={CARDS.width}
      compositionHeight={CARDS.height}
      fps={CARDS.fps}
      initialFrame={still ? CARDS_STILL : 0}
      autoPlay={!still}
      loop
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      numberOfSharedAudioTags={0}
      initiallyMuted
      acknowledgeRemotionLicense
      style={{ width: "100%", aspectRatio: `${CARDS.width} / ${CARDS.height}` }}
    />
  );
}
