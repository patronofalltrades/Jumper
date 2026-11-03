// The first-visit tour of build mode (issue #123). Pure rules: no React, no DOM. The flag is in localStorage, one key per browser.

/** The steps of the tour, in order. Each step points at one control, which has a data-tour attribute with the same name. */
export const TOUR_STEPS = ["tasks", "connections", "clear", "check", "build"] as const;
export type TourStep = (typeof TOUR_STEPS)[number];

/** The browser key of the flag. A browser that has the key has seen the tour. */
export const TOUR_KEY = "jumper:tour-seen";

/** The part of localStorage that the flag needs. */
export type TourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The steps whose control is on the page, in order. A control that is not there (the connection list before a failed Check) has no step. */
export const tourPlan = (present: ReadonlySet<string>): TourStep[] => TOUR_STEPS.filter((step) => present.has(step));

/** The index of the step after `index` in the plan, or null after the last step. */
export const nextIndex = (index: number, plan: readonly TourStep[]): number | null => (index + 1 < plan.length ? index + 1 : null);

/** The tour shows when the learner has not seen it, and no pop-up, intro clip or Check card is open. */
export const shouldShowTour = (seen: boolean, busy: boolean): boolean => !seen && !busy;

/**
 * True when the learner has seen the tour. A browser that blocks storage (or has none) counts as seen,
 * so the tour does not come back on each visit.
 */
export function tourSeen(storage: TourStorage | null): boolean {
  try {
    return storage === null || storage.getItem(TOUR_KEY) !== null;
  } catch {
    return true;
  }
}

/** Keeps the flag, so the tour does not show again in this browser. */
export function markTourSeen(storage: TourStorage | null): void {
  try {
    storage?.setItem(TOUR_KEY, "1");
  } catch {
    // The browser blocks storage: the tour is not kept, and it does not show again in this visit.
  }
}

/** Removes the flag, so the tour shows the next time the learner opens build mode. */
export function resetTour(storage: TourStorage | null): void {
  try {
    storage?.removeItem(TOUR_KEY);
  } catch {
    // The browser blocks storage: there is no flag to remove.
  }
}

/** The place of a control on the screen, in pixels from the top of the window. */
export type Band = { top: number; bottom: number };

/** The space between the control and the card. */
const GAP = 22;

/**
 * Where the card goes: under the control, or above it. The card goes under when it fits, so it does not cover the control.
 * When neither side fits, it goes on the side with more room.
 */
export function cardSide(target: Band, viewportHeight: number, cardHeight: number): "top" | "bottom" {
  const below = viewportHeight - target.bottom - GAP;
  const above = target.top - GAP;
  if (below >= cardHeight) return "bottom";
  if (above >= cardHeight) return "top";
  return above > below ? "top" : "bottom";
}
