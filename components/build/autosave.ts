"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { startSession, updateSession } from "@/app/actions/session";
import type { Part } from "@/lib/circuit/parts";
import { partSchema } from "@/lib/content/schema";
import { boardStore, type LevelSetup } from "@/lib/game/board-store";
import type { Plan, Progress } from "@/lib/game/engine";

// The board that the learner is building saves itself in this browser (PLAN.md section 3). A level starts with:
// 1. its own saved board and progress, if the browser has them;
// 2. else the finished board of the level before it, saved in this browser;
// 3. else the ready-made board of the earlier levels, from content/boards/.
// The session row in the database gets the counters: tasks done, mistakes and XP.

const savedSchema = z.object({
  parts: z.array(partSchema),
  progress: z.object({
    phase: z.enum(["intro", "task", "mistake", "ready_to_check"]),
    index: z.number().int().nonnegative(),
    tasksDone: z.number().int().nonnegative(),
    mistakes: z.number().int().nonnegative(),
    xp: z.number().int().nonnegative(),
    mistake: z.object({ code: z.string(), message: z.string().optional(), parts: z.array(z.string()) }).nullable(),
    swaps: z.array(z.string()),
  }),
  session: z.string().optional(),
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

type Props = { user: string; project: string; levelId: number; position: number; plan: Plan; start: Part[] };

/** Opens the level in the store, saves the board in the browser, and saves the session row. Gives a save error, if any. */
export function useLevel({ user, project, levelId, position, plan, start }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = keyOf(user, project, position);
    const own = read(key);
    const before = read(keyOf(user, project, position - 1));
    const setup: LevelSetup = own
      ? { plan, parts: own.parts as Part[], progress: own.progress as Progress }
      : { plan, parts: before?.progress.phase === "ready_to_check" ? (before.parts as Part[]) : start };
    boardStore.getState().open(`${project}/${position}`, setup);

    let session = own?.session;
    let starting: Promise<string | undefined> | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = own ? `${own.progress.tasksDone}/${own.progress.mistakes}/${own.progress.xp}` : "";

    // One session row for each sitting: two saves close together share one start request.
    const ensureSession = () =>
      (starting ??= startSession(levelId).then((result) => {
        if (!result.id) {
          starting = null;
          setError(result.error ?? null);
          return undefined;
        }
        session = result.id;
        const { parts, progress } = boardStore.getState();
        write(key, { parts, progress, session });
        return session;
      }));

    const sync = async (progress: Progress) => {
      if (progress.phase === "intro") return;
      if (!session && !(await ensureSession())) return;
      const counters = `${progress.tasksDone}/${progress.mistakes}/${progress.xp}`;
      if (counters === sent) return;
      const result = await updateSession({ id: session!, tasksDone: progress.tasksDone, mistakes: progress.mistakes, xp: progress.xp });
      setError(result.error ?? null);
      if (!result.error) sent = counters;
    };

    const save = () => {
      const { parts, progress, level } = boardStore.getState();
      if (level !== `${project}/${position}`) return;
      write(key, { parts, progress, session });
      // Wait for a pause, so that fast work sends one request.
      clearTimeout(timer);
      timer = setTimeout(() => void sync(progress), 800);
    };

    const stop = boardStore.subscribe((s, prev) => {
      if (s.parts !== prev.parts || s.progress !== prev.progress) save();
    });
    // Send the last counters when the learner leaves the page.
    const leave = () => {
      clearTimeout(timer);
      void sync(boardStore.getState().progress);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      stop();
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [user, project, levelId, position, plan, start]);

  return error;
}
