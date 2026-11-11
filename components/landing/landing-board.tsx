"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import text from "@/content/ui/landing.json";
import type { Part } from "@/lib/circuit/parts";
import { introVideo, videoSrc } from "@/lib/content/videos";
import { deviceKind, hasWebGL, prefersVideo } from "@/lib/device";
import { BoardContext, createBoardStore } from "@/lib/game/board-store";
import { landingParts } from "@/lib/game/landing";

// The hero of the landing page (issue #171): the 3D bench of Perch, which wires itself one part at a time, then starts
// again. The page loads three.js after its text and buttons, so the page is quick on a phone. Until then, a still
// picture of the finished board shows.

const Still = () => <Image src={text.board.still} alt="" fill priority sizes="(min-width: 1152px) 1088px, 100vw" className="object-contain" />;

const BuildScene = dynamic(() => import("@/components/scene/build-scene"), { ssr: false, loading: Still });

/** The time between two parts. */
const TICK_MS = 700;

/** How the board shows: not known before the browser is read, then 3D, or the recorded clip on a slow device. */
type Mode = "wait" | "3d" | { video: string };

/**
 * The visitor cannot wire on the board: a link covers it, and a click or a tap on it opens the onboarding. The link
 * also keeps the wheel and the finger for the page scroll. The board has its own store, so it never changes the board
 * of a learner. With reduced motion, the board is finished.
 */
export function LandingBoard({ order }: { order: Part[] }) {
  const store = useMemo(() => createBoardStore(), []);
  const [mode, setMode] = useState<Mode>("wait");

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const video = introVideo();
    const slow = prefersVideo({ webgl: hasWebGL(), cores: nav.hardwareConcurrency ?? 8, memory: nav.deviceMemory });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser is known only after the first paint
    setMode(slow && video ? { video: videoSrc(video.id, deviceKind(window.innerWidth)) } : "3d");
  }, []);

  useEffect(() => {
    if (mode !== "3d") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tick = 0;
    store.getState().open("landing", { readOnly: true });
    store.setState({ parts: landingParts(order, tick, reduced) });
    if (reduced) return;
    const timer = setInterval(() => store.setState({ parts: landingParts(order, ++tick, false) }), TICK_MS);
    return () => clearInterval(timer);
  }, [mode, order, store]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-[12%] bottom-[8%] h-1/2 rounded-full bg-[#22d66b] opacity-20 blur-[90px]" aria-hidden="true" />
      {mode === "wait" && <Still />}
      {mode === "3d" && (
        <BoardContext.Provider value={store}>
          <BuildScene />
        </BoardContext.Provider>
      )}
      {typeof mode === "object" && <video src={mode.video} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full rounded-[1.25rem] object-cover" />}
      <Link href="/start" aria-label={text.board.label} className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-4 focus-visible:ring-ring" />
    </div>
  );
}
