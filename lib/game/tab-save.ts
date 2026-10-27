// Pure rule for two tabs that have the same level open (issue #73). No React, no browser.

/** The part of a browser `storage` event that the rule needs. */
export type StorageChange = { key: string | null; newValue: string | null };

/**
 * True when another tab saved the board of this level (`key` is the browser key of the open level). The browser sends the
 * event only to the other tabs. A removed entry (`newValue` null) or a cleared storage (`key` null) leaves no newer board
 * to keep, so it is not a save.
 */
export const isOtherTabSave = (change: StorageChange, key: string) => change.key === key && change.newValue !== null;
