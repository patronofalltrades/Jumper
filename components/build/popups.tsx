"use client";

import { Html, Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Vector3, type Camera, type Object3D } from "three";
import { Volt } from "@/components/art/volt";
import text from "@/content/ui/build.json";
import type { Bench } from "@/lib/circuit/bench";
import { terminalAt, partPins, type Part } from "@/lib/circuit/parts";
import type { Task } from "@/lib/content/schema";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { needsAck, taskSpot, type Mistake } from "@/lib/game/engine";
import { HEARTS, heartsLeft } from "@/lib/game/hearts";
import { mascotPose } from "@/lib/game/mascot";
import { cn } from "@/lib/utils";
import { EMPTY_NOTE, useEmptyBoard, type Failed, type LevelCheck } from "./check";
import { pinName } from "./guide";

// The pop-ups of build mode (PLAN.md "How build mode works"): Place, Wire, Concept and Mistake, plus the level intro,
// the "what happened" pop-up after a task, and the level Check. All their words come from the level content and content/ui/build.json.
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
  const explaining = useBoard((s) => s.done !== null);
  const task = progress.phase === "task" && !explaining ? plan?.tasks[progress.index] : undefined;
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

/** Volt in the first row of a Task, "what happened" or Mistake pop-up. The board picks the pose; a new pose plays its motion again. */
function PopupVolt() {
  const phase = useBoard((s) => s.progress.phase);
  const done = useBoard((s) => s.done);
  const pose = mascotPose({ phase, done });
  return <Volt key={pose} pose={pose} label className="h-14 w-auto shrink-0 sm:h-16" />;
}

/**
 * A Place or Wire pop-up: what to do. The "what happened" text shows after the task (DoneBody). A part that is always
 * on the bench gets "Got it", so its pop-up shows the two texts together.
 */
function TaskBody({ task, total }: { task: LevelTask; total: number }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <PopupVolt />
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="kind">{text.play.kind[task.kind]}</Chip>
          <Chip>{fill(text.play.task, { n: task.position, total })}</Chip>
          <Chip tone="xp">{fill(text.play.xp, { n: task.xp })}</Chip>
        </div>
      </div>
      <h2 className="text-[17px] leading-snug font-extrabold">{task.instruction}</h2>
      {needsAck(task.target) && (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">{task.popup_why}</p>
          <div className="flex items-center justify-between gap-3">
            <a href={task.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-muted-foreground underline underline-offset-2">
              {text.play.source}
            </a>
            <PressButton onClick={() => boardStore.getState().ack()}>{text.play.gotIt}</PressButton>
          </div>
        </>
      )}
    </>
  );
}

/** After a Place or Wire task: what the learner just did, in plain words. */
function DoneBody({ task }: { task: LevelTask }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <PopupVolt />
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="kind">{text.play.kind.done}</Chip>
          <Chip tone="xp">{fill(text.play.xp, { n: task.xp })}</Chip>
        </div>
      </div>
      <h2 className="text-xl leading-tight font-extrabold">{text.play.done.title}</h2>
      <p className="text-sm leading-relaxed">{task.popup_why}</p>
      <div className="flex items-center justify-between gap-3">
        <a href={task.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-muted-foreground underline underline-offset-2">
          {text.play.source}
        </a>
        <PressButton autoFocus onClick={() => boardStore.getState().seen()}>
          {text.play.done.next}
        </PressButton>
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
      <div className="flex items-center gap-2">
        <PopupVolt />
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

type LevelInfo = { eyebrow: string; title: string; goal: string; tasks: LevelTask[] };
/** The level Check card: its state, and what its buttons do. */
type CheckProps = { check: LevelCheck; onCheck: () => void; onClose: () => void };

function IntroBody({ eyebrow, title, goal, tasks }: LevelInfo) {
  return (
    <>
      <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      <h2 className="text-2xl leading-tight font-extrabold tracking-tight">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{goal}</p>
      <p className="rounded-xl bg-muted px-3 py-2 text-sm leading-snug font-semibold">{text.play.intro.how}</p>
      <div className="flex items-center justify-between gap-3">
        <Chip>{fill(text.play.intro.tasks, { n: tasks.length })}</Chip>
        <PressButton onClick={() => boardStore.getState().start()}>{text.play.intro.start}</PressButton>
      </div>
    </>
  );
}

const names: Record<string, string> = { ...text.tray.parts, ...text.play.check.names };
const legs: Record<string, string> = text.play.check.legs;
const rails: Record<string, string> = text.railName;

/** A plain name for an endpoint of a level rule: "esp.GPIO4" → "GPIO 4", "mic1.WS" → "Mic WS", "led1.anode" → "LED + leg". */
function endpointName(bench: Bench, parts: Part[], endpoint: string) {
  const [owner, pin] = endpoint.split(".");
  if (owner === "esp") return pinName(pin);
  if (/^bb[AB]$/.test(owner)) return rails[pin] ?? pin;
  const part = parts.find((p) => p.id === owner);
  if (!part) return endpoint;
  const label = legs[pin] ?? partPins(bench, part).find((p) => p.name === pin)?.label ?? pin;
  return `${names[part.type] ?? owner} ${label}`;
}

/** The text of a failed Check: the forbid rule text, or the missing connection in plain words. */
function reasonText(bench: Bench, parts: Part[], failed: Failed) {
  if (failed.message) return failed.message;
  const template = failed.code === "missing_ground" ? text.play.check.missing_ground : text.play.check.wrong_pin;
  // A ground rule names its other end first: "Mic L/R does not connect to ground".
  const [a, b] = failed.code === "missing_ground" && /\.GND$|^bb[AB]\.-$/.test(failed.connection.a) ? [failed.connection.b, failed.connection.a] : [failed.connection.a, failed.connection.b];
  return fill(template, { a: endpointName(bench, parts, a), b: endpointName(bench, parts, b) });
}

function heartsText(fails: number) {
  const hearts = heartsLeft(fails);
  if (fails > 0 && hearts === HEARTS) return text.play.check.refilled;
  return hearts === 0 ? text.play.check.noHearts : fill(text.play.check.lostHeart, { n: hearts });
}

/** The end of the tasks: Check the level. After a fail: the reason, the hearts, and "Fix the board". */
function CheckBody({ check, onCheck, onClose }: { check: LevelCheck; onCheck: () => void; onClose: () => void }) {
  const { xp, mistakes, fails } = useBoard((s) => s.progress);
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const empty = useEmptyBoard();
  const button = (
    <PressButton onClick={onCheck} disabled={check.busy || empty} aria-describedby={empty ? EMPTY_NOTE : undefined} className="disabled:opacity-60">
      {check.busy ? text.play.check.checking : text.play.check.button}
    </PressButton>
  );
  const emptyNote = empty && (
    <p id={EMPTY_NOTE} className="text-sm font-semibold text-muted-foreground">
      {text.play.check.empty}
    </p>
  );

  if (check.failed) {
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <Chip tone="mistake">{text.play.kind.mistake}</Chip>
          <Hearts fails={fails} />
        </div>
        <h2 className="text-2xl leading-tight font-extrabold tracking-tight">{text.play.check.failTitle}</h2>
        <p className="text-[15px] leading-snug font-semibold">{reasonText(bench, parts, check.failed)}</p>
        <p className="text-sm text-muted-foreground">{heartsText(fails)}</p>
        {check.error && <p role="alert" className="text-sm font-semibold text-destructive">{check.error}</p>}
        {emptyNote}
        <div className="flex justify-end gap-2">
          <PressButton tone="plain" onClick={onClose}>
            {text.play.check.fix}
          </PressButton>
          {button}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl leading-tight font-extrabold tracking-tight">{text.play.ready.title}</h2>
        <Hearts fails={fails} />
      </div>
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
      {check.error && <p role="alert" className="text-sm font-semibold text-destructive">{check.error}</p>}
      {emptyNote}
      <div className="flex justify-end">{button}</div>
    </>
  );
}

/** The hearts of the level, as in Duolingo: full hearts for the hearts left. */
export function Hearts({ fails }: { fails: number }) {
  const left = heartsLeft(fails);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={fill(text.play.check.hearts, { n: left })}>
      {Array.from({ length: HEARTS }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.3 5 6.8 5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.5 0 5.8 3.4 4.3 6.8C19.5 16.4 12 21 12 21Z"
            fill={i < left ? "var(--destructive)" : "var(--muted)"}
          />
        </svg>
      ))}
    </span>
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
 * Laptop: the intro, the "what happened" pop-up, the Concept pop-up and the level Check, over the center of the board. (Task and Mistake
 * pop-ups hang in 3D.)
 */
export function PopupLayer({ level, conceptOpen, onConceptDone, check }: { level: LevelInfo; conceptOpen: boolean; onConceptDone: () => void; check: CheckProps }) {
  const laptop = useLaptop();
  const progress = useBoard((s) => s.progress);
  const done = useBoard((s) => s.done);
  const task = level.tasks[progress.index];

  let body: ReactNode = null;
  let mistake = false;
  if (progress.phase === "intro") body = <IntroBody {...level} />;
  else if (done !== null && level.tasks[done]) body = <DoneBody task={level.tasks[done]} />;
  else if (progress.phase === "ready_to_check" && check.check.open) {
    body = <CheckBody {...check} />;
    mistake = !!check.check.failed;
  }
  else if (progress.phase === "task" && conceptOpen && task?.concept) body = <ConceptBody concept={task.concept} onDone={onConceptDone} />;
  else if (!laptop && progress.phase === "mistake" && progress.mistake) {
    body = <MistakeBody mistake={progress.mistake} />;
    mistake = true;
  } else if (!laptop && progress.phase === "task" && task) body = <TaskBody task={task} total={level.tasks.length} />;
  if (!body) return null;

  return laptop ? (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1418]/25 p-4">
      <Card mistake={mistake} className="w-full max-w-md rounded-2xl">{body}</Card>
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
