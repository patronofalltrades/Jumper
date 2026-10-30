"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { Volt } from "@/components/art/volt";
import { PlayIcon, WatchButton } from "@/components/walkthrough/watch-button";
import text from "@/content/ui/build.json";
import mascot from "@/content/ui/mascot.json";
import watch from "@/content/ui/walkthrough.json";
import { levelStatuses, type LevelStatus } from "@/lib/game/map";
import { mascotLevel } from "@/lib/game/mascot";
import { animateFrom, countValue, parseStoredProgress, type MapProgress } from "@/lib/game/map-progress";
import type { Clip } from "@/lib/game/walkthrough";
import { cn } from "@/lib/utils";

export type PathLevel = { position: number; title: string; tasks: number; href: string; clip?: Clip };

const XP_MS = 1200;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// The levels of a project on the level map, on a path. When the learner passed a level since the last visit in this browser,
// the map starts at the old state, then moves to the new one once: the path fills, the next level opens, the XP counts up.
// The server draws the end state, so a first visit, a visit with no change, and reduced motion show it with no animation.
export function LevelPath({ storageKey, levels, server }: { storageKey: string; levels: PathLevel[]; server: MapProgress }) {
  const [anim, setAnim] = useState<{ from: MapProgress; to: MapProgress } | null>(null);
  const [reached, setReached] = useState(false);
  const [xp, setXp] = useState(server.xp);
  // The path stays hidden until the stored state is read, so the server's end state never shows before the start state.
  const [ready, setReady] = useState(false);

  // Before the first paint: read the stored state, decide, and save the state that the map shows now.
  useLayoutEffect(() => {
    const from = reducedMotion() ? null : animateFrom(readStored(storageKey), server);
    writeStored(storageKey, server);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the stored state is in the browser only, so it is read after the server draws
    setReady(true);
    if (!from) return;
    setAnim({ from, to: server });
    setXp(from.xp);
  }, [storageKey, server]);

  // Two frames after the start state paints, the end state comes, so that the change animates (CSS transitions).
  useEffect(() => {
    if (!anim) return;
    let outer = 0;
    let inner = 0;
    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReached(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [anim]);

  // The XP counts up from the stored value to the new one.
  useEffect(() => {
    if (!anim) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / XP_MS);
      setXp(countValue(anim.from.xp, anim.to.xp, t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [anim]);

  const shown = anim && !reached ? anim.from : server;
  const statuses = levelStatuses(levels.length, shown.passed);
  const here = mascotLevel(statuses);

  return (
    <div className={cn("flex flex-col gap-3", !ready && "invisible")}>
      <p className="self-end rounded-full bg-probe px-3 py-1 font-extrabold tabular-nums text-[#13202a]">{fill(text.map.xp, { n: xp })}</p>
      <ol className="flex flex-col gap-2">
        {levels.map((level, i) => (
          <Node
            key={level.position}
            href={level.href}
            position={level.position}
            title={level.title}
            tasks={level.tasks}
            status={statuses[i]}
            // The path bends left and right, one step for each level.
            shift={[0, 1, 0, -1][i % 4]}
            last={i === levels.length - 1}
            here={i === here}
            animating={anim !== null}
            moving={reached}
            clip={level.clip}
          />
        ))}
      </ol>
    </div>
  );
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function readStored(key: string) {
  try {
    return parseStoredProgress(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeStored(key: string, value: MapProgress) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full storage: the map still works, and it plays the change again on the next visit.
  }
}

// The transition is set only once the end state comes (`moving`). The start state then shows at once, and the change
// animates from it. A transition from the server's end state would reverse before the start state showed.
const TRANSITION = "transition-all duration-500 motion-reduce:transition-none";

// The three marks of a circle (check, lock, number) are on top of each other. Only the one of the status shows.
const stage = (on: boolean, moving: boolean) => cn("absolute inset-0 flex items-center justify-center", moving && TRANSITION, on ? "scale-100 opacity-100" : "scale-50 opacity-0");

function Node({
  href,
  position,
  title,
  tasks,
  status,
  shift,
  last,
  here,
  animating,
  moving,
  clip,
}: {
  href: string;
  position: number;
  title: string;
  tasks: number;
  status: LevelStatus;
  shift: number;
  last: boolean;
  here: boolean;
  animating: boolean;
  moving: boolean;
  clip?: Clip;
}) {
  const circle = (
    <span
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center rounded-full border-b-[6px] text-2xl font-extrabold",
        moving && TRANSITION,
        status === "locked" ? "border-border bg-muted text-muted-foreground" : "border-primary-deep bg-primary text-primary-foreground",
        status === "open" && "ring-4 ring-probe ring-offset-4 ring-offset-card",
        status !== "locked" && "group-active:translate-y-1 group-active:border-b-2",
      )}
    >
      <span className={stage(status === "done", moving)} aria-hidden={status !== "done"}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
      <span className={stage(status === "locked", moving)} aria-hidden={status !== "locked"}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <span className={stage(status === "open", moving)} aria-hidden={status !== "open"}>
        {position}
      </span>
    </span>
  );
  const label = (
    <span className="flex min-w-0 flex-col">
      <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {fill(text.map.level, { n: position })} · {text.map.status[status]}
      </span>
      <span className={cn("text-lg leading-tight font-bold", status === "locked" && "text-muted-foreground")}>{title}</span>
      <span className="text-sm text-muted-foreground">
        {status === "locked" ? fill(text.map.lockedHint, { n: position - 1 }) : fill(text.map.tasks, { n: tasks })}
      </span>
    </span>
  );
  // Volt stands on the level to play now, at the end of its row. It hops in when the marker moves here during an animation.
  const volt = here && (
    <span className={cn("ml-auto shrink-0", animating && "rise-in")} title={mascot.map.here}>
      <Volt pose="idle" className="h-16 w-auto" />
      <span className="sr-only">{mascot.map.here}</span>
    </span>
  );
  const row = "group flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <li className="flex flex-col" style={{ paddingLeft: `${(shift + 1) * 2.25}rem` }}>
      <div className="flex items-center gap-1">
        {status === "locked" ? (
          <div className={row} aria-disabled="true">
            {circle}
            {label}
            {volt}
          </div>
        ) : (
          <Link href={href} className={cn(row, "hover:bg-muted")}>
            {circle}
            {label}
            {volt}
          </Link>
        )}
        {/* Each level has a Watch button, also a locked level, so the learner sees what comes next (issue #48). */}
        {clip && (
          <WatchButton
            clip={clip}
            title={fill(watch.levelTitle, { n: position, title })}
            label={fill(watch.watchLevelLabel, { n: position })}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-b-4 border-border bg-card px-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
          >
            <PlayIcon />
            <span className="max-sm:sr-only">{watch.watchLevel}</span>
          </WatchButton>
        )}
      </div>
      {/* The path between two levels fills when the level above passed. */}
      {!last && (
        <span className="relative ml-10 h-4 w-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <span className={cn("absolute inset-0 origin-top bg-primary", moving && "transition-transform duration-500 motion-reduce:transition-none", status === "done" ? "scale-y-100" : "scale-y-0")} />
        </span>
      )}
    </li>
  );
}
