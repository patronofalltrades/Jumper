import { describe, expect, it } from "vitest";
import { animateFrom, countValue, mapProgressKey, parseStoredProgress } from "@/lib/game/map-progress";

describe("map progress animation", () => {
  it("does not animate on the first visit, when nothing is stored", () => {
    expect(animateFrom(null, { passed: [1, 2], xp: 80 })).toBeNull();
  });

  it("does not animate when the map already showed the server state", () => {
    expect(animateFrom({ passed: [1], xp: 40 }, { passed: [1], xp: 40 })).toBeNull();
  });

  it("animates from the stored state when a level passed", () => {
    expect(animateFrom({ passed: [1], xp: 40 }, { passed: [1, 2], xp: 80 })).toEqual({ passed: [1], xp: 40 });
  });

  it("animates from the stored state when only the XP went up", () => {
    expect(animateFrom({ passed: [1], xp: 40 }, { passed: [1], xp: 55 })).toEqual({ passed: [1], xp: 40 });
  });

  it("does not animate when the server state is behind the stored state", () => {
    expect(animateFrom({ passed: [1, 2], xp: 80 }, { passed: [1], xp: 40 })).toBeNull();
  });

  it("parses a stored state and rejects anything else", () => {
    expect(parseStoredProgress('{"passed":[1,2],"xp":80}')).toEqual({ passed: [1, 2], xp: 80 });
    expect(parseStoredProgress(null)).toBeNull();
    expect(parseStoredProgress("not json")).toBeNull();
    expect(parseStoredProgress('{"passed":"1","xp":80}')).toBeNull();
    expect(parseStoredProgress('{"passed":[1],"xp":-5}')).toBeNull();
  });

  it("counts the XP from the stored value to the server value, and ends on the server value", () => {
    expect(countValue(40, 80, 0)).toBe(40);
    expect(countValue(40, 80, 1)).toBe(80);
    expect(countValue(40, 80, 0.5)).toBeGreaterThan(40);
    expect(countValue(40, 80, 0.5)).toBeLessThan(80);
  });

  it("keeps the stored state of each user and project apart, under the saved-board prefix of the user", () => {
    expect(mapProgressKey("u1", "perch")).toBe("jumper:u1:map/perch");
    expect(mapProgressKey("u1", "perch")).not.toBe(mapProgressKey("u1", "focus-timer"));
    expect(mapProgressKey("u1", "perch").startsWith("jumper:u1:")).toBe(true);
  });
});
