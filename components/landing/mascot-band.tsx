"use client";

import dynamic from "next/dynamic";
import text from "@/content/ui/landing.json";

// The hero of the landing page: the four mascots in 3D (components/mascots-3d/stage.tsx). The page loads three.js after
// its text and buttons, so the page is quick on a phone. Until then, only the green glow shows: no 2D stand-in, so the
// learner does not see the mascots change from 2D to 3D. The scene fades in at its first frame.

const BandScene = dynamic(() => import("@/components/mascots-3d/stage"), { ssr: false, loading: () => null });

export function MascotBand() {
  return (
    <div role="img" aria-label={text.band.label} className="relative h-full w-full">
      <div className="absolute inset-x-[10%] bottom-[12%] h-1/2 rounded-full bg-[#22d66b] opacity-20 blur-[80px]" aria-hidden="true" />
      <BandScene />
    </div>
  );
}
