import { describe, expect, it } from "vitest";
import { mascotLevel, mascotPose } from "@/lib/game/mascot";
import { levelStatuses } from "@/lib/game/map";
import text from "@/content/ui/mascot.json";

describe("mascotPose", () => {
  it("waits (idle) while a task is open", () => {
    expect(mascotPose({ phase: "task", done: null })).toBe("idle");
    expect(mascotPose({ phase: "intro", done: null })).toBe("idle");
  });

  it("is happy when a task is done, until the learner reads what happened", () => {
    expect(mascotPose({ phase: "task", done: 0 })).toBe("happy");
    // The last task is done: the engine is ready for the Check, but the "what happened" pop-up shows first.
    expect(mascotPose({ phase: "ready_to_check", done: 4 })).toBe("happy");
  });

  it("says oops on a wrong part or wire", () => {
    expect(mascotPose({ phase: "mistake", done: null })).toBe("oops");
  });
});

describe("mascotLevel", () => {
  it("stands on level 1 for a new learner", () => {
    expect(mascotLevel(levelStatuses(5, []))).toBe(0);
  });

  it("stands on the first open level", () => {
    expect(mascotLevel(levelStatuses(5, [1, 2]))).toBe(2);
    // Level 3 passed before level 2 (old data): level 2 is the first open level.
    expect(mascotLevel(levelStatuses(5, [1, 3]))).toBe(1);
  });

  it("stands on the last level when all levels passed", () => {
    expect(mascotLevel(levelStatuses(5, [1, 2, 3, 4, 5]))).toBe(4);
  });

  it("has no level when the project has no levels", () => {
    expect(mascotLevel([])).toBe(-1);
  });
});

describe("content/ui/mascot.json", () => {
  it("names Volt and has a text for each pose", () => {
    expect(text.name).toBe("Volt");
    expect(Object.keys(text.poses).sort()).toEqual(["cheer", "happy", "idle", "oops"]);
  });
});
