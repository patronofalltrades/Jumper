import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { effectsFor, isSleepy, pickEmotion, type Effect, type Emotion, type Trigger } from "./alive";

// What shows on the 3D board after a level passes (issue #86): the effects, the face and the meter. The 3D scene and the
// stage panel read it; the stage writes it. It is not saved: the effects last until the learner continues.

export type MicState = "off" | "live" | "fallback";

export type Alive = {
  /** The level that passed and the way on, or null when nothing shows. */
  stage: { position: number; onDone: () => void } | null;
  effects: ReadonlySet<Effect>;
  /** The status light: lit or dark now, as it blinks. */
  ledOn: boolean;
  mic: MicState;
  /** The loudness, 0 to 1. The scene and the meter read it with getState, as it changes at each frame. */
  volume: number;
  speaking: boolean;
  /** The Talk button is held down on the board. */
  talkDown: boolean;
  /** The triggers that are active now, for example the pass. */
  moments: ReadonlySet<Trigger>;
  /** The time of the last input of the learner, in ms. */
  lastInput: number;
  sleepy: boolean;
  show: (position: number, onDone: () => void) => void;
  /** Makes a trigger active. For `holdMs` ms, or until the stage ends when `holdMs` is 0. */
  fire: (trigger: Trigger, holdMs: number) => void;
  set: (patch: Partial<Pick<Alive, "ledOn" | "mic" | "volume" | "speaking" | "sleepy">>) => void;
  /** The learner did something: the Talk button, or a tap on the panel. */
  input: (talk?: boolean) => void;
  end: () => void;
};

const NONE: ReadonlySet<never> = new Set();
const timers = new Set<ReturnType<typeof setTimeout>>();
const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers.clear();
};

const idle = { stage: null, effects: NONE as ReadonlySet<Effect>, ledOn: false, mic: "off" as MicState, volume: 0, speaking: false, talkDown: false, moments: NONE as ReadonlySet<Trigger>, sleepy: false };

export const aliveStore = createStore<Alive>()((set, get) => ({
  ...idle,
  lastInput: 0,
  show: (position, onDone) => {
    clearTimers();
    set({ ...idle, stage: { position, onDone }, effects: new Set(effectsFor(position)), lastInput: Date.now() });
  },
  fire: (trigger, holdMs) => {
    set({ moments: new Set(get().moments).add(trigger) });
    if (holdMs <= 0) return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      const next = new Set(get().moments);
      next.delete(trigger);
      set({ moments: next });
    }, holdMs);
    timers.add(timer);
  },
  set: (patch) => set(patch),
  input: (talk) => {
    set({ lastInput: Date.now(), sleepy: false });
    if (talk === undefined) return;
    set({ talkDown: talk });
    if (talk) get().fire("talk_pressed", 1500);
  },
  end: () => {
    clearTimers();
    set({ ...idle, lastInput: 0 });
  },
}));

export const useAlive = <T>(selector: (state: Alive) => T) => useStore(aliveStore, selector);

/** The triggers that are active: the moments, the voice, the microphone and the sleep. */
function activeTriggers(s: Alive): Trigger[] {
  const out = [...s.moments];
  if (s.speaking) out.push("voice_speaking");
  if (s.mic === "live" && s.volume > 0.12) out.push("mic_sound");
  if (s.sleepy) out.push("no_input");
  return out;
}

/** The face that Perch makes now. */
export const aliveEmotion = (s: Alive): Emotion => pickEmotion(activeTriggers(s));

/** True when the learner gave no input for the sleep time. */
export const aliveSleepy = (s: Alive, now: number) => s.stage !== null && isSleepy(now - s.lastInput);
