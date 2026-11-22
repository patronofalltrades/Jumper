import { describe, expect, it } from "vitest";
import { HELP_KEY, readHelp, saveHelp, showsTaskPopup, type HelpStorage } from "@/lib/game/help";
import { compareHref, doorLesson, lessonOf } from "@/lib/journey/lesson-of";

// Issue #210: the Help choice of build mode, and the link of the lobby to "Same circuit, three worlds".

const memory = (): HelpStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe("the Help choice", () => {
  it("is off until the learner sets it to on", () => {
    const storage = memory();
    expect(readHelp(storage)).toBe(false);
    saveHelp(storage, true);
    expect(storage.data.get(HELP_KEY)).toBe("on");
    expect(readHelp(storage)).toBe(true);
    saveHelp(storage, false);
    expect(readHelp(storage)).toBe(false);
  });

  it("is off in a browser that blocks storage", () => {
    const blocked: HelpStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readHelp(blocked)).toBe(false);
    expect(readHelp(null)).toBe(false);
    expect(() => saveHelp(blocked, true)).not.toThrow();
  });

  it("keeps the pop-up of a task closed, but not the pop-up of a task that needs Got it", () => {
    expect(showsTaskPopup(false, false)).toBe(false);
    expect(showsTaskPopup(false, true)).toBe(true);
    expect(showsTaskPopup(true, false)).toBe(true);
  });
});

describe("the link to Same circuit, three worlds", () => {
  it("opens a level that has a lesson file, with the panel open", () => {
    expect(compareHref(doorLesson)).toBe("/p/arduino-foundations/2?compare=1");
    expect(lessonOf(doorLesson.project, doorLesson.level)).not.toBeNull();
  });
});
