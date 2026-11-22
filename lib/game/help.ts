// The Help choice of build mode (issue #210). Pure rules: no React, no DOM.
// Help off (the default): the board shows the task list and the glowing holes only. The pop-ups that explain a step
// stay closed. Help on: each pop-up opens by itself, as before issue #210.

/** The browser key of the choice. */
export const HELP_KEY = "jumper:help";

/** The part of localStorage that the choice needs. */
export type HelpStorage = Pick<Storage, "getItem" | "setItem">;

/** The saved choice. No saved choice, or a browser that blocks storage: Help is off. */
export function readHelp(storage: HelpStorage | null): boolean {
  try {
    return storage?.getItem(HELP_KEY) === "on";
  } catch {
    return false;
  }
}

/** Keeps the choice in this browser. */
export function saveHelp(storage: HelpStorage | null, on: boolean): void {
  try {
    storage?.setItem(HELP_KEY, on ? "on" : "off");
  } catch {
    // The choice still holds for this page.
  }
}

/**
 * True when the pop-up of the task shows over the board. `ack`: the task needs "Got it" (a part that is always on the
 * bench), so its pop-up shows with Help off too.
 */
export const showsTaskPopup = (help: boolean, ack: boolean): boolean => help || ack;
