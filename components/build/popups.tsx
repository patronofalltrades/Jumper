"use client";

import { Html, Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import Link from "next/link";
import { useCallback, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Vector3, type Camera, type Object3D } from "three";
import text from "@/content/ui/build.json";
import { terminalAt, partPins } from "@/lib/circuit/parts";
import type { Task } from "@/lib/content/schema";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { needsAck, taskSpot, type Mistake } from "@/lib/game/engine";
import { cn } from "@/lib/utils";

// The pop-ups of build mode (PLAN.md "How build mode works"): Place, Wire, Concept and Mistake, plus the level intro
// and the end of the level. All their words come from the level content and content/ui/build.json.
// Laptop: the Place, Wire and Mistake pop-ups hang over the board, with a line down to the target pin (TRD 5.3).
// Phone: every pop-up is a sheet at the bottom of the board, so it does not cover the glowing holes.

export type LevelTask = Pick<Task, "position" | "kind" | "instruction" | "popup_why" | "concept" | "target" | "source_url" | "xp">;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));
const mistakeText: Record<string, string> = text.play.mistake;

const subscribeWidth = (update: () => void) => {
  const query = window.matchMedia("(min-width: 640px)");
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
};

/** True on a laptop: the window is 640 px wide or more (the same as Tailwind `sm:` and lib/device.ts). */
export function useLaptop() {
  return useSyncExternalStore(subscribeWidth, () => window.matchMedia("(min-width: 640px)").matches, () => true);
}

/** The holes that glow for the task now, and the point that its pop-up points at. Null when no task is open. */
export function useTaskSpot() {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const plan = useBoard((s) => s.plan);
  const progress = useBoard((s) => s.progress);
  const task = progress.phase === "task" ? plan?.tasks[progress.index] : undefined;
  return useMemo(() => (task ? taskSpot(bench, parts, task.target, progress.swaps) : null), [bench, parts, task, progress.swaps]);
}

/** The point of the first pin of the first wrong part, for the Mistake pop-up. */
function useMistakeSpot(mistake: Mistake | null) {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  return useMemo(() => {
    const part = parts.find((p) => p.id === mistake?.parts[0]);
    const pin = part && partPins(bench, part)[0]?.hole;
    const h = pin ? (bench.byId.get(pin) ?? terminalAt(bench, parts, pin)?.under) : undefined;
    return h ? { x: h.x, z: h.z } : null;
  }, [bench, parts, mistake]);
}

function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "kind" | "xp" | "mistake" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
        tone === "plain" && "bg-muted text-muted-foreground",
        tone === "kind" && "bg-primary text-primary-foreground",
        tone === "xp" && "bg-probe text-[#13202a]",
        tone === "mistake" && "bg-destructive text-white",
      )}
    >
      {children}
    </span>
  );
}

function PressButton({ tone = "primary", className, ...props }: { tone?: "primary" | "plain" } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-xl border-b-4 px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2",
        tone === "primary" ? "border-primary-deep bg-primary text-primary-foreground" : "border border-b-4 border-border bg-card text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** A Place or Wire pop-up: what to do, why, and its source. A part that is always on the bench gets "Got it". */
function TaskBody({ task, total }: { task: LevelTask; total: number }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="kind">{text.play.kind[task.kind]}</Chip>
        <Chip>{fill(text.play.task, { n: task.position, total })}</Chip>
        <Chip tone="xp">{fill(text.play.xp, { n: task.xp })}</Chip>
      </div>
      <h2 className="text-[17px] leading-snug font-extrabold">{task.instruction}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{task.popup_why}</p>
      <div className="flex items-center justify-between gap-3">
        <a href={task.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-muted-foreground underline underline-offset-2">
          {text.play.source}
        </a>
        {needsAck(task.target) && <PressButton onClick={() => boardStore.getState().ack()}>{text.play.gotIt}</PressButton>}
      </div>
    </>
  );
}

/** A Concept pop-up: a new idea, the first time that it shows. The text is "Name: explanation". */
function ConceptBody({ concept, onDone }: { concept: string; onDone: () => void }) {
  const colon = concept.indexOf(":");
  return (
    <>
      <div>
        <Chip tone="xp">{text.play.kind.concept}</Chip>
      </div>
      <h2 className="text-xl leading-tight font-extrabold">{colon > 0 ? concept.slice(0, colon) : text.play.kind.concept}</h2>
      <p className="text-sm leading-relaxed">{colon > 0 ? concept.slice(colon + 1).trim() : concept}</p>
      <div className="flex justify-end">
        <PressButton onClick={onDone}>{text.play.gotIt}</PressButton>
      </div>
    </>
  );
}

/** A Mistake pop-up: what the wrong part does, from the forbid rule of the level, and how to go on. */
function MistakeBody({ mistake }: { mistake: Mistake }) {
  const { undo, dismiss } = boardStore.getState();
  return (
    <>
      <div>
        <Chip tone="mistake">{text.play.kind.mistake}</Chip>
      </div>
      <p className="text-[15px] leading-snug font-semibold">{mistake.message ?? mistakeText[mistake.code]}</p>
      <div className="flex justify-end gap-2">
        <PressButton tone="plain" onClick={dismiss}>
          {text.play.mistake.retry}
        </PressButton>
        <PressButton onClick={undo}>{text.play.mistake.undo}</PressButton>
      </div>
    </>
  );
}

type LevelInfo = { eyebrow: string; title: string; goal: string; tasks: LevelTask[]; mapHref: string };

function IntroBody({ eyebrow, title, goal, tasks }: LevelInfo) {
  return (
    <>
      <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      <h2 className="text-2xl leading-tight font-extrabold tracking-tight">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{goal}</p>
      <div className="flex items-center justify-between gap-3">
        <Chip>{fill(text.play.intro.tasks, { n: tasks.length })}</Chip>
        <PressButton onClick={() => boardStore.getState().start()}>{text.play.intro.start}</PressButton>
      </div>
    </>
  );
}

function ReadyBody({ mapHref }: { mapHref: string }) {
  const { xp, mistakes } = useBoard((s) => s.progress);
  return (
    <>
      <h2 className="text-2xl leading-tight font-extrabold tracking-tight">{text.play.ready.title}</h2>
      <p className="text-sm text-muted-foreground">{text.play.ready.text}</p>
      <dl className="grid grid-cols-2 gap-2">
        {[
          [text.play.ready.xp, xp],
          [text.play.ready.mistakes, mistakes],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted px-3 py-2">
            <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
            <dd className="font-mono text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex justify-end">
        <Link
          href={mapHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border-b-4 border-primary-deep bg-primary px-4 text-sm font-bold text-primary-foreground active:translate-y-0.5 active:border-b-2"
        >
          {text.play.ready.map}
        </Link>
      </div>
    </>
  );
}

function Card({ mistake, className, children }: { mistake?: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-live="polite"
      className={cn("flex flex-col gap-3 border bg-card p-4 text-foreground shadow-panel", mistake ? "border-destructive border-l-4" : "border-border", className)}
    >
      {children}
    </div>
  );
}

/**
 * The pop-ups in the page. Phone: all of them, in a sheet under the board. The sheet has a fixed height, so the board
 * does not move when the text changes, and the sheet does not cover the board.
 * Laptop: the intro, the Concept pop-up and the end of the level, over the center of the board. (Task and Mistake
 * pop-ups hang in 3D.)
 */
export function PopupLayer({ level, conceptOpen, onConceptDone }: { level: LevelInfo; conceptOpen: boolean; onConceptDone: () => void }) {
  const laptop = useLaptop();
  const progress = useBoard((s) => s.progress);
  const task = level.tasks[progress.index];

  let body: ReactNode = null;
  let mistake = false;
  if (progress.phase === "intro") body = <IntroBody {...level} />;
  else if (progress.phase === "ready_to_check") body = <ReadyBody mapHref={level.mapHref} />;
  else if (progress.phase === "task" && conceptOpen && task?.concept) body = <ConceptBody concept={task.concept} onDone={onConceptDone} />;
  else if (!laptop && progress.phase === "mistake" && progress.mistake) {
    body = <MistakeBody mistake={progress.mistake} />;
    mistake = true;
  } else if (!laptop && progress.phase === "task" && task) body = <TaskBody task={task} total={level.tasks.length} />;
  if (!body) return null;

  return laptop ? (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1418]/25 p-4">
      <Card className="w-full max-w-md rounded-2xl">{body}</Card>
    </div>
  ) : (
    <div className="z-10 h-60 shrink-0 overflow-y-auto border-t border-border bg-card">
      {/* The last row of each pop-up has its buttons: it stays at the bottom of the sheet when the text scrolls. */}
      <Card mistake={mistake} className="min-h-full border-0 shadow-none *:last:sticky *:last:bottom-0 *:last:bg-card *:last:py-1">
        {body}
      </Card>
    </div>
  );
}

/** Height over the bench of the bottom of a pop-up that hangs in 3D. */
const HANG = 5;
/** Width of a pop-up that hangs in 3D, and its space from the edges of the board. */
const PINNED_WIDTH = 320;
const EDGE = 8;
/** The guide bar is at the top of the board: the card stays below it. */
const GUIDE_BOTTOM = 72;

/** Laptop: the Place, Wire or Mistake pop-up, over the target pin, with a line down to it. Goes inside the Canvas. */
export function PinnedPopup({ tasks, hidden }: { tasks: LevelTask[]; hidden: boolean }) {
  const progress = useBoard((s) => s.progress);
  // The card stays inside the board. When there is no space above the pin, it goes beside the pin, so that it does
  // not cover the target. Html renders the card in its own React root, so a callback ref measures it when it is there,
  // and a new frame puts it in its place (the canvas draws only on a change).
  const invalidate = useThree((s) => s.invalidate);
  const height = useRef(0);
  const card = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const observer = new ResizeObserver(() => {
        height.current = el.offsetHeight;
        invalidate();
      });
      observer.observe(el);
      return () => observer.disconnect();
    },
    [invalidate],
  );
  const place = (el: Object3D, camera: Camera, size: { width: number; height: number }) => {
    const p = new Vector3().setFromMatrixPosition(el.matrixWorld).project(camera);
    let x = ((p.x + 1) / 2) * size.width;
    let y = ((1 - p.y) / 2) * size.height;
    const half = PINNED_WIDTH / 2 + EDGE;
    if (y - height.current < GUIDE_BOTTOM) {
      const side = PINNED_WIDTH / 2 + 3 * EDGE;
      x = x + side + half <= size.width ? x + side : x - side;
      y += height.current / 2;
    }
    return [Math.min(Math.max(x, half), size.width - half), Math.min(Math.max(y, height.current + GUIDE_BOTTOM), size.height - EDGE)];
  };
  const spot = useTaskSpot();
  const mistakeAt = useMistakeSpot(progress.mistake);
  const task = tasks[progress.index];

  const mistake = progress.phase === "mistake" && progress.mistake;
  const at = mistake ? mistakeAt : spot?.at;
  if (hidden || !at || (!mistake && (progress.phase !== "task" || !task))) return null;

  return (
    <group>
      <Line
        points={[
          [at.x, 0.3, at.z],
          [at.x, HANG, at.z],
        ]}
        color={mistake ? "#c9412f" : "#e3a008"}
        lineWidth={2}
        raycast={() => null}
      />
      <Html position={[at.x, HANG, at.z]} zIndexRange={[15, 10]} calculatePosition={place} style={{ pointerEvents: "none" }}>
        <div ref={card} className="pointer-events-auto -translate-x-1/2 -translate-y-full pb-1" style={{ width: PINNED_WIDTH }}>
          <Card mistake={!!mistake} className="rounded-2xl">
            {mistake ? <MistakeBody mistake={mistake} /> : <TaskBody task={task} total={tasks.length} />}
          </Card>
        </div>
      </Html>
    </group>
  );
}
