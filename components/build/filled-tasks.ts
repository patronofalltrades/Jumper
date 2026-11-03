"use client";

import { useMemo } from "react";
import type { Part } from "@/lib/circuit/parts";
import { useBoard } from "@/lib/game/board-store";
import type { Plan } from "@/lib/game/engine";
import { taskTexts } from "@/lib/game/task-text";
import type { LevelTask } from "./popups";

/**
 * The tasks of the level with {from} and {to} filled from the holes of the arrow (issue #148). The task of now uses the
 * same board, side choices and finished board as the glow, so the text and the arrow agree. The tasks after it name the
 * holes of the guide. Every place that shows a task (the pop-up, the task list, read aloud, Redo) uses these tasks.
 */
export function useFilledTasks(tasks: LevelTask[], plan: Plan, finish: Part[] | undefined): LevelTask[] {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const progress = useBoard((s) => s.progress);
  return useMemo(() => {
    const texts = taskTexts(bench, parts, plan, tasks.map((t) => t.instruction), progress, finish);
    return tasks.map((t, i) => (texts[i] === t.instruction ? t : { ...t, instruction: texts[i] }));
  }, [tasks, plan, bench, parts, progress, finish]);
}
