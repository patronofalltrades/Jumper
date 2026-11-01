"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { useReducedMotion } from "@/components/walkthrough/clip-player";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import text from "@/content/ui/build.json";
import { BoardContext, boardStore, createBoardStore, FinishContext } from "@/lib/game/board-store";
import { clearForDemo, demoFrames, showFrame } from "@/lib/game/build-demo";
import type { Clip } from "@/lib/game/walkthrough";

// "Build it for me" (issue #115). The button sits beside Check. The demo plays over the board, in its own store, so the
// board of the learner, its engine and its autosave do not see it (lib/game/build-demo.ts).

const BuildScene = dynamic(() => import("@/components/scene/build-scene"), { ssr: false });

const t = text.buildForMe;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** True while the demo plays. The button and the demo are in different places on the page. */
const demo = createStore<{ running: boolean }>(() => ({ running: false }));
const stop = () => demo.setState({ running: false });
/** True while the demo plays. The phone pop-up sheet hides then. */
export const useDemoRunning = () => useStore(demo, (s) => s.running);

const press =
  "min-h-12 rounded-xl border border-b-4 px-6 text-base font-extrabold tracking-wide shadow-panel outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2";

/** The "Build it for me" button. It asks once, then clears the parts of the learner and starts the demo. */
export function BuildForMe({ clip }: { clip: Clip | null }) {
  const running = useDemoRunning();
  if (!clip || running) return null;
  const start = () => {
    clearForDemo(boardStore);
    demo.setState({ running: true });
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={`${press} border-border bg-card text-foreground max-sm:min-h-11 max-sm:px-3 max-sm:text-sm`}>
          {t.button}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t.title}</DialogTitle>
        <DialogDescription>{t.body}</DialogDescription>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <button type="button" className={`${press} border-border bg-card text-foreground`}>
              {t.no}
            </button>
          </DialogClose>
          <DialogClose asChild>
            <button type="button" onClick={start} className={`${press} border-primary-deep bg-primary text-primary-foreground`}>
              {t.yes}
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The demo over the board, while it plays. Mount it in the board area of the build page. */
export function BuildDemo({ clip, position }: { clip: Clip | null; position: number }) {
  const running = useDemoRunning();
  // The learner leaves the page during the demo: the next level does not start with it.
  useEffect(() => {
    return stop;
  }, []);
  return clip && running ? <Player clip={clip} position={position} /> : null;
}

function Player({ clip, position }: { clip: Clip; position: number }) {
  const reduced = useReducedMotion();
  const store = useMemo(() => createBoardStore(), []);
  // The start board of the level: the board of the learner is on it now, because the button cleared it.
  const [{ base, bench }] = useState(() => boardStore.getState());
  const frames = useMemo(() => demoFrames(clip, base, reduced, fill(t.end, { n: position })), [clip, base, reduced, position]);
  const [index, setIndex] = useState(0);
  const frame = frames[Math.min(index, frames.length - 1)];
  const stopButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    showFrame(store, frame, clip, bench, base);
    const timer = setTimeout(() => (index >= frames.length - 1 ? stop() : setIndex(index + 1)), frame.wait);
    return () => clearTimeout(timer);
  }, [store, frame, clip, bench, base, index, frames.length]);

  // The board is read-only while the demo plays: Esc stops it, and no other key (Undo, a tool) gets to the board.
  useEffect(() => {
    stopButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Enter" || e.key === " ") return;
      e.stopImmediatePropagation();
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <>
      {/* This cover takes the clicks on the rest of the page: the tool bar, Undo and the header. */}
      <div className="fixed inset-0 z-30" aria-hidden="true" />
      <section aria-label={fill(t.label, { n: position })} className="absolute inset-0 z-40 bg-background">
        <BoardContext value={store}>
          <FinishContext value={clip.order}>
            <BuildScene />
          </FinishContext>
        </BoardContext>
        {/* The demo is to watch, not to build: this cover takes the clicks, taps and drags on the board. */}
        <div className="absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-x-3 bottom-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-panel sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <p className="min-h-4 font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {frame.task !== null && fill(t.step, { n: frame.task + 1, total: clip.plan.tasks.length })}
          </p>
          <p aria-live="polite" className="min-h-[3rem] text-base font-bold">
            {frame.caption}
          </p>
          <button ref={stopButton} type="button" onClick={stop} className={`${press} self-center border-border bg-card text-foreground`}>
            {t.stop}
          </button>
        </div>
      </section>
    </>
  );
}
