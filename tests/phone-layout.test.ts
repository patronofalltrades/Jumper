import { describe, expect, it } from "vitest";
import { panelStartsOpen } from "@/lib/game/phone-layout";

// Issue #126: on a phone (below 640 px) the connection list starts closed, as a chip. The code panel also closes it,
// so the board stays in view. The task list always starts closed (issue #218, quiet build mode), so it does not use this rule.

describe("side panels start open or closed", () => {
  it("opens on a laptop", () => {
    expect(panelStartsOpen(true, false)).toBe(true);
  });

  it("starts closed on a phone", () => {
    expect(panelStartsOpen(false, false)).toBe(false);
  });

  it("starts closed on a laptop when the code panel is open", () => {
    expect(panelStartsOpen(true, true)).toBe(false);
  });
});
