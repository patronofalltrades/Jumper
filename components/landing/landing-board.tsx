"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import text from "@/content/ui/landing.json";
import type { Part } from "@/lib/circuit/parts";
import { introVideo, videoSrc } from "@/lib/content/videos";
import { deviceKind, hasWebGL, prefersVideo } from "@/lib/device";
import { boardStore } from "@/lib/game/board-store";
import { landingParts, REVEAL_TICK_MS, revealMs } from "@/lib/game/landing";
import { cn } from "@/lib/utils";

// The hero of the landing page (issue #171), after the hero of money.x.com: one object in the middle of the page
// that shows itself one time. The empty 3D bench of Perch comes in, then its parts go in one after the other, quickly.
// Then the board stays finished, and a visitor with a mouse can turn it and look at its connections.
// The page loads three.js after its text, so the page is quick on a phone. Until then, only the green glow shows.

const BuildScene = dynamic(() => import("@/components/scene/build-scene"), { ssr: false, loading: () => null });

/** How the board shows: not known before the browser is read, then 3D, or the recorded clip on a slow device. */
type Mode = "wait" | "3d" | { video: string };

/** If the 3D board does not finish (a slow network, an error), the text and the buttons show after this time. */
const LATE_MS = 5000;

/**
 * The board, and below it the text and the buttons of the hero (`children`). They come in when the last part is on
 * the board, not before. With no JavaScript, a <noscript> rule in the page shows them.
 */
export function HeroReveal({ order, children }: { order: Part[]; children: ReactNode }) {
  const [done, setDone] = useState(false);
  // The links take no click and no focus while they do not show. The server sends them active, for a visitor with no JavaScript.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only the browser hides the links
    setHidden(true);
    const late = setTimeout(() => setDone(true), revealMs(order) + LATE_MS);
    return () => clearTimeout(late);
  }, [order]);
  return (
    <>
      <div className="mt-8 h-[15rem] w-full max-w-[46rem] sm:mt-10 sm:h-[23rem]">
        <LandingBoard order={order} onDone={() => setDone(true)} />
      </div>
      <div className={cn("hero-after mt-6 flex flex-col items-center gap-5", done ? "rise-in" : "opacity-0")} inert={hidden && !done}>
        <p className="hidden text-[13px] text-white/45 [@media(pointer:fine)]:block">{text.board.hint}</p>
        {children}
      </div>
    </>
  );
}

/**
 * The board is the read-only board of the snapshot page: the visitor cannot wire on it, but with a mouse the visitor
 * can turn it, and a hole or a pin under the pointer shows all that it connects to. The wheel moves the page.
 * On a touch screen a link covers the board, so a finger moves the page, and a tap opens the onboarding.
 * The scene writes the hole under the pointer to the shared board store, so this board uses that store, as the
 * snapshot page does. A visitor is not logged in and has no board there. With reduced motion, the board is finished.
 */
function LandingBoard({ order, onDone }: { order: Part[]; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("wait");
  const [reduced, setReduced] = useState(false);
  const [mouse, setMouse] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const video = introVideo();
    const slow = prefersVideo({ webgl: hasWebGL(), cores: nav.hardwareConcurrency ?? 8, memory: nav.deviceMemory });
    /* eslint-disable react-hooks/set-state-in-effect -- the browser is known only after the first paint */
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMouse(window.matchMedia("(pointer: fine)").matches);
    setMode(slow && video ? { video: videoSrc(video.id, deviceKind(window.innerWidth)) } : "3d");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The parts go in one time. The timer stops at the finished board.
  useEffect(() => {
    if (mode === "wait") return;
    // The recorded clip has no end to wait for.
    if (mode !== "3d") return onDone();
    let tick = 0;
    boardStore.getState().open("landing", { readOnly: true });
    boardStore.setState({ parts: landingParts(order, tick, reduced) });
    if (reduced) return onDone();
    const timer = setInterval(() => {
      boardStore.setState({ parts: landingParts(order, ++tick, false) });
      if (tick < order.length) return;
      clearInterval(timer);
      onDone();
    }, REVEAL_TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `onDone` is new on each render; it only sets a state
  }, [mode, order, reduced]);

  const live = mode === "3d" && mouse;
  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-[12%] bottom-[4%] h-1/2 rounded-full bg-[#22d66b] opacity-20 blur-[90px]" aria-hidden="true" />
      {mode !== "wait" && (
        <motion.div
          className={cn("absolute inset-0", live && "cursor-grab active:cursor-grabbing")}
          role={live ? "img" : undefined}
          aria-label={live ? text.board.label : undefined}
          initial={reduced ? false : { opacity: 0, scale: 0.86, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {mode === "3d" ? <BuildScene zoom={false} /> : <video src={mode.video} autoPlay muted loop playsInline className="h-full w-full rounded-[1.25rem] object-cover" />}
        </motion.div>
      )}
      {!live && <Link href="/start" aria-label={text.board.start} className="absolute inset-0 rounded-[1.25rem] outline-none focus-visible:ring-4 focus-visible:ring-ring" />}
    </div>
  );
}
