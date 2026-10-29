"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import text from "@/content/ui/build.json";
import sketchText from "@/content/ui/sketch.json";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { needsAck, taskMarks, type TaskMark } from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { HologramRow } from "./hologram-row";
import type { LevelTask } from "./popups";

// The task list (issue #52): every task of the level, with a tick for each task that the board does now.
// Laptop: it starts open. Phone: it starts as a small chip, and a tap opens it over the board.

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The code step after the wiring tasks (issue #58): its line in the list, and the button that opens the code panel. */
export type CodeRow = { instruction: string; open: () => void };

/** `small`: the code panel is open, so the list starts as a chip and the Uno (with its L light) stays in view. */
export function TaskList({ tasks, laptop, code, small = false }: { tasks: LevelTask[]; laptop: boolean; code: CodeRow | null; small?: boolean }) {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const plan = useBoard((s) => s.plan);
  const progress = useBoard((s) => s.progress);
  const codePassed = useBoard((s) => s.codePassed);
  const wiring = useMemo(() => (plan ? taskMarks(bench, plan, parts, progress) : []), [bench, plan, parts, progress]);
  // The code step is done when the sketch did the goal. It is "now" when the wiring tasks are done.
  const codeMark: TaskMark = codePassed ? "done" : progress.phase === "ready_to_check" && !wiring.includes("now") ? "now" : "todo";
  const marks = code ? [...wiring, codeMark] : wiring;
  const rows = [
    ...tasks.map((t) => ({ key: String(t.position), instruction: t.instruction, task: t as LevelTask | null })),
    ...(code ? [{ key: "code", instruction: code.instruction, task: null }] : []),
  ];
  // Null until the learner taps the header: then the panel follows the screen size.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? (laptop && !small);
  const list = useRef<HTMLOListElement>(null);
  const now = marks.indexOf("now");

  // Keep the task of now in view when the list scrolls. The braces matter: a new browser gives a Promise from
  // scrollIntoView, and an effect that gives back a Promise stops the page.
  useEffect(() => {
    list.current?.querySelector("[aria-current=step]")?.scrollIntoView({ block: "nearest" });
  }, [now, open]);

  if (!plan) return null;
  const done = marks.filter((m) => m === "done").length;

  return (
    <section
      aria-label={text.tasks.list}
      className={cn("pointer-events-auto flex min-h-0 flex-col self-start rounded-2xl border border-border bg-card shadow-panel", open && "w-full sm:w-72")}
    >
      <button
        type="button"
        aria-expanded={open}
        title={open ? text.tasks.hide : text.tasks.show}
        onClick={() => setToggled(!open)}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3 text-left text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex-1">{open ? fill(text.tasks.title, { done, total: rows.length }) : fill(text.tasks.chip, { done, total: rows.length })}</span>
        {/* A minus closes the list, a plus opens it. */}
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg border border-b-2 border-border bg-card">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d={open ? "M5 12h14" : "M5 12h14M12 5v14"} />
          </svg>
        </span>
      </button>
      {open && (
        <ol ref={list} className="flex min-h-0 flex-col gap-1 overflow-y-auto border-t border-border p-2">
          {rows.map(({ key, instruction, task }, i) => {
            const mark = marks[i];
            return (
              <HologramRow
                key={key}
                // A task row shows the ghost of its part or wire on the board (issue #113).
                target={task ? { kind: "task", index: i } : null}
                aria-current={mark === "now" ? "step" : undefined}
                className={cn("flex items-start gap-2 rounded-xl px-2 py-1.5 text-sm leading-snug", mark === "now" && "bg-muted")}
              >
                <Mark mark={mark} />
                <span className="sr-only">{text.tasks.state[mark]}:</span>
                <span className={cn("flex-1", mark === "done" && "text-muted-foreground", mark === "now" && "font-bold")}>{instruction}</span>
                {/* A part that is always on the bench: "Got it" finishes its task here too, as in its pop-up. */}
                {task && mark === "now" && progress.phase === "task" && needsAck(task.target) && (
                  <button
                    type="button"
                    onClick={() => boardStore.getState().ack()}
                    className="min-h-9 shrink-0 rounded-lg border-b-4 border-primary-deep bg-primary px-3 text-xs font-bold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
                  >
                    {text.play.gotIt}
                  </button>
                )}
                {/* The code step: open the code panel to write the sketch, or to see it again after it did the goal. */}
                {!task && code && mark !== "todo" && (
                  <button
                    type="button"
                    onClick={code.open}
                    className="min-h-9 shrink-0 rounded-lg border-b-4 border-primary-deep bg-primary px-3 text-xs font-bold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
                  >
                    {mark === "now" ? sketchText.panel.open : sketchText.panel.reopen}
                  </button>
                )}
              </HologramRow>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** A green tick, a ring in the primary color, or an empty circle. */
function Mark({ mark }: { mark: "done" | "now" | "todo" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-2",
        mark === "done" && "border-primary bg-primary text-primary-foreground",
        mark === "now" && "border-primary ring-2 ring-primary/30",
        mark === "todo" && "border-border",
      )}
    >
      {mark === "done" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </span>
  );
}
