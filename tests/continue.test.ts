import { describe, expect, it } from "vitest";
import { continueTarget } from "@/lib/game/continue";

describe("continueTarget", () => {
  it("starts a new user at level 1", () => {
    expect(continueTarget(null, 5)).toEqual({ level: 1, started: false });
  });

  it("goes back to the level of a session in progress", () => {
    expect(continueTarget({ level: 3, status: "in_progress" }, 5)).toEqual({ level: 3, started: true });
  });

  it("goes back to the level of an abandoned session, because that level did not pass", () => {
    expect(continueTarget({ level: 2, status: "abandoned" }, 5)).toEqual({ level: 2, started: true });
  });

  it("goes to the next level when the latest session is completed", () => {
    expect(continueTarget({ level: 2, status: "completed" }, 5)).toEqual({ level: 3, started: true });
  });

  it("stays on the last level when the last level is completed", () => {
    expect(continueTarget({ level: 5, status: "completed" }, 5)).toEqual({ level: 5, started: true });
  });
});
