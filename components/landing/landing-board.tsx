"use client";

import dynamic from "next/dynamic";
import { motion, motionValue, useMotionValueEvent, useScroll, type MotionValue } from "framer-motion";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import text from "@/content/ui/landing.json";
import type { Part } from "@/lib/circuit/parts";
import { introVideo, videoSrc } from "@/lib/content/videos";
import { deviceKind, hasWebGL, prefersVideo } from "@/lib/device";
import { aliveStore } from "@/lib/game/alive-store";
import { boardStore } from "@/lib/game/board-store";
import { startProgress, type Target } from "@/lib/game/engine";
import { firstWire, keptWire, levelAt, REVEAL_TICK_MS, revealMs, scrollCount } from "@/lib/game/landing";
import { cn } from "@/lib/utils";

// The hero of the landing page (issue #171), after the hero of money.x.com: one object in the middle of the page
// that shows itself one time. The 3D bench of Perch comes in with no parts, and two holes glow. The visitor makes the
// first wire with two taps, as in build mode, with no account. Then the other parts go in one after the other, quickly.
// If the visitor makes no wire, the board makes it after a short time. The board shows the parts of level 1.
// Then the hero stays in its place while the visitor scrolls, and the scroll puts the parts of the other levels on
// the board, level by level (issue #173). With the last part, Perch comes alive: its screen shows the face.
// The visitor can turn the board and look at its connections at each moment.
// The page loads three.js after its text, so the page is quick on a phone. Until then, only the green glow shows.

const BuildScene = dynamic(() => import("@/components/scene/build-scene"), { ssr: false, loading: () => null });

/** How the board shows: not known before the browser is read, then 3D, or the recorded clip on a slow device. */
type Mode = "wait" | "3d" | { video: string };

/** Whose turn it is: the visitor makes the first wire, then the board builds its first parts, then the scroll builds. */
type Turn = "wait" | "visitor" | "build" | "end";

/** A level of the project of the board: its name, and how many parts it adds. */
export type HeroLevel = { title: string; parts: number };

/** How far the visitor scrolls, in screen heights, while the hero stays in its place. */
const RUNWAY_VH = 150;
/** The part of the scroll that builds the board. In the remaining part, the board is finished and Perch is alive. */
const FULL_AT = 0.8;
/** The hero stays in its place only on a screen that shows all of it. */
const PIN_QUERY = "(min-height: 700px) and (prefers-reduced-motion: no-preference)";

/** The scroll position in the hero, 0 to 1, or null when the hero does not stay in its place. */
const ScrollContext = createContext<MotionValue<number> | null>(null);
const STILL = motionValue(0);

/**
 * The hero and the space below it. The hero (`children`) stays in its place while the visitor scrolls through the
 * space. With reduced motion, on a low screen, or with no JavaScript, there is no space, and the page scrolls as usual.
 */
export function HeroRunway({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useEffect(() => {
    const query = window.matchMedia(PIN_QUERY);
    const read = () => setPinned(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  return (
    <div ref={ref} style={pinned ? { height: `calc(100svh + ${RUNWAY_VH}vh)` } : undefined}>
      <div className={cn(pinned && "sticky top-20")}>
        <ScrollContext value={pinned ? scrollYProgress : null}>{children}</ScrollContext>
      </div>
    </div>
  );
}

/**
 * What the hint below the board tells. `load`: no board yet. `arm`: a touch screen, before the visitor asks to try.
 * `try`, `next`, `wrong`: the visitor makes the first wire. `build` and `done`: the other parts, after the wire of
 * the visitor (`_made`) or of the board (`_auto`). `scroll`: the board waits for the scroll. `level`: the scroll
 * builds a level. `alive`: the last part is on the board. `watch`: the recorded clip.
 */
type Stage = "load" | "arm" | "try" | "next" | "wrong" | "build_made" | "build_auto" | "done_made" | "done_auto" | "scroll_made" | "scroll_auto" | "level" | "alive" | "watch";

/** If the 3D board does not come (a slow network, an error), the text and the buttons show after this time. */
const LATE_MS = 5000;
/** How long a wrong wire stays on the board. */
const WRONG_MS = 900;
/** How long the board waits for the visitor before it makes the first wire. */
const IDLE_MS = 8000;

type Props = { order: Part[]; target: Target | undefined; levels: HeroLevel[] };

/**
 * The board, and below it the hint, the text and the buttons of the hero (`children`). They come in when the board
 * is there, not before. With no JavaScript, a <noscript> rule in the page shows them.
 */
export function HeroReveal({ children, ...board }: Props & { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("load");
  const [level, setLevel] = useState(0);
  const [late, setLate] = useState(false);
  // The links take no click and no focus while they do not show. The server sends them active, for a visitor with no JavaScript.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only the browser hides the links
    setHidden(true);
    const timer = setTimeout(() => setLate(true), revealMs(board.order) + LATE_MS);
    return () => clearTimeout(timer);
  }, [board.order]);
  const shown = late || stage !== "load";
  const good = stage === "build_made" || stage === "done_made" || stage === "scroll_made" || stage === "alive";
  const hint =
    stage === "load"
      ? ""
      : stage === "level"
        ? text.board.level.replace("{number}", String(level + 1)).replace("{title}", board.levels[level]?.title ?? "")
        : text.board.hints[stage];
  return (
    <>
      <div className="mt-8 h-[15rem] w-full max-w-[46rem] sm:mt-10 sm:h-[23rem]">
        <LandingBoard {...board} onStage={setStage} onLevel={setLevel} />
      </div>
      <div className={cn("hero-after mt-6 flex flex-col items-center gap-5", shown ? "rise-in" : "opacity-0")} inert={hidden && !shown}>
        <p role="status" className={cn("min-h-5 text-sm font-medium", good ? "text-emerald" : stage === "wrong" ? "text-[#ff8a7a]" : "text-white/60")}>
          {hint}
        </p>
        {children}
      </div>
    </>
  );
}

/**
 * The board uses the task engine of build mode, with one task: the first wire. A correct wire snaps in and ends the
 * task. A wrong wire flashes red and goes away. Nothing is saved, and no account is necessary.
 * The scene writes the taps and the hole under the pointer to the shared board store, so this board uses that store,
 * as the snapshot page does. A visitor is not logged in and has no board there.
 * With a mouse, the wheel moves the page. On a touch screen, a button covers the board until the visitor asks to
 * try, so a finger moves the page. With reduced motion, the other parts go in at the same time.
 */
function LandingBoard({ order, target, levels, onStage, onLevel }: Props & { onStage: (stage: Stage) => void; onLevel: (level: number) => void }) {
  const scroll = useContext(ScrollContext);
  // The parts that the board shows before the visitor scrolls: level 1. With no scroll build, all the parts.
  const start = scroll && levels.length ? Math.min(levels[0].parts, order.length) : order.length;
  // The scroll position, in steps of 1%. The last part goes in before the end, so Perch is alive while the hero is in its place.
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(scroll ?? STILL, "change", (value) => setProgress(Math.round(value * 100) / 100));
  const count = scrollCount(scroll ? progress / FULL_AT : 0, start, order.length);
  const [mode, setMode] = useState<Mode>("wait");
  const [reduced, setReduced] = useState(false);
  // True when taps go to the board: at once with a mouse, after a tap on the cover on a touch screen.
  const [armed, setArmed] = useState(false);
  const [turn, setTurn] = useState<Turn>("wait");
  const [made, setMade] = useState(false);
  const pending = useStore(boardStore, (s) => s.pending);
  const phase = useStore(boardStore, (s) => s.progress.phase);
  const [first] = useState(() => firstWire(order, target));

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const video = introVideo();
    const slow = prefersVideo({ webgl: hasWebGL(), cores: nav.hardwareConcurrency ?? 8, memory: nav.deviceMemory });
    /* eslint-disable react-hooks/set-state-in-effect -- the browser is known only after the first paint */
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setArmed(window.matchMedia("(pointer: fine)").matches);
    setMode(slow && video ? { video: videoSrc(video.id, deviceKind(window.innerWidth)) } : "3d");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The board opens with no parts. The task engine gets the one task, and the two holes glow.
  useEffect(() => {
    if (mode !== "3d") return;
    boardStore.getState().reset();
    boardStore.getState().open("landing", first ? { plan: first.plan, progress: { ...startProgress(), phase: "task" } } : { readOnly: true });
    if (first?.wire.color) boardStore.setState({ wireColor: first.wire.color });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the board is in the store now
    setTurn(first ? "visitor" : "build");
  }, [mode, first]);

  // The visitor's turn. The right wire ends it. A wrong wire stays a short time, then it goes away.
  // If the visitor does not start a wire, the board makes it.
  useEffect(() => {
    if (turn !== "visitor") return;
    if (phase === "ready_to_check") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the task engine ended the task
      setMade(true);
      return setTurn("build");
    }
    if (phase === "mistake") {
      const timer = setTimeout(() => {
        const { progress, removePart, dismiss } = boardStore.getState();
        for (const id of progress.mistake?.parts ?? []) removePart(id);
        dismiss();
      }, WRONG_MS);
      return () => clearTimeout(timer);
    }
    if (pending) return;
    // A visitor who scrolls does not make the wire: the board makes it.
    if (count > start) return setTurn("build");
    const idle = setTimeout(() => setTurn("build"), IDLE_MS);
    return () => clearTimeout(idle);
  }, [turn, phase, pending, count, start]);

  // The board's turn: its first parts go in one time, then the board is read-only.
  const [parts, setParts] = useState<Part[]>(order);
  useEffect(() => {
    if (turn !== "build") return;
    const all = first ? [keptWire(boardStore.getState().parts[0], first.wire, first.rest), ...first.rest] : order;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the finished board, with the wire of the visitor
    setParts(all);
    boardStore.setState({ readOnly: true, plan: null, pending: null, notice: null, done: null });
    let shown = reduced ? start : 1;
    const show = () => boardStore.setState({ parts: all.slice(0, shown) });
    show();
    if (shown >= start) return setTurn("end");
    const timer = setInterval(() => {
      shown++;
      show();
      if (shown < start) return;
      clearInterval(timer);
      setTurn("end");
    }, REVEAL_TICK_MS);
    return () => clearInterval(timer);
  }, [turn, first, order, reduced, start]);

  // The scroll's turn: the scroll position sets the number of parts. With the last part, Perch comes alive.
  const alive = turn === "end" && mode === "3d" && count >= order.length;
  useEffect(() => {
    if (turn !== "end" || mode !== "3d") return;
    boardStore.setState({ parts: parts.slice(0, count) });
    onLevel(levelAt(count, levels.map((l) => l.parts)));
  }, [turn, mode, parts, count, levels, onLevel]);
  useEffect(() => {
    if (!alive) return;
    aliveStore.getState().show(levels.length, () => {});
    return () => aliveStore.getState().end();
  }, [alive, levels.length]);

  const who = made ? "made" : "auto";
  const stage: Stage =
    typeof mode === "object"
      ? "watch"
      : turn === "wait"
        ? "load"
        : turn === "build"
          ? `build_${who}`
          : turn === "end"
            ? alive
              ? "alive"
              : count > start
                ? "level"
                : scroll
                  ? `scroll_${who}`
                  : `done_${who}`
            : !armed
              ? "arm"
              : phase === "mistake"
                ? "wrong"
                : pending
                  ? "next"
                  : "try";
  useEffect(() => {
    onStage(stage);
  }, [stage, onStage]);

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-[12%] bottom-[4%] h-1/2 rounded-full bg-emerald opacity-20 blur-[90px]" aria-hidden="true" />
      {mode !== "wait" && (
        <motion.div
          className={cn("absolute inset-0", armed && "cursor-grab active:cursor-grabbing")}
          role={mode === "3d" ? "img" : undefined}
          aria-label={mode === "3d" ? text.board.label : undefined}
          initial={reduced ? false : { opacity: 0, scale: 0.86, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {mode === "3d" ? <BuildScene zoom={false} /> : <video src={mode.video} autoPlay muted loop playsInline className="h-full w-full rounded-[1.25rem] object-cover" />}
        </motion.div>
      )}
      {/* The recorded clip: the board is a link to the onboarding. A touch screen: a button gives the board to the finger. */}
      {typeof mode === "object" && <Link href="/start" aria-label={text.board.start} className={COVER} />}
      {mode === "3d" && !armed && <button type="button" onClick={() => setArmed(true)} aria-label={text.board.arm} className={COVER} />}
    </div>
  );
}

const COVER = "absolute inset-0 rounded-[1.25rem] outline-none focus-visible:ring-4 focus-visible:ring-ring";
