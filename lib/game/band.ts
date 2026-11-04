// The 3D mascot band of the landing page (components/mascots-3d). Pure rules: no React, no three.js.
// Times are in seconds from the start of the scene. Angles are in radians.
import type { Pose } from "./mascot";

/** The time between two mascots that drop on the stage. */
export const DROP_GAP = 0.18;
/** The time that one mascot takes to drop and land. */
export const DROP_TIME = 0.7;
/** The height from which a mascot drops. */
export const DROP_HEIGHT = 6;
/** All the band cheers for this time after the last mascot lands. */
export const LAND_CHEER = 1.4;
/** The time that each mascot is happy, one after the other, while no mascot is selected. */
export const SPOTLIGHT_TIME = 2.4;

/** The arm angles (left, right) of each pose. 0 is down; positive is out from the body. */
export const ARMS: Record<Pose, [number, number]> = { idle: [0.45, 0.45], happy: [0.45, 2.5], oops: [1.1, 1.1], cheer: [2.6, 2.6] };

/** The height above the stage of mascot `index` at time `t`: it drops in from above, lands with a small bounce, then 0. */
export function dropHeight(t: number, index: number): number {
  const k = (t - index * DROP_GAP) / DROP_TIME;
  if (k <= 0) return DROP_HEIGHT;
  if (k >= 1) return 0;
  // Fall for the first 70%, then one small bounce.
  if (k < 0.7) return DROP_HEIGHT * (1 - (k / 0.7) ** 2);
  const b = (k - 0.7) / 0.3;
  return 0.6 * 4 * b * (1 - b);
}

/** The time at which the last of `count` mascots lands. */
export const landTime = (count: number) => (count - 1) * DROP_GAP + DROP_TIME;

/**
 * The pose of mascot `index` at time `t`. The selected mascot (pointer or tap) cheers. Just after the band lands, all cheer.
 * Then each mascot is happy in turn, and the others wait.
 */
export function bandPose(t: number, index: number, count: number, selected: number | null): Pose {
  if (selected === index) return "cheer";
  const landed = landTime(count);
  if (t < landed + LAND_CHEER) return t < landed ? "idle" : "cheer";
  if (selected !== null) return "idle";
  return Math.floor((t - landed - LAND_CHEER) / SPOTLIGHT_TIME) % count === index ? "happy" : "idle";
}

/** The body motion of a pose: lift above the stage, squash (1 is none) and side tilt. `phase` puts the mascots out of step. */
export function poseMotion(pose: Pose, t: number, phase: number): { lift: number; squash: number; tilt: number } {
  const p = t * 2 + phase;
  if (pose === "happy") {
    const h = Math.abs(Math.sin(p * 1.6));
    return { lift: h * 0.35, squash: 1 - (1 - h) * 0.05, tilt: Math.sin(p * 1.6) * 0.05 };
  }
  if (pose === "cheer") {
    const h = Math.abs(Math.sin(p * 2.2));
    return { lift: h * 0.8, squash: 1 + (h - 0.5) * 0.08, tilt: 0 };
  }
  if (pose === "oops") return { lift: 0, squash: 1, tilt: Math.sin(t * 22) * 0.06 };
  return { lift: 0, squash: 1 + Math.sin(p * 0.8) * 0.02, tilt: 0 };
}
