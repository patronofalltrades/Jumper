import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import file from "@/content/videos.json";
import { loadBoards } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { prefersVideo } from "@/lib/device";
import { levelVideo, VIDEO_DIR, VIDEO_SIZES, videoSrc, videos } from "@/lib/content/videos";

const dir = join(process.cwd(), "public", VIDEO_DIR);
const files = () => readdirSync(dir).filter((f) => !f.startsWith("."));

describe("the video files", () => {
  it("has a video for each Perch level and each Arduino Foundations level, and the intro video", async () => {
    for (const slug of ["perch", "arduino-foundations"]) {
      const boards = await loadBoards(slug);
      for (const level of loadProjects().find((p) => p.slug === slug)!.levels) {
        expect(boards.levels[level.position], `${slug} level ${level.position}`).toBeDefined();
        expect(levelVideo(slug, level.position), `${slug} level ${level.position}`).toBeDefined();
      }
    }
    expect(videos.find((v) => v.id === "intro")).toBeDefined();
  });

  it("gives each video a level that exists, and a title and a caption", () => {
    const projects = loadProjects();
    for (const v of videos) {
      expect(v.title.length, v.id).toBeGreaterThan(0);
      expect(v.caption.length, v.id).toBeGreaterThan(0);
      if (v.id === "intro") continue;
      const project = projects.find((p) => p.slug === v.project);
      expect(project?.levels.some((l) => l.position === v.level), v.id).toBe(true);
    }
  });

  it("has a file at each size for each video", () => {
    for (const v of videos) for (const size of VIDEO_SIZES) expect(files()).toContain(`${v.id}-${size}.webm`);
  });

  it("has a video in content/videos.json for each file", () => {
    const names = videos.flatMap((v) => VIDEO_SIZES.map((size) => `${v.id}-${size}.webm`));
    for (const f of files()) expect(names, f).toContain(f);
  });

  it("keeps each Arduino Foundations file under 1 MB", () => {
    for (const f of files().filter((f) => f.startsWith("arduino-foundations-"))) expect(statSync(join(dir, f)).size, f).toBeLessThan(1024 * 1024);
  });

  it("keeps the files small: less than 10 MB in total", () => {
    const total = files().reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
    expect(total).toBeLessThan(10 * 1024 * 1024);
  });
});

describe("videoSrc and levelVideo", () => {
  it("gives the path of the file for a size", () => {
    expect(videoSrc("perch-3", "phone")).toBe("/videos/perch-3-phone.webm");
    expect(videoSrc("intro", "laptop")).toBe("/videos/intro-laptop.webm");
    expect(videoSrc("arduino-foundations-2", "phone")).toBe("/videos/arduino-foundations-2-phone.webm");
  });

  it("finds the video of a level, and nothing for a level without one", () => {
    expect(levelVideo("perch", 3)?.id).toBe("perch-3");
    expect(levelVideo("perch", 9)).toBeUndefined();
    expect(levelVideo("arduino-foundations", 1)?.id).toBe("arduino-foundations-1");
    expect(levelVideo("arduino-foundations", 5)).toBeUndefined();
  });

  it("uses the sizes of content/videos.json", () => {
    expect(Object.keys(file.sizes).sort()).toEqual([...VIDEO_SIZES].sort());
  });
});

describe("prefersVideo", () => {
  const fast = { webgl: true, cores: 8, memory: 8 };

  it("plays the 3D replay on a device that is fast enough", () => {
    expect(prefersVideo(fast)).toBe(false);
    expect(prefersVideo({ ...fast, memory: undefined })).toBe(false);
  });

  it("plays the video when the browser has no 3D (WebGL)", () => {
    expect(prefersVideo({ ...fast, webgl: false })).toBe(true);
  });

  it("plays the video on a slow device: 2 GB of memory or less, or 2 cores or less", () => {
    expect(prefersVideo({ ...fast, memory: 2 })).toBe(true);
    expect(prefersVideo({ ...fast, cores: 2 })).toBe(true);
    expect(prefersVideo({ ...fast, memory: 4, cores: 4 })).toBe(false);
  });
});

describe("the proxy", () => {
  it("does not send a visitor who opens a video file to the log-in page", async () => {
    const { config } = await import("@/proxy");
    const matches = (path: string) => config.matcher.some((m) => new RegExp(`^${m}$`).test(path));
    expect(matches("/lobby")).toBe(true);
    expect(matches(videoSrc("intro", "laptop"))).toBe(false);
    expect(matches(videoSrc("perch-3", "phone"))).toBe(false);
  });
});
