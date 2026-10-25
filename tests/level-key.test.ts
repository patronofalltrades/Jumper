import { describe, expect, it } from "vitest";
import { levelKey } from "@/lib/game/level-key";

describe("levelKey", () => {
  it("is different for two users on the same level", () => {
    expect(levelKey("a", "perch", 1)).not.toBe(levelKey("b", "perch", 1));
  });

  it("is the same for the same user, project and level", () => {
    expect(levelKey("a", "perch", 1)).toBe(levelKey("a", "perch", 1));
  });

  it("is different for two levels and two projects of one user", () => {
    expect(levelKey("a", "perch", 1)).not.toBe(levelKey("a", "perch", 2));
    expect(levelKey("a", "perch", 1)).not.toBe(levelKey("a", "arduino-foundations", 1));
  });
});
