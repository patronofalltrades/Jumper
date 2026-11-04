"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { CardsSceneProps } from "@/components/landing/hero-cards";
import { CARDS } from "@/components/landing/hero-timing";

// The task-card track under the hero of the landing page. It is decoration: the "How Jumper works" and the 4 steps
// sections tell the same tasks as text. With "reduced motion", it shows one still frame.

const HeroPlayer = dynamic(() => import("@/components/landing/hero-player"), { ssr: false });

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (fn: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", fn);
  return () => query.removeEventListener("change", fn);
};

export function HeroTrack(props: CardsSceneProps) {
  const still = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED).matches, () => true);
  return (
    <div aria-hidden="true" style={{ aspectRatio: `${CARDS.width} / ${CARDS.height}` }}>
      <HeroPlayer still={still} {...props} />
    </div>
  );
}
