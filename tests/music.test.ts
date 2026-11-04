import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import music from "@/content/music.json";
import { loadProjects } from "@/lib/content/load";
import { levelTrack } from "@/lib/game/music";

describe("level music", () => {
  it("finds the track of a level, and gives null when there is none", () => {
    expect(levelTrack(music, "perch", 3)?.file).toBe("/music/perch-3.mp3");
    expect(levelTrack(music, "perch", 99)).toBeNull();
    expect(levelTrack(music, "focus-timer", 1)).toBeNull();
    expect(levelTrack(music, "_note", 1)).toBeNull();
  });

  it("gives each level of each available project a CC0 track whose file is in public/", () => {
    for (const project of loadProjects().filter((p) => p.status === "available")) {
      for (const level of project.levels) {
        const track = levelTrack(music, project.slug, level.position);
        expect(track, `${project.slug} level ${level.position}`).not.toBeNull();
        expect(track!.license).toBe("CC0");
        expect(existsSync(join(process.cwd(), "public", track!.file))).toBe(true);
      }
    }
  });
});
