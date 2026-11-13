"use client";

import { useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef } from "react";
import text from "@/content/ui/landing.json";

// The four mascots in 3D, in the Projects section of the landing page (components/mascots-3d/stage.tsx). The page
// loads three.js after its text and buttons, so the page is quick on a phone. Until then, only the green glow shows: no
// 2D stand-in, so the learner does not see the mascots change from 2D to 3D. The scene fades in at its first frame.
// The scene draws frames only while it is on the screen, so it does not slow the hero board (issue #173).

const BandScene = dynamic(() => import("@/components/mascots-3d/stage"), { ssr: false, loading: () => null });

export function MascotBand() {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useInView(ref);
  return (
    <div ref={ref} role="img" aria-label={text.band.label} className="relative h-full w-full">
      <div className="absolute inset-x-[10%] bottom-[12%] h-1/2 rounded-full bg-emerald opacity-20 blur-[80px]" aria-hidden="true" />
      <BandScene paused={!onScreen} />
    </div>
  );
}
