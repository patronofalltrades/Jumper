"use client";

import { useMemo } from "react";
import type { Part } from "@/lib/circuit/parts";
import { useBoard } from "@/lib/game/board-store";
import { taskSpot } from "@/lib/game/engine";
import { taskText } from "@/lib/game/task-text";
import type { LevelTask } from "./popups";

/**
 * The tasks of the level with {from} and {to} filled from the holes of the arrow on the board now (issue #148). The
 * holes come from taskSpot with the same board, side choices and finished board as the glow, so the text and the arrow
 * agree. Every place that shows a task (the pop-up, the task list, read aloud, Redo) uses these tasks.
 */
export function useFilledTasks(tasks: LevelTask[], finish: Part[] | undefined): LevelTask[] {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const swaps = useBoard((s) => s.progress.swaps);
  return useMemo(
    () =>
      tasks.map((t) =>
        /\{(from|to)\}/.test(t.instruction)
          ? { ...t, instruction: taskText(bench, parts, t.instruction, taskSpot(bench, parts, t.target, swaps, finish).taps) }
          : t,
      ),
    [tasks, bench, parts, swaps, finish],
  );
}
