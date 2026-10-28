import alive from "../../content/alive/perch.json";

// "It's alive" (issue #86): what shows on the 3D board after a Perch level passes, and which face Perch makes.
// Pure rules. The text, the levels and the triggers are in content/alive/perch.json. No React, no 3D code.

export type Effect = "led" | "mic" | "voice" | "face";
export type Trigger = keyof typeof alive.triggers;
export type Emotion = keyof typeof alive.emotions;

const LEVELS = Object.entries(alive.levels as Record<string, Effect[]>)
  .map(([position, effects]) => ({ position: Number(position), effects }))
  .sort((a, b) => a.position - b.position);

/** The effects that are on after this level passes: the effects of the level and of the levels before it. */
export const effectsFor = (position: number): Effect[] => LEVELS.filter((l) => l.position <= position).flatMap((l) => l.effects);

const EMOTIONS = Object.keys(alive.emotions) as Emotion[];

/** The emotion that a trigger makes. */
export function emotionFor(trigger: Trigger): Emotion {
  return EMOTIONS.find((e) => alive.emotions[e].trigger === trigger) ?? "idle";
}

/** The triggers of a level pass: Perch is happy, and after the last level it is excited too. */
export const passTriggers = (position: number): Trigger[] => (position >= alive.lastLevel ? ["level_pass", "all_levels_passed"] : ["level_pass"]);

/** The emotion to show when more than one trigger is active: the one that is first in `priority`. Idle with none. */
export function pickEmotion(active: Trigger[]): Emotion {
  const shown = new Set(active.map(emotionFor));
  return (alive.priority as Emotion[]).find((e) => shown.has(e)) ?? "idle";
}

/** True when the learner gave no input for the sleep time. */
export const isSleepy = (idleMs: number) => idleMs >= alive.sleepSeconds * 1000;

/**
 * The level of the meter, 0 to 1, from the loudness of the microphone (the RMS of the samples, 0 to 1).
 * Voices are quiet in this scale, so the curve lifts them.
 */
export const meterLevel = (rms: number) => Math.min(1, Math.max(0, Math.sqrt(rms) * 1.6));

/** The animated meter that shows when the browser does not give the microphone. `ms` is the time. */
export const fallbackLevel = (ms: number) => 0.45 + 0.3 * Math.sin(ms / 230) + 0.15 * Math.sin(ms / 97 + 1);

/** How much the eyes of Perch grow with the volume, 1 to 1.4 times. */
export const eyeScale = (volume: number) => 1 + 0.4 * Math.min(1, Math.max(0, volume));

/**
 * The value of an animation at time `t` (seconds), as in SVG: it goes between `values`, at `keyTimes` (0 to 1) or evenly,
 * takes `dur` seconds, repeats, and starts at `begin`. Before `begin` it gives the first value.
 */
export function keyframe(values: number[], dur: number, t: number, keyTimes?: number[], begin = 0): number {
  if (t < begin) return values[0];
  const phase = (((t - begin) % dur) + dur) % dur / dur;
  const times = keyTimes ?? values.map((_, i) => i / (values.length - 1));
  let i = times.findIndex((k, n) => n < times.length - 1 && phase < times[n + 1]);
  if (i < 0) i = times.length - 2;
  const span = times[i + 1] - times[i];
  const f = span > 0 ? (phase - times[i]) / span : 0;
  return values[i] + (values[i + 1] - values[i]) * f;
}

export const aliveText = alive.text;
export const voiceLine = alive.voiceLine;
export const showMs = alive.showSeconds * 1000;
export const aliveProject = alive.project;
