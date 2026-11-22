// The line under the toolbar that tells what a tool is (issue #136). In quiet build mode (issue #218) it shows only the
// first time that the learner selects each tool in this browser. Pure rules: no React, no DOM.

/** The browser key of the tools whose line the learner saw. */
export const TOOL_TIPS_KEY = "jumper:tool-tips-seen";

/** The part of localStorage that the list needs. */
export type TipStorage = Pick<Storage, "getItem" | "setItem">;

/** The tools whose line this browser showed. Null: the browser blocks storage (or has none). */
export function readToolTips(storage: TipStorage | null): string[] | null {
  if (storage === null) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(TOOL_TIPS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return null;
  }
}

/**
 * True when the line of `tool` shows: the first time in this browser. A browser that blocks storage shows the line
 * each time, as before issue #218, so the learner never loses the text.
 */
export const showsToolTip = (seen: readonly string[] | null, tool: string): boolean => seen === null || !seen.includes(tool);

/** Keeps the tool in the list, so its line does not show again in this browser. Each tool is in the list one time. */
export function markToolTip(storage: TipStorage | null, tool: string): void {
  if (storage === null) return;
  try {
    const seen = readToolTips(storage) ?? [];
    if (!seen.includes(tool)) storage.setItem(TOOL_TIPS_KEY, JSON.stringify([...seen, tool]));
  } catch {
    // Private mode or a full storage: the line shows again the next time.
  }
}
