"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logEvents } from "@/app/actions/journey";
import type { Part } from "@/lib/circuit/parts";
import { boardStore } from "@/lib/game/board-store";
import { levelKey, saveKey } from "@/lib/game/level-key";
import { lessonOf } from "@/lib/journey/lesson-of";
import type { EventName } from "@/lib/journey/records";
import { keepLatest, readBackup, readRuns, runsKey, writeRuns, type RunRecord, type StoredBackup } from "@/lib/runs/record";

// The run records of the open level, in this browser (TRD addendum 6.3, issue #212). The key has the user, so a second
// user on the same tab has their own records. A browser that cannot save still runs the sketch, with no history.
// The backup of "Restore this run" (issue #214) is in the board store, and in the same browser save, so "Undo the
// restore" is there after a reload.

const storage = () => (typeof window === "undefined" ? null : window.localStorage);
const backupNow = () => boardStore.getState().restoreBackup as StoredBackup | null;

export function useRuns(user: string, project: string, position: number) {
  const key = runsKey(saveKey(user, project, position));
  const level = levelKey(user, project, position);
  const lesson = useMemo(() => {
    const found = lessonOf(project, position)?.lesson;
    return found ? { id: found.id, version: found.version } : null;
  }, [project, position]);
  const [state, setState] = useState(() => {
    const store = storage();
    return { key, runs: store ? readRuns(store, key) : [] };
  });
  const [saved, setSaved] = useState(true);
  // Another level or another user: the records of that key.
  const runs = useMemo(() => (state.key === key ? state.runs : []), [state, key]);

  // After a reload, the backup of the last restore comes back from the browser save.
  useEffect(() => {
    const store = storage();
    const board = boardStore.getState();
    if (!store || board.level !== level || board.restoreBackup) return;
    const backup = readBackup(store, key);
    if (backup) boardStore.setState({ restoreBackup: { ...backup, parts: backup.parts as Part[] } });
  }, [key, level]);

  /** An event of the pilot records, for a level with a lesson file only. A save that fails changes nothing for the learner. */
  const log = useCallback(
    (name: EventName, runId: string | null, data: Record<string, string | number | boolean>) => {
      if (!lesson) return;
      void logEvents([{ id: crypto.randomUUID(), name, lessonId: lesson.id, lessonVersion: lesson.version, runId, data }]).catch(() => {});
    },
    [lesson],
  );

  /** Adds the record of a new run, keeps the latest three, and saves them. */
  const add = useCallback(
    (record: RunRecord) => {
      const store = storage();
      const next = keepLatest(store ? readRuns(store, key) : runs, record);
      setState({ key, runs: next });
      setSaved(store ? writeRuns(store, key, next, backupNow()) : false);
      log("run_completed", record.runId, {
        status: record.result.status,
        ...(record.result.status === "ok" && { observed: record.result.observed.kind, goal_passed: record.result.goalPassed }),
      });
    },
    [key, runs, log],
  );

  /** Saves the backup slot of the board store with the records. */
  const keepBackup = useCallback(() => {
    const store = storage();
    if (store) writeRuns(store, key, readRuns(store, key), backupNow());
  }, [key]);

  /** "Restore this run": the board and the sketch of the record go on the bench. False: nothing changed. */
  const restore = useCallback(
    (record: RunRecord) => {
      if (!boardStore.getState().restoreRun({ parts: record.parts as Part[], code: record.code })) return false;
      keepBackup();
      log("snapshot_restored", record.runId, { status: record.result.status });
      return true;
    },
    [keepBackup, log],
  );

  /** "Undo the restore": the board and the sketch from before the restore come back. */
  const undoRestore = useCallback(() => {
    if (!boardStore.getState().undoRestore()) return false;
    keepBackup();
    return true;
  }, [keepBackup]);

  return { runs, add, saved, lesson, log, restore, undoRestore };
}
