"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import text from "@/content/ui/landing.json";
import type { Part } from "@/lib/circuit/parts";
import { boardStore } from "@/lib/game/board-store";
import { landingParts } from "@/lib/game/landing";

// The landing page loads three.js after its text and buttons, so the page is quick on a phone.
// It is the one exception to TRD 12.1, with build mode and the snapshot pages (issue #46).
const BuildScene = dynamic(() => import("@/components/scene/build-scene"), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">{text.board.loading}</p>,
});

/** The time between two parts. */
const TICK_MS = 700;

/**
 * The 3D bench of Perch, which wires itself one part at a time, then starts again. The visitor cannot wire on it:
 * a link covers the canvas, and a click or a tap on it opens the sign-up page. With reduced motion, the board is finished.
 */
export function LandingBoard({ order }: { order: Part[] }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tick = 0;
    boardStore.getState().open("landing", { readOnly: true });
    boardStore.setState({ parts: landingParts(order, tick, reduced) });
    if (reduced) return;
    const timer = setInterval(() => boardStore.setState({ parts: landingParts(order, ++tick, false) }), TICK_MS);
    return () => clearInterval(timer);
  }, [order]);

  return (
    <div className="relative h-full w-full">
      <BuildScene />
      <Link href="/signup" aria-label={text.board.label} className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-4 focus-visible:ring-ring" />
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#13202a]/85 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white">
        {text.board.hint}
      </span>
    </div>
  );
}
