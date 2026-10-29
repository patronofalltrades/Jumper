import { describe, expect, it } from "vitest";
import { focusDistance } from "@/lib/game/focus";

// The camera distance of "Show me" (issue #90): far enough to see the two holes, never closer or farther than the
// camera limits of the scene.
const MIN = 12;
const MAX = 140;

describe("focus distance of Show me", () => {
  it("is farther for two holes that are far apart", () => {
    expect(focusDistance(10, 1.6, MIN, MAX)).toBeLessThan(focusDistance(20, 1.6, MIN, MAX));
  });

  it("is farther on a phone in portrait than on a laptop, for the same two holes", () => {
    expect(focusDistance(10, 0.46, MIN, MAX)).toBeGreaterThan(focusDistance(10, 1.6, MIN, MAX));
  });

  it("stays inside the camera limits", () => {
    expect(focusDistance(0, 1.6, MIN, MAX)).toBe(MIN);
    expect(focusDistance(500, 0.46, MIN, MAX)).toBe(MAX);
  });
});
