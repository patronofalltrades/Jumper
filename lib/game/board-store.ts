import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { perchBench, type Bench } from "@/lib/circuit/bench";
import { isModuleType } from "@/lib/circuit/modules";
import { checkHole, checkModule, checkPlacement, isModule, moduleOver, nextPartId, partAt, partPins, type LegPart, type Part, type PartType, type PlaceProblem } from "@/lib/circuit/parts";
import { startProgress, step, taskTool, type EngineEvent, type Plan, type Progress } from "./engine";

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

/** What a level starts with: its tasks, and the board and progress from the browser, if it has them. */
/** `readOnly`: a saved snapshot. The camera moves and the nets glow, but taps do not change the board. */
/** `base`: the board that the level opened with, before the learner placed a part. It defaults to `parts`. */
export type LevelSetup = { plan?: Plan; parts?: Part[]; base?: Part[]; progress?: Progress; readOnly?: boolean };

export type BoardState = {
  bench: Bench;
  /** The level that this board belongs to, for example "perch/1". */
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
  /** The task that the learner just finished with a part or a wire. Its "what happened" pop-up shows until `seen`. */
  done: number | null;
  flash: Flash | null;
  readOnly: boolean;

  /** Opens the board of a level. A different level starts from `setup`, or an empty bench; the same level keeps its state. */
  open: (level: string, setup?: LevelSetup) => void;
  /** Start in the intro, "Got it" on a part that is always on the bench, "Try again" on a mistake. */
  start: () => void;
  ack: () => void;
  dismiss: () => void;
  /** "Got it" on the "what happened" pop-up. */
  seen: () => void;
  /** The result of a failed level Check: the failed Checks of the session so far. */
  failed: (fails: number) => void;
  setTool: (tool: Tool) => void;
  setWireColor: (hex: string) => void;
  setHover: (hole: string | null) => void;
  /**
   * A click or tap on a hole: start a part, finish it, or remove what is in the hole.
   * With a module tool, a click puts the module there. With `preview` (a phone, which has no hover), the first tap
   * shows where the module goes, and a second tap on the same hole puts it there.
   */
  tapHole: (hole: string, preview?: boolean) => void;
  removePart: (id: string) => void;
  undo: () => void;
  cancel: () => void;
};

export function createBoardStore(bench: Bench = perchBench()) {
  return createStore<BoardState>()((set, get) => {
    /** Sends an event to the task engine. A new task selects its tool; a snap or a buzz flashes the holes of `parts`. */
    const play = (event: EngineEvent, parts: Part[] = []): Partial<BoardState> => {
      const { plan, progress, tool } = get();
      if (!plan) return {};
      const next = step(bench, plan, progress, event);
      const task = next.progress.index !== progress.index || next.progress.phase !== progress.phase ? plan.tasks[next.progress.index] : undefined;
      const finished = event.type === "change" && next.progress.tasksDone > progress.tasksDone;
      return {
        progress: next.progress,
        ...(finished && { done: progress.index }),
        tool: (next.progress.phase === "task" && task && taskTool(task.target)) || tool,
        ...(next.effect && { flash: { kind: next.effect, holes: parts.flatMap((p) => partPins(bench, p).map((pin) => pin.hole)), at: Date.now() } }),
      };
    };

    /** A new board: the engine checks the change. */
    const change = (parts: Part[], history: Part[][]) => {
      const before = get().parts;
      const added = parts.filter((p) => !before.some((b) => b.id === p.id));
      set({ parts, history, pending: null, notice: null, ...play({ type: "change", before, after: parts }, added) });
    };
    const commit = (parts: Part[]) => change(parts, [...get().history, get().parts]);

    return {
      bench,
      level: null,
      parts: [],
      base: [],
      history: [],
      tool: "wire",
      wireColor: WIRE_COLORS[0].hex,
      pending: null,
      hover: null,
      notice: null,
      plan: null,
      progress: startProgress(),
      done: null,
      flash: null,
      readOnly: false,

      open: (level, setup = {}) => {
        if (level === get().level) return;
        const progress = setup.progress ?? startProgress();
        const task = progress.phase === "task" ? setup.plan?.tasks[progress.index] : undefined;
        set({
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
          readOnly: setup.readOnly ?? false,
        });
      },
      start: () => set(play({ type: "start" })),
      ack: () => set(play({ type: "ack", parts: get().parts })),
      dismiss: () => set(play({ type: "dismiss" })),
      seen: () => set({ done: null }),
      failed: (fails) => set({ progress: { ...get().progress, fails } }),
      setTool: (tool) => set({ tool, pending: null, notice: null }),
      setWireColor: (wireColor) => set({ wireColor, tool: "wire", pending: null, notice: null }),
      setHover: (hover) => set({ hover }),
      cancel: () => set({ pending: null, notice: null }),

      tapHole: (hole, preview = false) => {
        if (get().readOnly) return;
        const { parts, tool, pending, wireColor } = get();

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

      undo: () => {
        const { history } = get();
        if (!history.length) return set({ notice: { problem: "nothing_to_undo" } });
        change(history[history.length - 1], history.slice(0, -1));
      },
    };
  });
}

/** The board of the open level. One board at a time, so one store for the app. */
export const boardStore = createBoardStore();

export const useBoard = <T>(selector: (state: BoardState) => T) => useStore(boardStore, selector);
