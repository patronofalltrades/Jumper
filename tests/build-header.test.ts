import { describe, expect, it } from "vitest";
import { buildEyebrow } from "@/lib/game/build-header";
import { loadProjects } from "@/lib/content/load";
import text from "@/content/ui/build.json";

describe("buildEyebrow (build page header, issue #134)", () => {
  it("shows the project, the board and the level, with the words from content/ui/build.json", () => {
    expect(buildEyebrow(text.header.eyebrow, { title: "Perch: a home for your AI agent", board: "ESP32-S3" }, 2)).toBe(
      "Perch · ESP32-S3 · Level 2",
    );
  });

  it("uses the board of each project, not a fixed one", () => {
    expect(buildEyebrow(text.header.eyebrow, { title: "Arduino Foundations", board: "Arduino Uno" }, 1)).toBe(
      "Arduino Foundations · Arduino Uno · Level 1",
    );
  });

  it("matches the board of the real Perch content file", () => {
    const perch = loadProjects().find((p) => p.slug === "perch");
    expect(perch).toBeDefined();
    expect(buildEyebrow(text.header.eyebrow, perch!, 2)).toBe("Perch · ESP32-S3 · Level 2");
  });
});
