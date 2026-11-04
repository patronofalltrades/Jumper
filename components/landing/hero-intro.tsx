"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useSyncExternalStore } from "react";
import type { CardsSceneProps } from "@/components/landing/hero-cards";
import { CARDS, INTRO, wireDrawn } from "@/components/landing/hero-timing";

// The hero of the landing page (throwaway prototype): the headline with a wire that draws under it, the Volt intro,
// and the task cards. The headline and the body are server HTML, so they show at once and a screen reader reads them.
// The intro Player frame also draws the wire under the headline, so both use one timeline.

const HeroPlayer = dynamic(() => import("@/components/landing/hero-player"), { ssr: false });

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (fn: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", fn);
  return () => query.removeEventListener("change", fn);
};
const useStill = () => useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED).matches, () => true);

export function HeroIntro({ title, body, volt }: { title: string; body: string; volt: string }) {
  const still = useStill();
  const wire = useRef<SVGPathElement>(null);
  const onFrame = useCallback((frame: number) => wire.current?.setAttribute("stroke-dashoffset", String(1 - wireDrawn(frame))), []);

  return (
    <>
      <h1 className="relative pb-3 text-4xl leading-[0.98] font-extrabold tracking-tight sm:text-5xl">
        {title}
        <svg viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-3 w-2/3" aria-hidden>
          <path ref={wire} d="M2 6 C 60 0, 120 12, 180 6 S 280 2, 298 6" fill="none" stroke="var(--pcb)" strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={still ? 0 : 1} />
        </svg>
      </h1>
      <p className="text-base text-muted-foreground">{body}</p>
      <p className="sr-only">{volt}</p>
      <div aria-hidden className="-mx-2" style={{ aspectRatio: `${INTRO.width} / ${INTRO.height}` }}>
        <HeroPlayer scene="intro" still={still} onFrame={onFrame} props={{ volt }} />
      </div>
    </>
  );
}

// The task cards under the hero. The cards are decoration; the "How Jumper works" panel has the same steps as text.
export function HeroCards(props: CardsSceneProps) {
  const still = useStill();
  return (
    <div aria-hidden style={{ aspectRatio: `${CARDS.width} / ${CARDS.height}` }}>
      <HeroPlayer scene="cards" still={still} props={props} />
    </div>
  );
}
