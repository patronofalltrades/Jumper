import { describe, expect, it } from "vitest";
import { markToolTip, readToolTips, showsToolTip, TOOL_TIPS_KEY } from "@/lib/game/tool-tips";

// Issue #218 (quiet build mode): the line that tells what a tool is shows only the first time for each tool.

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};
const blocked = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("the tool line shows one time for each tool", () => {
  it("shows the first time, and not after the tool is kept", () => {
    const storage = memory();
    expect(showsToolTip(readToolTips(storage), "wire")).toBe(true);
    markToolTip(storage, "wire");
    expect(showsToolTip(readToolTips(storage), "wire")).toBe(false);
    // A different tool still shows its line.
    expect(showsToolTip(readToolTips(storage), "led")).toBe(true);
  });

  it("keeps each tool one time", () => {
    const storage = memory();
    markToolTip(storage, "wire");
    markToolTip(storage, "wire");
    markToolTip(storage, "remove");
    expect(JSON.parse(storage.data.get(TOOL_TIPS_KEY)!)).toEqual(["wire", "remove"]);
  });

  it("shows the line each time when the browser blocks storage", () => {
    expect(readToolTips(null)).toBeNull();
    expect(readToolTips(blocked)).toBeNull();
    expect(showsToolTip(null, "wire")).toBe(true);
    expect(() => markToolTip(blocked, "wire")).not.toThrow();
  });

  it("reads bad stored data as an empty list", () => {
    const storage = memory();
    storage.setItem(TOOL_TIPS_KEY, '{"wire":true}');
    expect(readToolTips(storage)).toEqual([]);
  });
});
