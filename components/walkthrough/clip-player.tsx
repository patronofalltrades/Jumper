"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Volt } from "@/components/art/volt";
import text from "@/content/ui/walkthrough.json";
import { createBench, perchBench } from "@/lib/circuit/bench";
import { partPins } from "@/lib/circuit/parts";
import { videoSrc, videos } from "@/lib/content/videos";
import { deviceKind, hasWebGL, prefersVideo } from "@/lib/device";
import { BoardContext, createBoardStore, FinishContext } from "@/lib/game/board-store";
import { startProgress } from "@/lib/game/engine";
import { clipFrame, type Clip } from "@/lib/game/walkthrough";
import { cn } from "@/lib/utils";

// The walkthrough clip (issue #48): a 3D replay of a level, or the intro clip of the landing page. It has its own board
// store, so it never changes the board of the learner. It opens big (full screen on a phone); "Make the clip small"
// puts it in a corner on top of the page, so the learner can watch it and build at the same time.

const BuildScene = dynamic(() => import("@/components/scene/build-scene"), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">{text.loading}</p>,
});

/** How long the clip shows where the part goes, then the part in place. The first board, a pop-up or a Check step stays longer. */
const CUE_MS = 1400;
const DONE_MS = 2200;
const READ_MS = 4500;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

const query = "(prefers-reduced-motion: reduce)";
const useReducedMotion = () =>
  useSyncExternalStore(
    (change) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", change);
      return () => media.removeEventListener("change", change);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

/**
 * The recorded video of the clip (issue #49), when it plays in place of the 3D replay: on a slow device, or when the
 * browser has no WebGL. The phone file on a phone, the laptop file on a laptop.
 */
function fallbackVideo(id: string | undefined) {
  const video = videos.find((v) => v.id === id);
  if (!video) return null;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (!prefersVideo({ webgl: hasWebGL(), cores: nav.hardwareConcurrency ?? 8, memory: nav.deviceMemory })) return null;
  return { ...video, src: videoSrc(video.id, deviceKind(window.innerWidth)) };
}

const icon = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  play: icon("M7 4v16l13-8z"),
  pause: icon("M8 5v14M16 5v14"),
  replay: icon("M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"),
  small: icon("M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"),
  big: icon("M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"),
  close: icon("M6 6l12 12M18 6 6 18"),
};

type Props = { clip: Clip; title: string; onClose: () => void };

export default function ClipPlayer({ clip, title, onClose }: Props) {
  const reduced = useReducedMotion();
  const store = useMemo(() => createBoardStore(), []);
  // The bench of the project: the Uno for Arduino Foundations. A clip with no bench uses the Perch bench.
  const bench = useMemo(() => (clip.bench ? createBench(clip.bench) : perchBench()), [clip.bench]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"cue" | "done">(clip.steps[0].progress ? "cue" : "done");
  const [playing, setPlaying] = useState(true);
  const [small, setSmall] = useState(false);
  const [video] = useState(() => fallbackVideo(clip.video));
  const first = useRef<HTMLButtonElement>(null);
  const step = clip.steps[index];
  const last = index === clip.steps.length - 1;
  // With reduced motion, the clip does not play by itself: Back and Next go from one still picture to the next.
  const running = playing && !reduced && !last && !video;

  const go = (i: number) => {
    setIndex(i);
    setPhase(clip.steps[i].progress ? "cue" : "done");
  };

  // The board of the step: first where the part goes (the holes glow), then the part in place with a green flash.
  useEffect(() => {
    const frame = clipFrame(step, phase, reduced);
    const added = frame.cue ? [] : clip.order.slice(step.before, step.after);
    store.getState().open("clip", { readOnly: true, bench, faded: clip.faded });
    store.setState({
      parts: clip.order.slice(0, frame.count),
      plan: frame.cue ? clip.plan : null,
      progress: frame.cue && step.progress ? step.progress : startProgress(),
      flash: added.length ? { kind: "snap", holes: added.flatMap((p) => partPins(bench, p).map((pin) => pin.hole)), at: Date.now() } : null,
    });
  }, [store, bench, clip, step, phase, reduced]);

  useEffect(() => {
    if (!running) return;
    const wait = phase === "cue" ? CUE_MS : step.kind === "board" || step.kind === "popup" || step.kind === "check" ? READ_MS : DONE_MS;
    const timer = setTimeout(() => (phase === "cue" ? setPhase("done") : go(index + 1)), wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is new on each render; the step is the input
  }, [running, phase, index, step.kind]);

  // Esc closes the clip. The big clip covers the page, so the page does not scroll under it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (small) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => void (html.style.overflow = before);
  }, [small]);
  useEffect(() => {
    first.current?.focus();
  }, [small]);

  const controls = (
    <div className="flex items-center justify-center gap-2">
      {reduced ? (
        <>
          <Control onClick={() => go(index - 1)} disabled={index === 0} label={text.controls.back} />
          <Control ref={first} onClick={() => go(index + 1)} disabled={last} label={text.controls.next} primary />
        </>
      ) : (
        <Control
          ref={first}
          onClick={() => setPlaying(!playing)}
          disabled={last}
          label={running ? text.controls.pause : text.controls.play}
          icon={running ? ICONS.pause : ICONS.play}
          primary
          compact={small}
        />
      )}
      <Control
        onClick={() => {
          go(0);
          setPlaying(true);
        }}
        label={text.controls.replay}
        icon={ICONS.replay}
        compact={small}
      />
      <Control onClick={onClose} label={text.controls.skip} compact={small} />
    </div>
  );

  const replay = (
    <>
      <BoardContext value={store}>
        {/* The clip parts are the finished board, so a resistor or LED glows the holes where the clip puts it (issue #101). */}
        <FinishContext value={clip.order}>
          <BuildScene />
        </FinishContext>
      </BoardContext>
      {/* The clip is to watch, not to build: this cover takes the clicks, taps and drags on the board. */}
      <div className="absolute inset-0" aria-hidden="true" />
      {step.kind === "popup" && step.popup && (
        <Overlay small={small}>
          <Volt pose="happy" className="h-12 w-auto shrink-0" />
          <p className={cn("font-semibold", small ? "line-clamp-3 text-xs" : "text-sm")}>{step.popup}</p>
        </Overlay>
      )}
      {step.kind === "check" && (
        <Overlay small={small}>
          <span className="rounded-xl border-b-2 border-primary-deep bg-primary px-4 py-2 text-sm font-extrabold tracking-wide text-primary-foreground uppercase translate-y-0.5">
            {text.intro.check.button}
          </span>
          <p className="text-sm font-bold text-primary">{text.intro.check.passed}</p>
        </Overlay>
      )}
    </>
  );

  const footer = (
    <div className={cn("flex flex-col gap-2 border-t border-border", small ? "p-2" : "p-4")}>
      <div className="flex items-start gap-3">
        {step.kind === "end" && <Volt pose="cheer" label className={small ? "h-10 w-auto" : "h-16 w-auto"} />}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {fill(text.step, { n: index + 1, total: clip.steps.length })}
          </p>
          <p aria-live="polite" className={cn("font-bold", small ? "line-clamp-2 text-sm" : "min-h-[3rem] text-base sm:text-lg")}>
            {step.caption}
          </p>
          {reduced && !small && <p className="mt-1 text-xs text-muted-foreground">{text.still}</p>}
        </div>
      </div>
      {controls}
    </div>
  );

  return (
    <div
      className={cn("fixed z-50", small ? "right-3 bottom-[calc(env(safe-area-inset-bottom)+9rem)] w-[min(22rem,calc(100vw-1.5rem))] sm:right-6 sm:bottom-6" : "inset-0 grid place-items-center bg-[#13202a]/70 sm:p-6")}
    >
      <section
        role="dialog"
        aria-modal={!small}
        aria-label={title}
        className={cn(
          "flex flex-col overflow-hidden bg-card text-foreground shadow-panel",
          small ? "rounded-2xl border border-border" : "h-full w-full sm:h-[min(46rem,100%)] sm:max-w-5xl sm:rounded-[28px]",
        )}
      >
        <header className={cn("flex items-center gap-2 border-b border-border", small ? "px-3 py-1.5" : "px-4 py-2.5")}>
          <h2 className={cn("min-w-0 flex-1 truncate font-extrabold tracking-tight", small ? "text-sm" : "text-lg")}>{title}</h2>
          <IconButton onClick={() => setSmall(!small)} label={small ? text.controls.big : text.controls.small}>
            {small ? ICONS.big : ICONS.small}
          </IconButton>
          <IconButton onClick={onClose} label={text.controls.close}>
            {ICONS.close}
          </IconButton>
        </header>

        <div className={cn("relative min-h-0 bg-background", small ? "h-44" : "flex-1")}>
          {video ? (
            // With reduced motion, the video does not play by itself.
            <video src={video.src} aria-label={video.title} controls muted playsInline autoPlay={!reduced} className="size-full object-contain" />
          ) : (
            replay
          )}
        </div>

        {video ? <p className={cn("border-t border-border font-bold", small ? "line-clamp-2 p-2 text-sm" : "p-4 text-base sm:text-lg")}>{video.caption}</p> : footer}
      </section>
    </div>
  );
}

function Overlay({ small, children }: { small: boolean; children: ReactNode }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-panel sm:left-auto sm:max-w-sm", small ? "top-2" : "top-4 sm:right-4")}>
      {children}
    </div>
  );
}

function Control({
  label,
  icon,
  primary,
  compact,
  ...props
}: { label: string; icon?: ReactNode; primary?: boolean; compact?: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-b-4 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 disabled:opacity-40",
        primary ? "border-primary-deep bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
        compact && "px-3",
      )}
      {...props}
    >
      {icon}
      {!(compact && icon) && label}
    </button>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: ReactNode } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      {...props}
    >
      {children}
    </button>
  );
}
