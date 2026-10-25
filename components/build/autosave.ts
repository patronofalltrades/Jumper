"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { startSession, updateSession, type SessionResult } from "@/app/actions/session";
import type { Bench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { partSchema } from "@/lib/content/schema";
import { boardStore, type LevelSetup } from "@/lib/game/board-store";
import { replayProgress } from "@/lib/game/check-flow";
import type { Plan, Progress } from "@/lib/game/engine";

// The board that the learner is building saves itself in this browser (PLAN.md section 3). A level starts with:
// 1. its own saved board and progress, if the browser has them;
// 2. else the finished board of the level before it, saved in this browser, if the level starts with that board;
// 3. else the ready-made board of its start levels, from content/boards/.
// The session row in the database gets the counters: tasks done, mistakes and XP.

const savedSchema = z.object({
  parts: z.array(partSchema),
  /** The board that the level opened with. A board saved before issue #27 does not have it. */
  base: z.array(partSchema).optional(),
  progress: z.object({
    phase: z.enum(["intro", "task", "mistake", "ready_to_check"]),
    index: z.number().int().nonnegative(),
    /** A board saved before issue #63 does not have it: the learner had got to the task of the pop-up. */
    reached: z.number().int().nonnegative().optional(),
    tasksDone: z.number().int().nonnegative(),
    mistakes: z.number().int().nonnegative(),
    xp: z.number().int().nonnegative(),
    mistake: z.object({ code: z.string(), message: z.string().optional(), parts: z.array(z.string()) }).nullable(),
    swaps: z.array(z.string()),
    fails: z.number().int().nonnegative().default(0),
  }).transform((p) => ({ ...p, reached: p.reached ?? p.index })),
  session: z.string().optional(),
  /** The level was passed in this browser. When it opens again, it is a replay, and a replay gives no XP (issue #62). */
  done: z.boolean().optional(),
  /** The sketch of the code step (issue #58), and whether it did the goal. */
  sketch: z.object({ code: z.string(), passed: z.boolean() }).optional(),
});
type Saved = z.infer<typeof savedSchema>;

const keyOf = (user: string, project: string, position: number) => `jumper:${user}:${project}/${position}`;

function read(key: string): Saved | null {
  try {
    const parsed = savedSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(key: string, saved: Saved) {
  try {
    localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    // Private mode or a full storage: the board still works, but it does not save.
  }
}

/** The board, session and mistakes of a level, as this browser saved them. For Save snapshot outside build mode. */
export function readSavedLevel(user: string, project: string, position: number) {
  const saved = read(keyOf(user, project, position));
  return saved && { parts: saved.parts as Part[], session: saved.session ?? null, mistakes: saved.progress.mistakes };
}

const starting = new Map<string, Promise<SessionResult>>();
/** The session id of each level, also in memory: with a full or blocked storage, the id is not lost. */
const known = new Map<string, string>();
/** Levels whose passing Check is on its way. A counter save that finds its session closed then must not start a new one. */
const completing = new Set<string>();
/** Levels that were passed in this browser, and when the learner opened each level this time (issue #62). */
const passed = new Set<string>();
const opened = new Map<string, string>();
const sessionOf = (key: string) => known.get(key) ?? read(key)?.session;

/** Adds a session row for the level and saves its id in this browser. Calls close together share one request. */
function newSession(key: string, levelId: number, openedAt?: string) {
  let request = starting.get(key);
  if (!request) {
    request = startSession(levelId, openedAt).then((result) => {
      starting.delete(key);
      if (result.id) {
        known.set(key, result.id);
        put(key, result.id);
      }
      return result;
    });
    starting.set(key, request);
  }
  return request;
}

/** Writes the board, the progress and the session id of the open level in this browser. */
function put(key: string, session: string | undefined) {
  write(key, { ...saved(), session, ...(passed.has(key) && { done: true }) });
}

/** Call when the Check passed: the level was passed in this browser, so it is a replay the next time. */
export function rememberPass(user: string, project: string, position: number) {
  const key = keyOf(user, project, position);
  passed.add(key);
  put(key, sessionOf(key));
}

/** Call before a passing Check is sent (`on`), and again when it did not complete the session (not `on`). */
export function markCompleting(user: string, project: string, position: number, on: boolean) {
  const key = keyOf(user, project, position);
  if (on) completing.add(key);
  else completing.delete(key);
}

/**
 * Replaces a session that the server closed, for example after a pass: the level is played again (issue #62). Forgets
 * the old id, starts a new session, saves its id in this browser, and gives the hearts back. When another call already
 * did this, it gives that session. Gives the new id, or undefined when the server cannot start one.
 */
export async function freshSession(user: string, project: string, position: number, levelId: number, stale: string) {
  const key = keyOf(user, project, position);
  const now = sessionOf(key);
  if (now && now !== stale) return now;
  const result = await newSession(key, levelId, opened.get(key));
  if (result.id) boardStore.getState().failed(0);
  return result.id;
}

type Props = {
  user: string;
  project: string;
  levelId: number;
  position: number;
  bench: Bench;
  plan: Plan;
  start: Part[];
  /** True when the level starts with the board of the level before it (lib/content/boards.ts). */
  carry: boolean;
};

/** What the browser saves for the open level: the board, the progress and the sketch. */
function saved(): Omit<Saved, "session"> {
  const { parts, base, progress, code, codePassed } = boardStore.getState();
  return { parts, base, progress, ...(code !== null && { sketch: { code, passed: codePassed } }) };
}

/** Opens the level in the store, saves the board in the browser, and saves the session row. Gives a save error, if any. */
export function useLevel({ user, project, levelId, position, bench, plan, start, carry }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = keyOf(user, project, position);
    const own = read(key);
    if (own?.done) passed.add(key);
    else passed.delete(key);
    opened.set(key, new Date().toISOString());
    const before = carry ? read(keyOf(user, project, position - 1)) : null;
    const setup: LevelSetup = own
      ? { bench, plan, parts: own.parts as Part[], base: (own.base ?? start) as Part[], progress: replayProgress(own.progress, own.done) as Progress, code: own.sketch?.code, codePassed: own.sketch?.passed }
      : { bench, plan, parts: before?.progress.phase === "ready_to_check" ? (before.parts as Part[]) : start };
    boardStore.getState().open(`${project}/${position}`, setup);

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = own ? `${own.progress.tasksDone}/${own.progress.mistakes}/${replayProgress(own.progress, own.done).xp}` : "";
    // The session id is in the browser save, because the level Check can replace it (issue #62).
    const current = () => sessionOf(key);
    if (own?.session) known.set(key, own.session);
    completing.delete(key);

    // `renew`: when the server says the session is closed, start a new one. Not when the learner leaves the page.
    const sync = async (progress: Progress, { renew = true } = {}) => {
      if (progress.phase === "intro") return;
      let session = current();
      if (!session) {
        const started = await newSession(key, levelId);
        if (!started.id) return setError(started.error ?? null);
        session = started.id;
      }
      const counters = `${progress.tasksDone}/${progress.mistakes}/${progress.xp}`;
      if (counters === sent) return;
      const send = (id: string) => updateSession({ id, tasksDone: progress.tasksDone, mistakes: progress.mistakes, xp: progress.xp });
      let result = await send(session);
      if (result.closed) {
        const fresh = renew && alive && !completing.has(key) ? await freshSession(user, project, position, levelId, session) : undefined;
        if (!fresh) return;
        result = await send(fresh);
      }
      setError(result.error ?? null);
      if (!result.error) sent = counters;
    };

    const save = () => {
      const { progress, level } = boardStore.getState();
      if (level !== `${project}/${position}`) return;
      put(key, current());
      // Wait for a pause, so that fast work sends one request.
      clearTimeout(timer);
      timer = setTimeout(() => void sync(progress), 800);
    };

    const stop = boardStore.subscribe((s, prev) => {
      if (s.parts !== prev.parts || s.progress !== prev.progress || s.code !== prev.code || s.codePassed !== prev.codePassed) save();
    });
    // Send the last counters when the learner leaves the page.
    const leave = () => {
      clearTimeout(timer);
      void sync(boardStore.getState().progress, { renew: false });
    };
    window.addEventListener("pagehide", leave);
    return () => {
      alive = false;
      stop();
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [user, project, levelId, position, bench, plan, start, carry]);

  return error;
}
