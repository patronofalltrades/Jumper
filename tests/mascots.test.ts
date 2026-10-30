import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import text from "@/content/ui/mascot.json";
import { loadProjects } from "@/lib/content/load";
import type { Pose } from "@/lib/game/mascot";
import { MASCOT_IDS, poseFile, projectMascot } from "@/lib/game/project-mascot";

const POSES: Pose[] = ["idle", "happy", "oops", "cheer"];
// Volt is drawn in code (components/art/volt.tsx). The other mascots are SVG files in public/mascots/.
const DRAWN = MASCOT_IDS.filter((id) => id !== "volt");

describe("projectMascot", () => {
  it("gives a project its mascot, and Volt when the project names none or an unknown one", () => {
    expect(projectMascot("bulb")).toBe("bulb");
    expect(projectMascot(undefined)).toBe("volt");
    expect(projectMascot("dragon")).toBe("volt");
  });

  it("has four mascots: Volt, Bulb, Coil and Knob", () => {
    expect([...MASCOT_IDS]).toEqual(["volt", "bulb", "coil", "knob"]);
  });

  it("names the four pose files of a mascot in public/mascots/", () => {
    expect(poseFile("bulb", "happy")).toBe("mascots/bulb-happy.svg");
  });
});

describe("mascot art", () => {
  it("has a pose file for each pose of each drawn mascot", () => {
    for (const id of DRAWN) {
      for (const pose of POSES) {
        expect(existsSync(join(process.cwd(), "public", poseFile(id, pose))), `${id} ${pose}`).toBe(true);
      }
    }
  });

  it("names each drawn mascot and each of its poses in content/ui/mascot.json", () => {
    for (const id of DRAWN) {
      expect(text.mascots[id].name.trim(), id).not.toBe("");
      for (const pose of POSES) expect(text.mascots[id].poses[pose].trim(), `${id} ${pose}`).not.toBe("");
    }
  });

  it("has no script or event handler in a pose file", () => {
    for (const id of DRAWN) {
      for (const pose of POSES) {
        const svg = readFileSync(join(process.cwd(), "public", poseFile(id, pose)), "utf8");
        expect(svg, `${id} ${pose}`).not.toMatch(/<script|\son\w+=/i);
      }
    }
  });
});

describe("content/projects mascots", () => {
  // The project files may name a mascot (a new optional field), so the test reads it without the type.
  const named = (slug: string) => (loadProjects().find((p) => p.slug === slug) as { mascot?: string } | undefined)?.mascot;

  it("gives Perch Volt and Arduino Foundations Bulb", () => {
    expect(named("perch")).toBe("volt");
    expect(named("arduino-foundations")).toBe("bulb");
  });

  it("names only a mascot that exists", () => {
    for (const p of loadProjects()) {
      const mascot = (p as { mascot?: string }).mascot;
      if (mascot !== undefined) expect(MASCOT_IDS as readonly string[], p.slug).toContain(mascot);
    }
  });
});
