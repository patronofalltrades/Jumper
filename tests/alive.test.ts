import { describe, expect, it } from "vitest";
import alive from "@/content/alive/perch.json";
import { effectsFor, emotionFor, eyeScale, fallbackLevel, isSleepy, keyframe, meterLevel, passTriggers, pickEmotion } from "@/lib/game/alive";

describe("effectsFor: which effects are on after a level passes", () => {
  it("has no effect for level 1", () => {
    expect(effectsFor(1)).toEqual([]);
  });

  it("level 2 blinks the status light", () => {
    expect(effectsFor(2)).toEqual(["led"]);
  });

  it("the effects stack: a later level also shows the earlier effects", () => {
    expect(effectsFor(3)).toEqual(["led", "mic"]);
    expect(effectsFor(4)).toEqual(["led", "mic", "voice"]);
    expect(effectsFor(5)).toEqual(["led", "mic", "voice", "face"]);
  });

  it("gives the same effects for a level after the last one", () => {
    expect(effectsFor(9)).toEqual(effectsFor(5));
  });
});

describe("emotionFor: which emotion shows for each trigger", () => {
  const cases = [
    ["default", "idle"],
    ["level_pass", "happy"],
    ["voice_speaking", "talking"],
    ["mic_sound", "listening"],
    ["check_pressed", "thinking"],
    ["talk_pressed", "surprised"],
    ["check_failed", "sad"],
    ["no_input", "sleepy"],
    ["all_levels_passed", "excited"],
  ] as const;

  it.each(cases)("%s shows %s", (trigger, emotion) => {
    expect(emotionFor(trigger)).toBe(emotion);
  });

  it("has a trigger text for each trigger and a name for each emotion", () => {
    for (const [trigger] of cases) expect(alive.triggers[trigger].length).toBeGreaterThan(0);
    expect(Object.values(alive.emotions).every((e) => e.name.length > 0)).toBe(true);
  });
});

describe("passTriggers", () => {
  it("a pass of a middle level makes Perch happy", () => {
    expect(passTriggers(2)).toEqual(["level_pass"]);
    expect(passTriggers(4)).toEqual(["level_pass"]);
  });

  it("the pass of the last level makes Perch happy, then excited", () => {
    expect(passTriggers(5)).toEqual(["level_pass", "all_levels_passed"]);
  });
});

describe("pickEmotion", () => {
  it("is idle with no trigger", () => {
    expect(pickEmotion([])).toBe("idle");
  });

  it("takes the trigger with the highest priority", () => {
    expect(pickEmotion(["voice_speaking", "mic_sound"])).toBe("talking");
    expect(pickEmotion(["mic_sound", "check_failed"])).toBe("sad");
    expect(pickEmotion(["no_input", "level_pass"])).toBe("happy");
  });
});

describe("isSleepy", () => {
  it("is sleepy after 30 seconds with no input", () => {
    expect(isSleepy(29_999)).toBe(false);
    expect(isSleepy(30_000)).toBe(true);
  });
});

describe("the level meter", () => {
  it("is 0 for silence and goes up with the sound, up to 1", () => {
    expect(meterLevel(0)).toBe(0);
    expect(meterLevel(0.1)).toBeGreaterThan(meterLevel(0.02));
    expect(meterLevel(5)).toBe(1);
  });

  it("the animated fallback stays between 0 and 1 and moves", () => {
    const values = [0, 250, 500, 750, 1000].map(fallbackLevel);
    expect(values.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });
});

describe("eyeScale", () => {
  it("the eyes are normal in silence and grow with the volume", () => {
    expect(eyeScale(0)).toBe(1);
    expect(eyeScale(1)).toBeGreaterThan(eyeScale(0.5));
    expect(eyeScale(3)).toBe(eyeScale(1));
  });
});

describe("keyframe (the animations of the face)", () => {
  it("goes between the values, evenly", () => {
    expect(keyframe([0, 10], 2, 1)).toBe(5);
    expect(keyframe([0, 10, 0], 2, 1)).toBe(10);
  });

  it("repeats", () => {
    expect(keyframe([0, 10], 2, 3)).toBe(5);
  });

  it("uses key times when it has them", () => {
    const blink = [56, 56, 4, 56, 56];
    const times = [0, 0.9, 0.94, 0.98, 1];
    expect(keyframe(blink, 3.5, 0.5, times)).toBe(56);
    expect(keyframe(blink, 3.5, 3.5 * 0.94, times)).toBe(4);
  });

  it("waits for the begin time", () => {
    expect(keyframe([0, 1, 0], 1, 0.2, undefined, 0.5)).toBe(0);
    expect(keyframe([0, 1, 0], 1, 1, undefined, 0.5)).toBe(1);
  });
});
