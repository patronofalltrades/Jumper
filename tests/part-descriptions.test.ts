import { describe, expect, it } from "vitest";
import build from "@/content/ui/build.json";

// Issue #136: each tool and each tray part has a short description. It says what the part is and what it does.
// The tool ids are the ones in TOOLS (components/build/build-view.tsx), except "parts", which opens the tray.

const TOOL_IDS = ["wire", "resistor", "led", "remove"];
const about: Record<string, string> = (build as { about?: Record<string, string> }).about ?? {};
const TRAY_IDS = Object.keys(build.tray.parts);

describe("part descriptions (issue #136)", () => {
  it("gives every tool a description", () => {
    for (const id of TOOL_IDS) expect(about[id]?.trim(), id).toBeTruthy();
  });

  it("gives every tray part a description", () => {
    for (const id of TRAY_IDS) expect(about[id]?.trim(), id).toBeTruthy();
  });

  it("keeps each description short", () => {
    for (const id of [...TOOL_IDS, ...TRAY_IDS]) expect(about[id]?.length ?? 0, id).toBeLessThanOrEqual(180);
  });
});
