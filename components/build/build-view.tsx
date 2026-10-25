"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SaveSnapshot, type LevelOption } from "@/components/snapshots/save-snapshot";
import { ClipPlayer, PlayIcon } from "@/components/walkthrough/watch-button";
import text from "@/content/ui/build.json";
import snapText from "@/content/ui/snapshots.json";
import watchText from "@/content/ui/walkthrough.json";
import { createBench, type BenchSpec } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { boardStore, useBoard, WIRE_COLORS, type Tool } from "@/lib/game/board-store";
import type { Rules } from "@/lib/circuit/check";
import { needsAck, type Plan } from "@/lib/game/engine";
import type { SketchStep } from "@/lib/content/schema";
import sketchText from "@/content/ui/sketch.json";
import type { Clip } from "@/lib/game/walkthrough";
import { readSavedLevel, useLevel } from "./autosave";
import { EMPTY_NOTE, useEmptyBoard, useLevelCheck, useSketchLock } from "./check";
import { useFeedback } from "./feedback";
import { GuideBar, SpotCard, useNoticeTimer } from "./guide";
import { Hearts, PinnedPopup, PopupLayer, useLaptop, type LevelTask } from "./popups";
import { SketchPanel } from "./sketch-panel";
import { TaskList } from "./task-list";
import { cn } from "@/lib/utils";

export type { LevelTask };

// Only this page loads three.js, so the lobby stays fast (TRD 12.1).
const BuildScene = dynamic(() => import("@/components/scene/build-scene"), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">Loading the board…</p>,
});

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The parts tray: modules and the speaker, in the order of content/ui/build.json. */
const TRAY = Object.entries(text.tray.parts).map(([tool, label]) => ({ tool: tool as Tool, label }));
const inTray = (tool: Tool) => TRAY.some((t) => t.tool === tool);

/** "parts" opens the parts tray, with the part that the learner used last. */
type ToolKey = Tool | "parts";

const TOOLS: { tool: ToolKey; label: string; key: string; icon: ReactNode }[] = [
  { tool: "wire", label: "Wire", key: "1", icon: icon("M5 18c0-8 14-4 14-12M5 18h.01M19 6h.01") },
  { tool: "resistor", label: "Resistor", key: "2", icon: icon("M2 12h4l2-4 3 8 3-8 3 8 2-4h3") },
  { tool: "led", label: "LED", key: "3", icon: icon("M8 14V9a4 4 0 0 1 8 0v5M6 14h12M10 14v6M14 14v4") },
  { tool: "parts", label: text.tray.label, key: "4", icon: icon("M4 6h7v7H4zM15 8h5M15 12h5M4 17h16M7 13v4M10 13v4") },
  { tool: "remove", label: "Remove", key: "5", icon: icon("M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3") },
];

/** The last part picked in the tray. The Parts button and key 4 go back to it. */
let lastTrayTool: Tool = TRAY[0].tool;
const pickTool = (tool: ToolKey) => {
  const next = tool === "parts" ? lastTrayTool : tool;
  if (inTray(next)) lastTrayTool = next;
  boardStore.getState().setTool(next);
};

type Props = {
  user: string;
  project: string;
  levelId: number;
  position: number;
  eyebrow: string;
  title: string;
  goal: string;
  tasks: LevelTask[];
  /** The require and forbid rules of the level, for the level Check. */
  rules: Rules;
  /** The bench of the project: its breadboards and its main board (content/benches/). */
  bench: BenchSpec;
  /** The ready-made board of the earlier levels, for a browser that has no saved board. */
  start: Part[];
  /** True when the level starts with the board of the level before it, so the learner's own board can go on. */
  carry: boolean;
  /** The levels of the project, for the level select of Save snapshot. */
  levels: LevelOption[];
  /** The walkthrough clip of the level (issue #48). */
  clip: Clip | null;
  /** The code step after the wiring tasks, if the level has one (issue #58). */
  sketch: SketchStep | null;
};

export function BuildView({ user, project, levelId, position, eyebrow, title, goal, tasks, rules, bench: spec, start, carry, levels, clip, sketch }: Props) {
  useKeys();
  useNoticeTimer();
  useFeedback();
  const plan: Plan = useMemo(() => ({ tasks: tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: rules.forbid }), [tasks, rules]);
  const bench = useMemo(() => createBench(spec), [spec]);
  const saveError = useLevel({ user, project, levelId, position, bench, plan, start, carry });
  const levelCheck = useLevelCheck({ user, project, levelId, position, rules, needsSketch: !!sketch });
  const locked = useSketchLock(!!sketch);
  const codePassed = useBoard((s) => s.codePassed);
  // The code panel: beside the board on a laptop, under it on a phone. The board stays in view, so the learner sees the LEDs.
  const [codeOpen, setCodeOpen] = useState(false);
  const openCode = () => setCodeOpen(true);
  const laptop = useLaptop();
  const progress = useBoard((s) => s.progress);
  const explaining = useBoard((s) => s.done !== null);
  const empty = useEmptyBoard();
  const mapHref = `/p/${project}`;

  // The clip opens each time the level opens, until the learner finishes the first task. useLevel opened the board first.
  const [watching, setWatching] = useState(false);
  const watchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved progress is in the browser only
    if (clip && boardStore.getState().progress.tasksDone === 0) setWatching(true);
  }, [clip]);

  // A task that brings a new idea shows its Concept pop-up first, after the "what happened" pop-up of the last task.
  const [conceptRead, setConceptRead] = useState(-1);
  const conceptOpen = progress.phase === "task" && !explaining && !!tasks[progress.index]?.concept && conceptRead < progress.index;
  // The guide bar tells how to use the tool. A task that needs only "Got it" does not use a tool.
  const task = tasks[progress.index];
  const building = progress.phase === "mistake" || (progress.phase === "task" && !explaining && !!task && !needsAck(task.target));

  const popups = (
    <PopupLayer
      level={{ eyebrow, title, goal, tasks }}
      conceptOpen={conceptOpen}
      onConceptDone={() => setConceptRead(progress.index)}
      check={{ check: levelCheck.state, onCheck: () => void levelCheck.check(), onClose: levelCheck.close, sketch: sketch && { passed: codePassed, open: openCode } }}
    />
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
        <Link
          href={mapHref}
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
        >
          ← {text.map.levels}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
          <h1 className="truncate text-lg leading-tight font-extrabold tracking-tight">{title}</h1>
        </div>
        {clip && (
          <button
            ref={watchButton}
            type="button"
            onClick={() => setWatching(true)}
            aria-label={watchText.watch}
            title={watchText.watch}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
          >
            <PlayIcon />
            <span className="max-sm:hidden">{watchText.watch}</span>
          </button>
        )}
        <SaveSnapshot
          levels={levels}
          read={() => {
            const { parts, progress: now } = boardStore.getState();
            return { parts, session: readSavedLevel(user, project, position)?.session ?? null, mistakes: now.mistakes };
          }}
        >
          <button
            type="button"
            aria-label={snapText.save.button}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
          >
            {icon("M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7")}
            <span className="max-sm:hidden">{snapText.save.short}</span>
          </button>
        </SaveSnapshot>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Hearts fails={progress.fails} />
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-sm font-semibold">
              <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="var(--probe)" />
              </svg>
              {progress.xp} XP
            </span>
          </div>
          <div
            className="h-2 w-24 overflow-hidden rounded-full bg-muted sm:w-40"
            role="progressbar"
            aria-label={fill(text.play.task, { n: progress.tasksDone, total: tasks.length })}
            aria-valuemin={0}
            aria-valuemax={tasks.length}
            aria-valuenow={progress.tasksDone}
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(progress.tasksDone / tasks.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className={cn("flex min-h-0 flex-1", codeOpen && "max-sm:flex-col")}>
        <div className="relative min-h-0 min-w-0 flex-1">
          <BuildScene>{laptop && <PinnedPopup tasks={tasks} hidden={conceptOpen || explaining} />}</BuildScene>
          {/* The guide bar, and the task list below it. Only the panels take clicks; the board gets the rest. Above the Check button, the column stops. */}
          {progress.phase !== "intro" && (
            <div className={cn("pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col gap-2 px-3", progress.phase === "ready_to_check" ? "bottom-32" : "bottom-3")}>
              {building && <GuideBar />}
              <TaskList tasks={tasks} laptop={laptop} code={sketch && { instruction: sketch.task, open: openCode }} small={codeOpen} />
            </div>
          )}
          {/* The learner closed the Check card to fix the board: the Check button stays at the bottom of the board. */}
          {progress.phase === "ready_to_check" && !explaining && !levelCheck.state.open && !codeOpen && (
            <div className="absolute inset-x-3 bottom-4 z-20 flex flex-col items-center gap-2">
              {empty && (
                <p id={EMPTY_NOTE} className="max-w-xs rounded-xl bg-card px-3 py-2 text-center text-sm font-semibold shadow-panel">
                  {text.play.check.empty}
                </p>
              )}
              {locked && (
                <button
                  type="button"
                  onClick={openCode}
                  className="min-h-12 rounded-xl border-b-4 border-primary-deep bg-primary px-8 text-base font-extrabold tracking-wide text-primary-foreground uppercase shadow-panel outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
                >
                  {sketchText.panel.open}
                </button>
              )}
              <button
                type="button"
                onClick={() => void levelCheck.check()}
                disabled={empty || locked}
                aria-describedby={empty ? EMPTY_NOTE : undefined}
                className="min-h-12 rounded-xl border-b-4 border-primary-deep bg-primary px-8 text-base font-extrabold tracking-wide text-primary-foreground uppercase shadow-panel outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
              >
                {text.play.check.button}
              </button>
            </div>
          )}
          <SpotCard />
          {laptop && !codeOpen && popups}
          {saveError && (
            <p role="alert" className="absolute inset-x-3 top-20 z-30 sm:inset-x-auto sm:top-3 sm:right-3 sm:max-w-xs rounded-xl border border-destructive bg-card px-3 py-2 text-sm font-semibold text-destructive shadow-panel">
              {saveError}
            </p>
          )}
        </div>
        {codeOpen && sketch && (
          <div className="min-h-0 border-border max-sm:h-[60%] max-sm:border-t sm:w-[min(460px,45%)] sm:border-l">
            <SketchPanel
              step={sketch}
              onClose={() => setCodeOpen(false)}
              onDone={() => {
                setCodeOpen(false);
                void levelCheck.check();
              }}
            />
          </div>
        )}
      </div>

      {!laptop && !codeOpen && popups}
      {!(codeOpen && !laptop) && <ToolBar />}
      {clip && watching && (
        <ClipPlayer
          clip={clip}
          title={fill(watchText.levelTitle, { n: position, title })}
          onClose={() => {
            setWatching(false);
            watchButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function ToolBar() {
  const tool = useBoard((s) => s.tool);
  const canUndo = useBoard((s) => s.history.length > 0);
  const { undo } = boardStore.getState();

  return (
    <div className="z-10 border-t border-border bg-card px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] sm:px-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {/* The row keeps its space for every tool, so the board does not move when the tool changes. */}
        <div className="h-11">{inTray(tool) ? <Tray tool={tool} /> : <Swatches hidden={tool !== "wire"} />}</div>
        <div className="grid grid-cols-6 gap-1 sm:gap-2" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <ToolButton
              key={t.tool}
              pressed={t.tool === "parts" ? inTray(tool) : tool === t.tool}
              onClick={() => pickTool(t.tool)}
              label={t.label}
              shortcut={t.key}
            >
              {t.icon}
            </ToolButton>
          ))}
          <ToolButton onClick={undo} label="Undo" shortcut="Ctrl+Z" disabled={!canUndo}>
            {icon("M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3")}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  pressed,
  label,
  shortcut,
  children,
  ...props
}: { pressed?: boolean; label: string; shortcut: string; children: ReactNode } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={`${label} (${shortcut})`}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-b-4 text-xs font-semibold transition-[transform,border] outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 disabled:opacity-40",
        pressed ? "border-primary-deep bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
      )}
      {...props}
    >
      {children}
      {label}
    </button>
  );
}

function Swatches({ hidden }: { hidden: boolean }) {
  const wireColor = useBoard((s) => s.wireColor);
  return (
    <div className={cn("flex h-full items-center justify-center gap-2", hidden && "invisible")} aria-hidden={hidden} role="group" aria-label="Wire color">
      <span className="text-xs font-semibold text-muted-foreground">Wire color</span>
      {WIRE_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          aria-label={`${c.name} wire`}
          aria-pressed={c.hex === wireColor}
          onClick={() => boardStore.getState().setWireColor(c.hex)}
          className="size-6 rounded-full border-2 border-card shadow-[0_0_0_1px_var(--line)] aria-pressed:shadow-[0_0_0_2px_var(--probe)]"
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );
}

/** The parts tray: one chip for each module and the speaker. */
function Tray({ tool }: { tool: Tool }) {
  const row = useRef<HTMLDivElement>(null);
  // Keep the selected chip in view on a narrow screen. The braces matter: a new browser gives a Promise from
  // scrollIntoView, and an effect that gives back a Promise stops the page.
  useEffect(() => {
    row.current?.querySelector("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tool]);
  return (
    <div ref={row} className="flex h-full items-center gap-1.5 overflow-x-auto sm:justify-center" role="group" aria-label={text.tray.label}>
      {TRAY.map((t) => (
        <button
          key={t.tool}
          type="button"
          aria-pressed={t.tool === tool}
          onClick={() => pickTool(t.tool)}
          className="min-h-11 shrink-0 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 aria-pressed:border-primary-deep aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Esc cancels, 1–5 pick a tool, Ctrl+Z or Cmd+Z undoes. */
function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Typing in a field or in the sketch editor (a contenteditable) is not a shortcut.
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]")) return;
      const { undo, cancel } = boardStore.getState();
      const tool = TOOLS.find((t) => t.key === e.key);
      if (e.key === "Escape") cancel();
      else if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      } else if (tool && !e.metaKey && !e.ctrlKey) pickTool(tool.tool);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
