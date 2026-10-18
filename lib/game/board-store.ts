import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { perchBench, type Bench } from "@/lib/circuit/bench";
import { checkHole, checkPlacement, nextPartId, partAt, type Part, type PartType, type PlaceProblem } from "@/lib/circuit/parts";

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

export type BoardState = {
  bench: Bench;
  /** The level that this board belongs to, for example "perch/1". */
  level: string | null;
  parts: Part[];
  /** Earlier versions of `parts`, newest last. Undo goes back one. */
  history: Part[][];
  tool: Tool;
  wireColor: string;
  /** The first hole of a part that is not finished yet. */
  pending: string | null;
  /** The hole whose net glows: under the pointer on a laptop, the last tapped hole on a phone. */
  hover: string | null;
  notice: Notice | null;

  /** Opens the board of a level. A different level starts with an empty bench; the same level keeps its parts. */
  open: (level: string) => void;
  setTool: (tool: Tool) => void;
  setWireColor: (hex: string) => void;
  setHover: (hole: string | null) => void;
  /** A click or tap on a hole: start a part, finish it, or remove what is in the hole. */
  tapHole: (hole: string) => void;
  removePart: (id: string) => void;
  undo: () => void;
  cancel: () => void;
};

export function createBoardStore(bench: Bench = perchBench()) {
  return createStore<BoardState>()((set, get) => {
    const commit = (parts: Part[]) => set((s) => ({ parts, history: [...s.history, s.parts], pending: null, notice: null }));

    return {
      bench,
      level: null,
      parts: [],
      history: [],
      tool: "wire",
      wireColor: WIRE_COLORS[0].hex,
      pending: null,
      hover: null,
      notice: null,

      open: (level) => {
        if (level !== get().level) set({ level, parts: [], history: [], tool: "wire", pending: null, hover: null, notice: null });
      },
      setTool: (tool) => set({ tool, pending: null, notice: null }),
      setWireColor: (wireColor) => set({ wireColor, tool: "wire", pending: null, notice: null }),
      setHover: (hover) => set({ hover }),
      cancel: () => set({ pending: null, notice: null }),

      tapHole: (hole) => {
        const { parts, tool, pending, wireColor } = get();

        if (tool === "remove") {
          const part = partAt(parts, hole);
          if (part) get().removePart(part.id);
          else set({ notice: { problem: "nothing_to_remove", hole } });
          return;
        }

        if (hole === pending) return set({ pending: null, notice: null });

        if (!pending) {
          const problem = checkHole(bench, parts, hole);
          return set(problem ? { notice: { problem, hole } } : { pending: hole, notice: null });
        }

        const problem = checkPlacement(bench, parts, tool, pending, hole);
        if (problem) return set({ notice: { problem, hole } });

        const part: Part = { id: nextPartId(parts, tool), type: tool, a: pending, b: hole };
        if (tool === "wire") part.color = wireColor;
        commit([...parts, part]);
      },

      removePart: (id) => commit(get().parts.filter((p) => p.id !== id)),

      undo: () => {
        const { history } = get();
        if (!history.length) return set({ notice: { problem: "nothing_to_undo" } });
        set({ parts: history[history.length - 1], history: history.slice(0, -1), pending: null, notice: null });
      },
    };
  });
}

/** The board of the open level. One board at a time, so one store for the app. */
export const boardStore = createBoardStore();

export const useBoard = <T>(selector: (state: BoardState) => T) => useStore(boardStore, selector);
