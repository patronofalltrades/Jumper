"use client";

import { useCallback, useMemo, useState } from "react";
import { logEvents } from "@/app/actions/journey";
import { saveKey } from "@/lib/game/level-key";
import { lessonOf } from "@/lib/journey/lesson-of";
import type { EventName } from "@/lib/journey/records";
import { keepLatest, readRuns, runsKey, writeRuns, type RunRecord } from "@/lib/runs/record";

// The run records of the open level, in this browser (TRD addendum 6.3, issue #212). The key has the user, so a second
// user on the same tab has their own records. A browser that cannot save still runs the sketch, with no history.

const storage = () => (typeof window === "undefined" ? null : window.localStorage);

export function useRuns(user: string, project: string, position: number) {
  const key = runsKey(saveKey(user, project, position));
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
      setSaved(store ? writeRuns(store, key, next) : false);
      log("run_completed", record.runId, {
        status: record.result.status,
        ...(record.result.status === "ok" && { observed: record.result.observed.kind, goal_passed: record.result.goalPassed }),
      });
    },
    [key, runs, log],
  );

  return { runs, add, saved, lesson, log };
}
