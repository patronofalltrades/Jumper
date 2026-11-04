"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef } from "react";
import { CardsScene, type CardsSceneProps } from "@/components/landing/hero-cards";
import { IntroScene, type IntroSceneProps } from "@/components/landing/hero-scene";
import { CARDS, CARDS_LOOP, CARDS_STILL, INTRO } from "@/components/landing/hero-timing";

type Props = { still: boolean; onFrame?: (frame: number) => void } & ({ scene: "intro"; props: IntroSceneProps } | { scene: "cards"; props: CardsSceneProps });

// The Remotion Players of the hero. hero-intro.tsx loads this file after the page, so Remotion is not in the first load.
// - The key makes a new Player when "reduced motion" changes: the Player reads autoPlay only one time.
// - initiallyMuted: the scenes have no sound. A muted Player makes no AudioContext, and without a tap from the
//   visitor the browser stops an AudioContext, so the Player stays on frame 0.
export default function HeroPlayer({ still, onFrame, ...rest }: Props) {
  const ref = useRef<PlayerRef>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player || !onFrame) return;
    const update = (e: { detail: { frame: number } }) => onFrame(e.detail.frame);
    player.addEventListener("frameupdate", update);
    return () => player.removeEventListener("frameupdate", update);
  }, [onFrame, still]);

  const common = {
    controls: false,
    clickToPlay: false,
    doubleClickToFullscreen: false,
    spaceKeyToPlayOrPause: false,
    numberOfSharedAudioTags: 0,
    initiallyMuted: true,
    acknowledgeRemotionLicense: true,
    autoPlay: !still,
  };

  if (rest.scene === "intro") {
    return (
      <Player
        ref={ref}
        key={String(still)}
        {...common}
        component={IntroScene}
        inputProps={rest.props}
        durationInFrames={INTRO.duration}
        compositionWidth={INTRO.width}
        compositionHeight={INTRO.height}
        fps={INTRO.fps}
        initialFrame={still ? INTRO.duration - 1 : 0}
        moveToBeginningWhenEnded={false}
        style={{ width: "100%", aspectRatio: `${INTRO.width} / ${INTRO.height}` }}
      />
    );
  }
  return (
    <Player
      ref={ref}
      key={String(still)}
      {...common}
      component={CardsScene}
      inputProps={rest.props}
      durationInFrames={CARDS_LOOP}
      compositionWidth={CARDS.width}
      compositionHeight={CARDS.height}
      fps={CARDS.fps}
      initialFrame={still ? CARDS_STILL : 0}
      loop
      style={{ width: "100%", aspectRatio: `${CARDS.width} / ${CARDS.height}` }}
    />
  );
}
