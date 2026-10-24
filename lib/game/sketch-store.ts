import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

// The sketch that runs on the board now (issue #58): the LEDs that it lights, and the buttons that the learner holds
// down. The 3D scene reads it; the code panel writes it. It is not saved: a reload stops the sketch.

export type SketchRun = {
  running: boolean;
  /** The ids of the LEDs that light: part ids, and "uno.L" for the L light of the Uno. */
  lit: ReadonlySet<string>;
  /** The ids of the buttons that the learner holds down. */
  pressed: ReadonlySet<string>;
  start: () => void;
  stop: () => void;
  setLit: (lit: ReadonlySet<string>) => void;
  press: (id: string, down: boolean) => void;
};

const NONE: ReadonlySet<string> = new Set();
const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

export const sketchStore = createStore<SketchRun>()((set, get) => ({
  running: false,
  lit: NONE,
  pressed: NONE,
  start: () => set({ running: true, lit: NONE, pressed: NONE }),
  stop: () => set({ running: false, lit: NONE, pressed: NONE }),
  setLit: (lit) => {
    if (!same(lit, get().lit)) set({ lit });
  },
  press: (id, down) => {
    const { pressed, running } = get();
    if (!running || pressed.has(id) === down) return;
    const next = new Set(pressed);
    if (down) next.add(id);
    else next.delete(id);
    set({ pressed: next });
  },
}));

export const useSketch = <T>(selector: (state: SketchRun) => T) => useStore(sketchStore, selector);
