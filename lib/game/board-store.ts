import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { perchBench, type Bench } from "@/lib/circuit/bench";
import { placedParts } from "@/lib/circuit/check";
import { isModuleType } from "@/lib/circuit/modules";
import { checkHole, checkModule, checkPlacement, isModule, moduleOver, nextPartId, partAt, partPins, type LegPart, type Part, type PartType, type PlaceProblem } from "@/lib/circuit/parts";
import type { Problem } from "@/lib/circuit/problem";
import { startProgress, step, taskTool, type EngineEvent, type Plan, type Progress } from "./engine";
import type { HologramTarget } from "./hologram";
import { putBackParts } from "./put-back";

export type Tool = PartType | "remove";

/** Why the last tap did nothing. The tool bar shows it as a short hint. */
export type Notice = { problem: PlaceProblem | "nothing_to_remove" | "nothing_to_undo"; hole?: string };

export const WIRE_COLORS = [
  { name: "Red", hex: "#D63A2F" },
  { name: "Black", hex: "#25292D" },
  { name: "Blue", hex: "#2F6FD6" },
  { name: "Yellow", hex: "#E2AE12" },
  { name: "Green", hex: "#2E9D5B" },
] as const;

/** The green flash of a part that snaps in, or the red flash of a wrong one, on its holes. `at` makes each one new. */
export type Flash = { kind: "snap" | "buzz"; holes: string[]; at: number };

/** The marks of Compare views on the 3D board: a hole → the color of its net, and a part id → its color. */
export type CompareMark = { holes: Record<string, string>; parts: Record<string, string> };

/** "Show me" was pressed: the camera moves to the problem. `at` makes each press new. */
export type Focus = { at: number };

/** What a level starts with: its tasks, and the board and progress from the browser, if it has them. */
/** `readOnly`: a saved snapshot. The camera moves and the nets glow, but taps do not change the board. */
/** `base`: the board that the level opened with, before the learner placed a part. It defaults to `parts`. */
/** `bench`: the bench of the project (content/benches/). It defaults to the bench of the store, Perch for the app store. */
/** `code`, `codePassed`: the sketch of a level with a code step (issue #58), and whether it did the goal. */
/** `helpedCode`: the sketch that "Write it for me" wrote in this level, if the learner used it (issue #145). */
/** `faded`: the ids of the parts that the scene draws faded. Only a walkthrough clip uses it (issue #103). */
export type LevelSetup = { bench?: Bench; plan?: Plan; parts?: Part[]; base?: Part[]; progress?: Progress; readOnly?: boolean; code?: string | null; codePassed?: boolean; helpedCode?: string | null; faded?: string[] };

/** What a challenge puts away: the board, the task engine and the sketch of the level. */
export type Paused = Pick<BoardState, "parts" | "history" | "plan" | "progress" | "code" | "codePassed" | "helpedCode">;

/** What "Restore this run" puts away, so that "Undo the restore" can bring it back (issue #214). */
export type RestoreBackup = Pick<BoardState, "parts" | "code" | "codePassed" | "helpedCode">;

export type BoardState = {
  bench: Bench;
  /** The level that this board belongs to, for example "<user>:perch/1" (`levelKey`). */
  level: string | null;
  parts: Part[];
  /** The board that the level opened with. The level Check is off until the learner places a part (issue #27). */
  base: Part[];
  /** Earlier versions of `parts`, newest last. Undo goes back one. */
  history: Part[][];
  tool: Tool;
  wireColor: string;
  /** The first hole of a two-leg part that is not finished yet. For a module on a phone: the hole of pin 1 that the
   *  learner looks at before the second tap. */
  pending: string | null;
  /** The hole whose net glows: under the pointer on a laptop, the last tapped hole on a phone. */
  hover: string | null;
  notice: Notice | null;
  /** The tasks of the level. Null: free building, with no tasks. */
  plan: Plan | null;
  progress: Progress;
  /**
   * The task that the learner just finished with a part or a wire. Its "what happened" note shows in the pop-up of the
   * next task (issue #218). It goes away with the next change of the board, with "Got it" on a task, or with `seen`.
   */
  done: number | null;
  flash: Flash | null;
  /** The connection that the last failed Check named. It stays until the connection is right, or a new Check (issue #90). */
  problem: Problem | null;
  focus: Focus | null;
  readOnly: boolean;
  /** The ids of the parts that the scene draws faded: the parts of the levels before, in a walkthrough clip (issue #103). */
  faded: string[];
  /** The sketch of the code step, as the learner wrote it. Null: the starter code of the level (issue #58). */
  code: string | null;
  /** True when the sketch did the goal of the level, after its last change. The level Check needs it. */
  codePassed: boolean;
  /** The sketch that "Write it for me" wrote, or null. While the code is this text, the code step gives no XP (issue #145). */
  helpedCode: string | null;
  /** The task or connection row under the pointer: the scene shows its ghost (issue #113). It never changes the board. */
  hologram: HologramTarget | null;
  /**
   * Compare views is open (issue #202): the nets of the selected connection glow in its color, and the wire that is off
   * from the reference has a color of its own. Null when the panel is closed. It never changes the board.
   */
  compare: CompareMark | null;

  /**
   * The learner's own level while a challenge is open (issue #203), or null. A challenge is a sandbox: it puts its own
   * board and sketch on the bench with the task engine off, and `endChallenge` puts the learner's level back.
   * The browser save uses this value, so a reload in a challenge gives the learner's own board.
   */
  paused: Paused | null;
  /** Starts a challenge on `parts` and `code`, or puts a new board in a challenge that is open (Undo takes that back). */
  startChallenge: (parts: Part[], code: string) => void;
  endChallenge: () => void;

  /** Opens the board of a level. A different level starts from `setup`, or an empty bench; the same level keeps its state. */
  open: (level: string, setup?: LevelSetup) => void;
  /** Empties the board, for example when the user logs out. The next `open` starts from its setup (issue #64). */
  reset: () => void;
  /** Start in the intro, "Got it" on a part that is always on the bench, "Try again" on a mistake. */
  start: () => void;
  ack: () => void;
  dismiss: () => void;
  /** "Redo this step" on a failed Check: the task opens again, with its guidance. */
  redo: (task: number) => void;
  /** Takes away the "what happened" note. The page does not need it to go on (issue #218). */
  seen: () => void;
  /** The result of a failed level Check: the failed Checks of the session so far. */
  failed: (fails: number) => void;
  setTool: (tool: Tool) => void;
  setWireColor: (hex: string) => void;
  setHover: (hole: string | null) => void;
  /** Shows the ghost of a task or connection row, or hides it (null). */
  setHologram: (hologram: HologramTarget | null) => void;
  setCompare: (compare: CompareMark | null) => void;
  /**
   * A click or tap on a hole: start a part, finish it, or remove what is in the hole.
   * With a module tool, a click puts the module there. With `preview` (a phone, which has no hover), the first tap
   * shows where the module goes, and a second tap on the same hole puts it there.
   */
  tapHole: (hole: string, preview?: boolean) => void;
  removePart: (id: string) => void;
  /** "Clear": removes the parts that the learner put in this level, in one step. The `base` parts stay; Undo puts all back (issue #114). */
  clear: () => void;
  undo: () => void;
  /** "Put back the level {n} build" (issue #111): adds the parts of `start` that can go back, as one step that Undo takes back. */
  putBack: (start: Part[]) => { back: Part[]; blocked: Part[] };
  cancel: () => void;
  /**
   * The board and the sketch from before the last "Restore this run" (issue #214), or null. There is one slot: a new
   * restore replaces it, and `undoRestore` uses it and empties it.
   */
  restoreBackup: RestoreBackup | null;
  /**
   * "Restore this run": the board and the sketch of a run record go on the bench together, in one step. The board and
   * the sketch of now go into `restoreBackup` first, also the changes that were not run. The sketch must do the goal
   * again, so a new Run is necessary. The task engine reads the new board as it does after "Put back": no Mistake and
   * no XP. Undo takes back the board only; `undoRestore` takes back the board and the sketch. False: nothing changed.
   */
  restoreRun: (run: { parts: readonly Part[]; code: string }) => boolean;
  /** "Undo the restore": the board and the sketch from before the restore come back together. False: there is no backup. */
  undoRestore: () => boolean;
  /** A change to the sketch. The sketch must do the goal again. The same text is no change: the editor sends back each new value. */
  setCode: (code: string | null) => void;
  /** The sketch did the goal. */
  passCode: () => void;
  /** "Write it for me": the sketch of the level goes in the editor. It must still do the goal, and it gives no XP. */
  writeForMe: (code: string) => void;
  /** "Show me" on the fail card: the camera moves to the problem. */
  showProblem: () => void;
};

export function createBoardStore(defaultBench: Bench = perchBench()) {
  return createStore<BoardState>()((set, get) => {
    /** Sends an event to the task engine. A new task selects its tool; a snap or a buzz flashes the holes of `parts`. */
    const play = (event: EngineEvent, parts: Part[] = []): Partial<BoardState> => {
      const { bench, plan, progress, tool } = get();
      if (!plan) return {};
      const next = step(bench, plan, progress, event);
      const task = next.progress.index !== progress.index || next.progress.phase !== progress.phase ? plan.tasks[next.progress.index] : undefined;
      const finished = event.type === "change" && next.progress.tasksDone > progress.tasksDone;
      return {
        progress: next.progress,
        ...(finished && { done: progress.reached }),
        tool: (next.progress.phase === "task" && task && taskTool(task.target)) || tool,
        ...(next.effect && { flash: { kind: next.effect, holes: parts.flatMap((p) => partPins(bench, p).map((pin) => pin.hole)), at: Date.now() } }),
      };
    };

    /** A new board: the engine checks the change. */
    const change = (parts: Part[], history: Part[][], restore = false) => {
      const before = get().parts;
      const added = parts.filter((p) => !before.some((b) => b.id === p.id));
      // The note of the task before goes away with each change of the board (issue #218). A change that finishes a task sets a new note.
      set({ parts, history, pending: null, notice: null, done: null, ...play({ type: "change", before, after: parts, restore }, added) });
    };
    const commit = (parts: Part[], restore = false) => change(parts, [...get().history, get().parts], restore);
    /**
     * A full board that takes the place of the board of now (a restored run, issue #214), as one step that Undo takes
     * back. The engine reads it as it reads "Put back": it gives no Mistake and no XP, and the task of now follows the board.
     */
    const swap = (parts: Part[]): Partial<BoardState> => {
      const before = get().parts;
      return { parts, history: [...get().history, before], pending: null, hover: null, notice: null, problem: null, ...play({ type: "change", before, after: parts, restore: true }) };
    };

    const empty = () => ({
      bench: defaultBench,
      level: null,
      parts: [],
      base: [],
      history: [],
      tool: "wire" as Tool,
      wireColor: WIRE_COLORS[0].hex as string,
      pending: null,
      hover: null,
      notice: null,
      plan: null,
      progress: startProgress(),
      done: null,
      flash: null,
      problem: null,
      focus: null,
      readOnly: false,
      faded: [],
      code: null,
      codePassed: false,
      helpedCode: null,
      hologram: null,
      compare: null,
      paused: null,
      restoreBackup: null,
    });

    return {
      ...empty(),

      open: (level, setup = {}) => {
        if (level === get().level) return;
        const progress = setup.progress ?? startProgress();
        const task = progress.phase === "task" ? setup.plan?.tasks[progress.index] : undefined;
        set({
          bench: setup.bench ?? defaultBench,
          level,
          parts: setup.parts ?? [],
          base: setup.base ?? setup.parts ?? [],
          history: [],
          tool: (task && taskTool(task.target)) || "wire",
          pending: null,
          hover: null,
          notice: null,
          plan: setup.plan ?? null,
          progress,
          done: null,
          flash: null,
          problem: null,
          focus: null,
          readOnly: setup.readOnly ?? false,
          faded: setup.faded ?? [],
          code: setup.code ?? null,
          codePassed: setup.codePassed ?? false,
          helpedCode: setup.helpedCode ?? null,
          hologram: null,
          paused: null,
          restoreBackup: null,
        });
      },

      startChallenge: (parts, code) => {
        const now = get();
        if (now.readOnly) return;
        if (now.paused) return set({ parts, history: [...now.history, now.parts], pending: null, notice: null, hover: null });
        const { history, plan, progress, codePassed, helpedCode } = now;
        set({
          paused: { parts: now.parts, history, plan, progress, code: now.code, codePassed, helpedCode },
          parts,
          history: [],
          // No plan: the task engine is off, so a change gives no mistake. "ready_to_check" hides the task pop-ups.
          plan: null,
          progress: { ...progress, phase: "ready_to_check", mistake: null },
          code,
          codePassed: true,
          pending: null,
          hover: null,
          notice: null,
          problem: null,
          done: null,
          hologram: null,
        });
      },
      endChallenge: () => {
        const { paused } = get();
        if (paused) set({ ...paused, paused: null, pending: null, hover: null, notice: null });
      },
      reset: () => set(empty()),
      start: () => set(play({ type: "start" })),
      ack: () => set({ done: null, ...play({ type: "ack", parts: get().parts }) }),
      dismiss: () => set(play({ type: "dismiss" })),
      redo: (task) => set({ done: null, ...play({ type: "redo", task }) }),
      seen: () => set({ done: null }),
      failed: (fails) => set({ progress: { ...get().progress, fails } }),
      setTool: (tool) => set({ tool, pending: null, notice: null }),
      setWireColor: (wireColor) => set({ wireColor, tool: "wire", pending: null, notice: null }),
      setHover: (hover) => set({ hover }),
      setHologram: (hologram) => set({ hologram }),
      setCompare: (compare) => set({ compare }),
      cancel: () => set({ pending: null, notice: null }),
      setCode: (code) => {
        if (code !== get().code) set({ code, codePassed: false });
      },
      passCode: () => set({ codePassed: true }),
      writeForMe: (code) => set({ code, codePassed: false, helpedCode: code }),
      showProblem: () => set({ focus: { at: Date.now() } }),

      tapHole: (hole, preview = false) => {
        if (get().readOnly) return;
        const { bench, parts, tool, pending, wireColor } = get();

        if (tool === "remove") {
          const part = partAt(bench, parts, hole) ?? moduleOver(bench, parts, hole);
          if (part) get().removePart(part.id);
          else set({ notice: { problem: "nothing_to_remove", hole } });
          return;
        }

        if (isModuleType(tool)) {
          const problem = checkModule(bench, parts, tool, hole);
          if (preview && hole !== pending) return set({ pending: hole, notice: problem ? { problem, hole } : null });
          if (problem) return set({ notice: { problem, hole } });
          return commit([...parts, { id: nextPartId(parts, tool), type: tool, at: hole }]);
        }

        if (hole === pending) return set({ pending: null, notice: null });

        if (!pending) {
          const problem = checkHole(bench, parts, hole);
          return set(problem ? { notice: { problem, hole } } : { pending: hole, notice: null });
        }

        const problem = checkPlacement(bench, parts, tool, pending, hole);
        if (problem) return set({ notice: { problem, hole } });

        const part: LegPart = { id: nextPartId(parts, tool), type: tool, a: pending, b: hole };
        if (tool === "wire") part.color = wireColor;
        commit([...parts, part]);
      },

      // A module goes with the leads and wires in its screw terminal.
      removePart: (id) => {
        if (get().readOnly) return;
        const gone = (p: Part) => p.id === id || (!isModule(p) && (p.a.startsWith(`${id}.`) || p.b.startsWith(`${id}.`)));
        commit(get().parts.filter((p) => !gone(p)));
      },

      clear: () => {
        const { readOnly, parts, base } = get();
        const placed = placedParts(parts, base);
        if (readOnly || !placed.length) return;
        commit(parts.filter((p) => !placed.includes(p)));
      },

      undo: () => {
        const { history } = get();
        if (!history.length) return set({ notice: { problem: "nothing_to_undo" } });
        change(history[history.length - 1], history.slice(0, -1));
      },

      restoreRun: (run) => {
        const now = get();
        // A snapshot cannot change, and a challenge is a sandbox: its board is not the board of the level.
        if (now.readOnly || now.paused) return false;
        const parts = run.parts.map((p) => ({ ...p })) as Part[];
        set({
          restoreBackup: { parts: now.parts, code: now.code, codePassed: now.codePassed, helpedCode: now.helpedCode },
          ...swap(parts),
          code: run.code,
          codePassed: false,
        });
        return true;
      },

      undoRestore: () => {
        const { restoreBackup: backup, readOnly, paused } = get();
        if (!backup || readOnly || paused) return false;
        set({ restoreBackup: null, ...swap(backup.parts), code: backup.code, codePassed: backup.codePassed, helpedCode: backup.helpedCode });
        return true;
      },

      putBack: (start) => {
        const { bench, parts, readOnly } = get();
        const result = readOnly ? { back: [], blocked: [] } : putBackParts(bench, parts, start);
        if (result.back.length) commit([...parts, ...result.back], true);
        return result;
      },
    };
  });
}

/** The board of the open level. One board at a time, so one store for the app. */
export const boardStore = createBoardStore();

/**
 * The store that `useBoard` reads: the board of the level, or a walkthrough clip that plays over it (issue #48).
 * A clip covers its canvas, so the tap handlers of the scene, which use `boardStore`, do not get its pointer.
 */
export const BoardContext = createContext(boardStore);

/**
 * The finished board of the level: the `order` of its walkthrough clip (lib/game/walkthrough.ts). A resistor or LED task
 * glows the holes where the clip puts the part (issue #101). Undefined when the level has no clip: the nearest good holes glow.
 */
export const FinishContext = createContext<Part[] | undefined>(undefined);

export const useBoard = <T>(selector: (state: BoardState) => T) => useStore(useContext(BoardContext), selector);
