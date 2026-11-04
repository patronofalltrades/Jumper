import { describe, expect, it } from "vitest";
import { ARMS, DROP_HEIGHT, LAND_CHEER, SPOTLIGHT_TIME, bandPose, dropHeight, landTime, poseMotion } from "@/lib/game/band";

describe("dropHeight", () => {
  it("starts above the stage, comes down, and stays on the stage after it lands", () => {
    expect(dropHeight(0, 0)).toBe(DROP_HEIGHT);
    expect(dropHeight(0.3, 0)).toBeLessThan(DROP_HEIGHT);
    expect(dropHeight(0.3, 0)).toBeGreaterThan(0);
    expect(dropHeight(5, 0)).toBe(0);
  });

  it("drops each mascot after the one before it", () => {
    expect(dropHeight(0.2, 3)).toBe(DROP_HEIGHT);
    expect(dropHeight(0.2, 0)).toBeLessThan(DROP_HEIGHT);
  });
});

describe("bandPose", () => {
  const after = landTime(4) + LAND_CHEER;

  it("waits while the band drops, then all the band cheers", () => {
    expect(bandPose(0.1, 2, 4, null)).toBe("idle");
    expect(bandPose(landTime(4) + 0.1, 2, 4, null)).toBe("cheer");
  });

  it("then makes one mascot happy at a time, in turn", () => {
    expect([0, 1, 2, 3].map((i) => bandPose(after + 0.1, i, 4, null))).toEqual(["happy", "idle", "idle", "idle"]);
    expect(bandPose(after + SPOTLIGHT_TIME + 0.1, 1, 4, null)).toBe("happy");
  });

  it("makes the selected mascot cheer, and the others wait", () => {
    expect(bandPose(after + 0.1, 2, 4, 2)).toBe("cheer");
    expect(bandPose(after + 0.1, 0, 4, 2)).toBe("idle");
  });
});

describe("poseMotion", () => {
  it("keeps an idle mascot on the stage and makes a cheering mascot hop", () => {
    expect(poseMotion("idle", 1, 0).lift).toBe(0);
    expect(poseMotion("cheer", 0.4, 0).lift).toBeGreaterThan(0);
  });

  it("puts the arms up for a cheer", () => {
    expect(ARMS.cheer[0]).toBeGreaterThan(ARMS.idle[0]);
  });
});
