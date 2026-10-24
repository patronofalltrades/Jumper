"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordAttempt } from "@/app/actions/attempt";
import text from "@/content/ui/build.json";
import { checkLevel, isEmptyBoard, type CheckResult, type Rules } from "@/lib/circuit/check";
import { endpointHole } from "@/lib/circuit/nets";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { readSavedLevel } from "./autosave";

// The level Check (PLAN.md feature 5a). The browser checks the board with the level rules, then the server saves the
// attempt. A pass opens the Level complete pop-up with the real session. A fail costs a heart and tells the reason.

export type Failed = Extract<CheckResult, { passed: false }>;

export type LevelCheck = {
  /** The Check card is open. When the learner closes it to fix the board, a Check button stays on the board. */
  open: boolean;
  busy: boolean;
  failed: Failed | null;
  error: string | null;
};

/** `needsSketch`: the level has a code step, so the Check waits until the sketch does the goal (issue #58). */
type Props = { user: string; project: string; position: number; rules: Rules; needsSketch: boolean };

/** True when the learner placed no part in this level. The Check button is then off, with a note (issue #27). */
export const useEmptyBoard = () => useBoard((s) => isEmptyBoard(s.parts, s.base));

/** The id of the note under a Check button that is off. The button points to it with aria-describedby. */
export const EMPTY_NOTE = "check-empty-note";

/** True when the level has a code step and the sketch did not do the goal yet. The Check is off; it costs no heart. */
export const useSketchLock = (needsSketch: boolean) => useBoard((s) => needsSketch && !s.codePassed);

export function useLevelCheck({ user, project, position, rules, needsSketch }: Props) {
  const router = useRouter();
  const [state, setState] = useState<LevelCheck>({ open: true, busy: false, failed: null, error: null });

  const check = async () => {
    const { bench, parts, base, progress, codePassed } = boardStore.getState();
    if (progress.phase !== "ready_to_check" || state.busy || isEmptyBoard(parts, base) || (needsSketch && !codePassed)) return;
    const session = readSavedLevel(user, project, position)?.session;
    if (!session) return setState({ open: true, busy: false, failed: null, error: text.play.check.noSession });

    setState((s) => ({ ...s, open: true, busy: true, error: null }));
    const result = checkLevel(bench, parts, rules);
    const saved = await recordAttempt({
      session,
      passed: result.passed,
      mistakeType: result.passed ? null : result.code,
      tasksDone: progress.tasksDone,
      mistakes: progress.mistakes,
      xp: progress.xp,
    });
    if (saved.error || saved.fails === undefined) return setState((s) => ({ ...s, busy: false, error: saved.error ?? text.play.check.error }));

    // The two ends of the connection flash: green for a pass, red for the reason of a fail.
    const ends = result.passed ? [] : [result.connection.a, result.connection.b].map((e) => endpointHole(bench, parts, e)).filter((h): h is string => h !== null);
    boardStore.setState({ flash: { kind: result.passed ? "snap" : "buzz", holes: ends, at: Date.now() } });

    if (saved.completed) return router.push(`/p/${project}/${position}/complete`);
    boardStore.getState().failed(saved.fails);
    setState({ open: true, busy: false, failed: result.passed ? null : result, error: null });
  };

  return { state, check, close: () => setState((s) => ({ ...s, open: false })) };
}
