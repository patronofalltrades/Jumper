"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { Mascot } from "@/components/art/mascot";
import { ScrollHere } from "@/components/map/scroll-here";
import { PlayIcon, WatchButton } from "@/components/walkthrough/watch-button";
import text from "@/content/ui/build.json";
import mascot from "@/content/ui/mascot.json";
import watch from "@/content/ui/walkthrough.json";
import { levelStatuses, type LevelStatus } from "@/lib/game/map";
import { pathLayout, progressPercent, type PathPoint } from "@/lib/game/path";
import { mascotLevel } from "@/lib/game/mascot";
import {
  animateFrom,
  countValue,
  parseStoredProgress,
  type MapProgress,
} from "@/lib/game/map-progress";
import type { MascotId } from "@/lib/game/project-mascot";
import type { Clip } from "@/lib/game/walkthrough";
import { cn } from "@/lib/utils";

export type PathLevel = {
  position: number;
  title: string;
  tasks: number;
  href: string;
  clip?: Clip;
};

const XP_MS = 1200;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

// The levels of a project on the level map: square tiles joined by a path (the design canvas of issue #152). When the learner passed a level since the last visit in this browser,
// the map starts at the old state, then moves to the new one once: the path fills, the next level opens, the XP counts up.
// The server draws the end state, so a first visit, a visit with no change, and reduced motion show it with no animation.
export function LevelPath({
  storageKey,
  levels,
  server,
  character,
  name,
  board,
}: {
  storageKey: string;
  levels: PathLevel[];
  server: MapProgress;
  character: MascotId;
  name: string;
  board: string;
}) {
  const [anim, setAnim] = useState<{
    from: MapProgress;
    to: MapProgress;
  } | null>(null);
  const [reached, setReached] = useState(false);
  const [xp, setXp] = useState(server.xp);
  // The path stays hidden until the stored state is read, so the server's end state never shows before the start state.
  const [ready, setReady] = useState(false);

  // Before the first paint: read the stored state, decide, and save the state that the map shows now.
  useLayoutEffect(() => {
    const from = reducedMotion()
      ? null
      : animateFrom(readStored(storageKey), server);
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
  const allDone = statuses.length > 0 && statuses.every((s) => s === "done");
  const now = levels[here];
  const pct = progressPercent(levels.length, shown.passed);
  // The board has one more tile at the end of the path: the finish.
  const { points, segments, height } = pathLayout(levels.length + 1);

  return (
    <div className={cn("flex flex-col gap-6", !ready && "invisible")}>
      {/* The level to play now, as in the canvas: a pill with the level, its clip and the project progress ring. */}
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-muted py-3 pr-3 pl-6">
        <div className="min-w-0">
          <p className="font-mono text-[11px] leading-snug font-semibold tracking-wide text-muted-foreground uppercase">
            {fill(text.map.here, {
              name,
              board,
              n: here + 1,
              count: levels.length,
            })}
          </p>
          <h1 className="mt-0.5 text-2xl leading-tight font-bold tracking-tight sm:text-[28px]">
            {allDone
              ? text.map.allDone
              : now &&
                fill(text.map.now, { n: now.position, title: now.title })}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {now?.clip && !allDone && (
            <WatchButton
              clip={now.clip}
              title={fill(watch.levelTitle, {
                n: now.position,
                title: now.title,
              })}
              label={fill(watch.watchLevelLabel, { n: now.position })}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 font-semibold outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlayIcon />
              <span className="max-sm:sr-only">{watch.watchLevel}</span>
            </WatchButton>
          )}
          <Ring
            pct={pct}
            label={fill(text.map.progress, { name, pct })}
            moving={reached}
          />
        </div>
      </div>

      <p className="self-end rounded-full bg-probe px-3 py-1 font-extrabold tabular-nums text-secondary-foreground">
        {fill(text.map.xp, { n: xp })}
      </p>

      {/* The path: square tiles joined by a line on a dotted board. The line turns green up to the level to play now. */}
      <ol
        className="relative mx-auto w-full max-w-[440px] bg-[radial-gradient(circle,var(--color-border)_2.5px,transparent_3px)] bg-[length:28px_28px] bg-[position:14px_14px]"
        style={{ height }}
        aria-label={fill(text.map.listLabel, { name })}
      >
        <svg
          className="absolute inset-0 size-full overflow-visible"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {segments.map((d, i) => (
            <path
              key={`todo-${i}`}
              d={d}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {segments.map((d, i) =>
            statuses[i] !== "done" ? null : (
              <path
                key={`done-${i}`}
                d={d}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={cn(
                  anim && !anim.from.passed.includes(i + 1) && "path-in",
                )}
              />
            ),
          )}
        </svg>
        {levels.map((level, i) => (
          <Tile
            key={level.position}
            level={level}
            point={points[i]}
            status={statuses[i]}
            here={i === here && !allDone}
            character={character}
            animating={anim !== null}
            moving={reached}
          />
        ))}
        <li
          className="absolute flex w-32 -translate-x-1/2 -translate-y-10 flex-col items-center gap-2"
          style={{
            left: `${points[levels.length].x}%`,
            top: points[levels.length].y,
          }}
        >
          <span
            className={cn(
              "flex size-20 items-center justify-center rounded-3xl border-2 border-dashed",
              allDone
                ? "border-probe bg-probe text-secondary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8" />
            </svg>
          </span>
          <span className="text-center text-[13px] font-semibold text-muted-foreground">
            {text.map.finish}
          </span>
          <span className="sr-only">
            {fill(text.map.finishLabel, { name })}
          </span>
        </li>
      </ol>
    </div>
  );
}

// The progress of the project, as a ring around the percent.
function Ring({
  pct,
  label,
  moving,
}: {
  pct: number;
  label: string;
  moving: boolean;
}) {
  const C = 2 * Math.PI * 15;
  return (
    <span
      className="relative flex size-14 items-center justify-center sm:size-[68px]"
      role="img"
      aria-label={label}
    >
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 36 36"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="4"
        />
        {pct > 0 && (
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="var(--color-probe)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * C} ${C}`}
            transform="rotate(-90 18 18)"
            className={cn(
              moving &&
                "transition-[stroke-dasharray] duration-700 motion-reduce:transition-none",
            )}
          />
        )}
      </svg>
      <span className="relative text-[13px] font-bold tabular-nums sm:text-[15px]">
        {pct}%
      </span>
    </span>
  );
}

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

// The three marks of a tile (check, lock, bolt) are on top of each other. Only the one of the status shows.
const stage = (on: boolean, moving: boolean) =>
  cn(
    "absolute inset-0 flex items-center justify-center",
    moving && TRANSITION,
    on ? "scale-100 opacity-100" : "scale-50 opacity-0",
  );

const TILE = {
  done: "border-primary-deep bg-primary text-primary-foreground",
  open: "border-[#b8920c] bg-probe text-secondary-foreground shadow-[0_0_0_6px_rgb(245_197_24/0.18),0_0_44px_rgb(245_197_24/0.45)]",
  locked: "border-x border-t border-border bg-muted text-muted-foreground",
} satisfies Record<LevelStatus, string>;

function Tile({
  level,
  point,
  status,
  here,
  character,
  animating,
  moving,
}: {
  level: PathLevel;
  point: PathPoint;
  status: LevelStatus;
  here: boolean;
  character: MascotId;
  animating: boolean;
  moving: boolean;
}) {
  const { position, title } = level;
  const tile = (
    <span
      className={cn(
        "relative flex size-20 items-center justify-center rounded-3xl border-b-8",
        moving && TRANSITION,
        TILE[status],
        status !== "locked" &&
          "group-active:translate-y-1 group-active:border-b-4",
      )}
    >
      {/* The Start bubble above the level to play now. */}
      {status === "open" && (
        <span
          className={cn(
            "absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-bold whitespace-nowrap text-background",
            animating && "rise-in",
          )}
        >
          {text.map.start}
        </span>
      )}
      <span className={stage(status === "done", moving)} aria-hidden="true">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className={stage(status === "locked", moving)} aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <span className={stage(status === "open", moving)} aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" />
        </svg>
      </span>
    </span>
  );
  const label =
    status === "done"
      ? fill(text.map.passedLabel, { n: position, title })
      : status === "open"
        ? fill(text.map.startLabel, { n: position, title })
        : fill(text.map.lockedLabel, {
            n: position,
            title,
            prev: position - 1,
          });
  const focus =
    "group rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card";
  // The mascot of the project stands next to the level to play now, on the side with room. It hops in when the marker moves here.
  const mascotSide =
    point.col === 2 ? "right-[calc(100%-1rem)]" : "left-[calc(100%-1rem)]";
  return (
    <li
      className="absolute flex w-36 -translate-x-1/2 -translate-y-10 flex-col items-center gap-2"
      style={{ left: `${point.x}%`, top: point.y }}
    >
      {here && <ScrollHere />}
      {status === "locked" ? (
        <span className={focus} role="img" aria-label={label}>
          {tile}
        </span>
      ) : (
        <Link
          href={level.href}
          className={focus}
          aria-label={label}
          title={title}
        >
          {tile}
        </Link>
      )}
      <span
        className={cn(
          "line-clamp-2 text-center text-[13px] leading-tight font-semibold",
          status === "locked" ? "text-muted-foreground" : "text-foreground",
        )}
        aria-hidden="true"
      >
        {position} · {title}
      </span>
      {/* Each level has a Watch button, also a locked level, so the learner sees what comes next (issue #48). */}
      {level.clip && (
        <WatchButton
          clip={level.clip}
          title={fill(watch.levelTitle, { n: position, title })}
          label={fill(watch.watchLevelLabel, { n: position })}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-2.5 text-xs font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlayIcon />
          {watch.watchLevel}
        </WatchButton>
      )}
      {here && (
        <span
          className={cn(
            "pointer-events-none absolute top-1 hidden min-[360px]:block",
            mascotSide,
            animating && "rise-in",
          )}
          title={mascot.map.here}
        >
          <Mascot id={character} pose="idle" className="h-16 w-auto" />
          <span className="sr-only">{mascot.map.here}</span>
        </span>
      )}
    </li>
  );
}
