// The camera distance of "Show me" (issue #90). Pure: no three.js, no React. The scene passes its own limits.

/** The vertical field of view of the bench camera (build-scene.tsx). */
const VERTICAL_FOV = (35 * Math.PI) / 180;
/** Room around the two holes, in hole pitches, so they are not at the edge of the screen. */
const MARGIN = 4;

/**
 * The distance from the camera to the middle of two holes, so that both holes fit across the screen.
 * `span`: the distance between the two holes, in hole pitches. `aspect`: the width of the screen divided by its height.
 * The result stays between `min` and `max`.
 */
export function focusDistance(span: number, aspect: number, min: number, max: number): number {
  const horizontal = 2 * Math.atan(Math.tan(VERTICAL_FOV / 2) * aspect);
  const distance = (span / 2 + MARGIN) / Math.tan(horizontal / 2);
  return Math.min(max, Math.max(min, distance));
}
