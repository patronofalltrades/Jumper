export type DeviceKind = "phone" | "laptop";

/** Widest screen, in CSS px, that gets the phone layout. Tailwind's `sm:` starts at 640 px, so the two agree. */
export const PHONE_MAX_WIDTH = 639;

/** Phone or laptop, from the width of the browser window. */
export function deviceKind(width: number): DeviceKind {
  return width <= PHONE_MAX_WIDTH ? "phone" : "laptop";
}

/**
 * True when a walkthrough clip plays as a recorded video in place of the 3D replay (issue #49): the browser has no
 * WebGL, or the device is slow (2 GB of memory or less, or 2 cores or less). `memory` is empty in most browsers.
 */
export function prefersVideo({ webgl, cores, memory }: { webgl: boolean; cores: number; memory?: number }): boolean {
  return !webgl || cores <= 2 || (memory !== undefined && memory <= 2);
}
