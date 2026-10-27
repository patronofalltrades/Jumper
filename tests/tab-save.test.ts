import { describe, expect, it } from "vitest";
import { saveKey } from "@/lib/game/level-key";
import { isOtherTabSave } from "@/lib/game/tab-save";

const mine = saveKey("u", "perch", 2);
const saved = (key: string | null, newValue: string | null = '{"parts":[]}') => ({ key, newValue });

describe("saveKey", () => {
  it("keeps the key that boards already have in the browser", () => {
    expect(saveKey("u", "perch", 2)).toBe("jumper:u:perch/2");
  });
});

describe("isOtherTabSave", () => {
  it("is true when another tab saves the same user, project and level", () => {
    expect(isOtherTabSave(saved(mine), mine)).toBe(true);
  });

  it("is false for another level, another project or another user", () => {
    expect(isOtherTabSave(saved(saveKey("u", "perch", 3)), mine)).toBe(false);
    expect(isOtherTabSave(saved(saveKey("u", "arduino-foundations", 2)), mine)).toBe(false);
    expect(isOtherTabSave(saved(saveKey("v", "perch", 2)), mine)).toBe(false);
  });

  it("is false when the entry is removed or the storage is cleared", () => {
    expect(isOtherTabSave(saved(mine, null), mine)).toBe(false);
    expect(isOtherTabSave(saved(null, null), mine)).toBe(false);
  });

  it("matches the whole key, not the start of it", () => {
    expect(isOtherTabSave(saved(saveKey("u", "perch", 20)), mine)).toBe(false);
  });
});
