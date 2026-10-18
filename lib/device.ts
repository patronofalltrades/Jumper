export type DeviceKind = "phone" | "laptop";

/** Widest screen, in CSS px, that gets the phone layout. Tailwind's `sm:` starts at 640 px, so the two agree. */
export const PHONE_MAX_WIDTH = 639;

/** Phone or laptop, from the width of the browser window. */
export function deviceKind(width: number): DeviceKind {
  return width <= PHONE_MAX_WIDTH ? "phone" : "laptop";
}
