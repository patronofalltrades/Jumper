"use client";

import dynamic from "next/dynamic";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import text from "@/content/ui/landing.json";
import type { Part } from "@/lib/circuit/parts";
import { introVideo, videoSrc } from "@/lib/content/videos";
import { deviceKind, hasWebGL, prefersVideo } from "@/lib/device";
import { BoardContext, createBoardStore } from "@/lib/game/board-store";
import { landingParts, REVEAL_TICK_MS } from "@/lib/game/landing";

// The hero of the landing page (issue #171), after the hero of money.x.com: one object in the middle of the page
// that shows itself one time. The empty 3D bench of Perch comes in, then its parts go in one after the other, quickly.
// Then the board stays finished, and it turns a small angle to follow the pointer.
// The page loads three.js after its text, so the page is quick on a phone. Until then, only the green glow shows.

const BuildScene = dynamic(() => import("@/components/scene/build-scene"), { ssr: false, loading: () => null });

/** How the board shows: not known before the browser is read, then 3D, or the recorded clip on a slow device. */
type Mode = "wait" | "3d" | { video: string };

/** The largest angle, in degrees, that the board turns to follow the pointer. */
const TILT = 5;
const SPRING = { stiffness: 60, damping: 16 };

/**
 * The visitor cannot wire on the board: a link covers it, and a click or a tap on it opens the onboarding. The link
 * also keeps the wheel and the finger for the page scroll. The board has its own store, so it never changes the board
 * of a learner. With reduced motion, the board is finished and does not move.
 */
export function LandingBoard({ order }: { order: Part[] }) {
  const store = useMemo(() => createBoardStore(), []);
  const [mode, setMode] = useState<Mode>("wait");
  const [reduced, setReduced] = useState(false);
  const turnX = useSpring(useMotionValue(0), SPRING);
  const turnY = useSpring(useMotionValue(0), SPRING);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const video = introVideo();
    const slow = prefersVideo({ webgl: hasWebGL(), cores: nav.hardwareConcurrency ?? 8, memory: nav.deviceMemory });
    /* eslint-disable react-hooks/set-state-in-effect -- the browser is known only after the first paint */
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMode(slow && video ? { video: videoSrc(video.id, deviceKind(window.innerWidth)) } : "3d");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The parts go in one time. The timer stops at the finished board.
  useEffect(() => {
    if (mode !== "3d") return;
    let tick = 0;
    store.getState().open("landing", { readOnly: true });
    store.setState({ parts: landingParts(order, tick, reduced) });
    if (reduced) return;
    const timer = setInterval(() => {
      store.setState({ parts: landingParts(order, ++tick, false) });
      if (tick >= order.length) clearInterval(timer);
    }, REVEAL_TICK_MS);
    return () => clearInterval(timer);
  }, [mode, order, store, reduced]);

  // The board follows a mouse, not a finger: a finger moves the page.
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      turnY.set((e.clientX / window.innerWidth - 0.5) * 2 * TILT);
      turnX.set((0.5 - e.clientY / window.innerHeight) * 2 * TILT);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, turnX, turnY]);

  return (
    <div className="relative h-full w-full [perspective:1400px]">
      <div className="absolute inset-x-[12%] bottom-[4%] h-1/2 rounded-full bg-[#22d66b] opacity-20 blur-[90px]" aria-hidden="true" />
      {mode !== "wait" && (
        <motion.div
          className="absolute inset-0"
          style={{ rotateX: turnX, rotateY: turnY }}
          initial={reduced ? false : { opacity: 0, scale: 0.86, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {mode === "3d" ? (
            <BoardContext.Provider value={store}>
              <BuildScene />
            </BoardContext.Provider>
          ) : (
            <video src={mode.video} autoPlay muted loop playsInline className="h-full w-full rounded-[1.25rem] object-cover" />
          )}
        </motion.div>
      )}
      <Link href="/start" aria-label={text.board.label} className="absolute inset-0 rounded-[1.25rem] outline-none focus-visible:ring-4 focus-visible:ring-ring" />
    </div>
  );
}
