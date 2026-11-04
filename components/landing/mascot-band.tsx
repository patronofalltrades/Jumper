"use client";

import dynamic from "next/dynamic";
import { Mascot } from "@/components/art/mascot";
import text from "@/content/ui/landing.json";
import type { MascotId } from "@/lib/game/project-mascot";

// The hero of the landing page: the four mascots in 3D (components/mascots-3d/stage.tsx). The page loads three.js after
// its text and buttons, so the page is quick on a phone; until then, the 2D mascots stand in the same order.

const ORDER: MascotId[] = ["bulb", "volt", "knob", "coil"];

function FlatBand() {
  return (
    <div className="flex h-full items-end justify-center gap-1 px-6 pb-[18%]" aria-hidden="true">
      {ORDER.map((id) => (
        <Mascot key={id} id={id} pose="idle" className="w-1/4 max-w-32" />
      ))}
    </div>
  );
}

const BandScene = dynamic(() => import("@/components/mascots-3d/stage"), { ssr: false, loading: FlatBand });

export function MascotBand() {
  return (
    <div role="img" aria-label={text.band.label} className="relative h-full w-full">
      <div className="absolute inset-x-[10%] bottom-[12%] h-1/2 rounded-full bg-[#22d66b] opacity-20 blur-[80px]" aria-hidden="true" />
      <BandScene />
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0e1512]/85 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white">
        <span className="hidden [@media(hover:hover)]:inline">{text.band.hint}</span>
        <span className="[@media(hover:hover)]:hidden">{text.band.hint_touch}</span>
      </span>
    </div>
  );
}

