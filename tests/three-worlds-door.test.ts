import { describe, expect, it } from "vitest";
import { compareHref, doorLesson, lessonOf } from "@/lib/journey/lesson-of";

// Issue #210: the card of the lobby that opens "Same circuit, three worlds".

describe("the link to Same circuit, three worlds", () => {
  it("opens a level that has a lesson file, with the panel open", () => {
    expect(compareHref(doorLesson)).toBe("/p/arduino-foundations/2?compare=1");
    expect(lessonOf(doorLesson.project, doorLesson.level)).not.toBeNull();
  });
});
