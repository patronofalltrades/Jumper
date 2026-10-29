import type { StoreApi } from "zustand";
import type { Bench } from "@/lib/circuit/bench";
import { isModule, partPins, type Part } from "@/lib/circuit/parts";
import type { BoardState } from "./board-store";
import { startProgress, type Progress } from "./engine";
import { clipFrame, type Clip } from "./walkthrough";

// "Build it for me" (issue #115): the board of the learner builds the level one task at a time, with the steps of the
// walkthrough clip. The demo plays in its own board store, so the engine and the autosave of the level never see it:
// no XP, no task ticks, no mistakes, and no saved demo board. Before the demo, the parts of the learner go; after it, the
// board is the start board of the level, and the learner builds it from zero.

/** One picture of the demo: the parts on the board, the caption, and how long it stays. */
export type DemoFrame = {
  /** The index of the task in its level, or null for the first board and the end. */
  task: number | null;
  caption: string;
  parts: Part[];
  /** The parts that came in with this picture. They flash green. */
  added: Part[];
  /** The engine on the task, for the cue picture: the scene glows where the part goes. Null: the part is in place. */
  progress: Progress | null;
  wait: number;
};

/** How long the board shows where the part goes, the part in place, and the first board or the end. */
const CUE_MS = 1200;
const DONE_MS = 1800;
const READ_MS = 3500;

/**
 * The full board of the demo: the start board of the learner, then the parts of the level. A start part with the same id
 * as a part of the level (a learner can put more wires than the ready-made board) gets a new id, so each part is one part.
 */
export function demoBoard(clip: Clip, base: Part[]): Part[] {
  const own = clip.order.slice(clip.faded.length);
  const taken = new Set(own.map((p) => p.id));
  const rename = new Map(base.filter((p) => taken.has(p.id)).map((p) => [p.id, `${p.id}-start`]));
  const fix = (end: string) => {
    const [owner, pin] = end.split(".");
    return pin !== undefined && rename.has(owner) ? `${rename.get(owner)}.${pin}` : end;
  };
  const start = base.map((p): Part => {
    const id = rename.get(p.id) ?? p.id;
    return isModule(p) ? { ...p, id } : { ...p, id, a: fix(p.a), b: fix(p.b) };
  });
  return [...start, ...own];
}

/**
 * The pictures of the demo, from the steps of the clip. Each task first shows where its part goes, then the part in
 * place. With reduced motion, each step is one still picture. The last picture has the caption `end`.
 */
export function demoFrames(clip: Clip, base: Part[], reducedMotion: boolean, end: string): DemoFrame[] {
  const order = demoBoard(clip, base);
  const shift = base.length - clip.faded.length;
  return clip.steps.flatMap((s) => {
    const phases: ("cue" | "done")[] = s.progress && !reducedMotion ? ["cue", "done"] : ["done"];
    return phases.map((phase) => {
      const frame = clipFrame(s, phase, reducedMotion);
      const wait = frame.cue ? CUE_MS : s.kind !== "task" ? READ_MS : reducedMotion ? CUE_MS + DONE_MS : DONE_MS;
      return {
        task: s.task,
        caption: s.kind === "end" ? end : s.caption,
        parts: order.slice(0, frame.count + shift),
        added: frame.cue ? [] : order.slice(s.before + shift, s.after + shift),
        progress: frame.cue ? s.progress : null,
        wait,
      };
    });
  });
}

/** Shows a picture of the demo in its own store, read-only. The start parts are faded, so the new parts stand out. */
export function showFrame(store: StoreApi<BoardState>, frame: DemoFrame, clip: Clip, bench: Bench, base: Part[]) {
  const faded = demoBoard(clip, base).slice(0, base.length).map((p) => p.id);
  store.getState().open("demo", { readOnly: true, bench, faded });
  store.setState({
    parts: frame.parts,
    plan: frame.progress ? clip.plan : null,
    progress: frame.progress ?? startProgress(),
    flash: frame.added.length ? { kind: "snap", holes: frame.added.flatMap((p) => partPins(bench, p).map((pin) => pin.hole)), at: Date.now() } : null,
  });
}

const same = (a: Part[], b: Part[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Takes the board of the learner back to the start board of the level, as one step that Undo takes back. The engine sees
 * a removal: the tasks go back, and the XP and the counts stay.
 */
export function clearForDemo(store: StoreApi<BoardState>) {
  const { parts, base, history } = store.getState();
  if (same(parts, base)) return;
  // Undo puts the last board of the history on the board, through the engine, and keeps the rest of the history.
  // With `base` added after the board of now, Undo puts `base` on the board, and the next Undo gives the board of now back.
  store.setState({ history: [...history, parts, base], done: null, problem: null });
  store.getState().undo();
}
