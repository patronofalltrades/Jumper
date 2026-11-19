import { FOOTPRINTS, type ModuleType } from "./modules.ts";

// The datasheet card of a module (issue #182). The data is in content/parts/ (`pins` and `datasheet`).
// The learner reads the pinout and the function of each pin, as on a real datasheet.

/** One pin name of the module: its printed label, what it does, and how many legs have this name. */
export type DatasheetPin = { name: string; label: string; does: string; legs: number; terminal: boolean };

/** One spot of the pinout picture: a pin, or an empty place between pins. */
export type PinoutCell = { label: string; terminal: boolean } | null;

/** The pin names in the order of the pins, each one time. */
export function datasheetPins(type: ModuleType): DatasheetPin[] {
  const part = FOOTPRINTS[type];
  const out = new Map<string, DatasheetPin>();
  for (const pin of part.pins) {
    const seen = out.get(pin.name);
    if (seen) seen.legs += 1;
    else out.set(pin.name, { name: pin.name, label: pin.label, does: part.datasheet.pins[pin.name] ?? "", legs: 1, terminal: Boolean(pin.terminal) });
  }
  return [...out.values()];
}

/** The pinout as rows of spots, from the `row` and `col` of each pin. Spots with no pin are null. */
export function pinoutGrid(type: ModuleType): PinoutCell[][] {
  const pins = FOOTPRINTS[type].pins;
  const rows = Math.max(...pins.map((p) => p.row)) + 1;
  const cols = Math.max(...pins.map((p) => p.col)) + 1;
  const grid: PinoutCell[][] = Array.from({ length: rows }, () => Array<PinoutCell>(cols).fill(null));
  for (const pin of pins) grid[pin.row][pin.col] = { label: pin.label, terminal: Boolean(pin.terminal) };
  // Rows with no pin (the space between a header and a terminal) are not useful in the picture.
  return grid.filter((row) => row.some(Boolean));
}

/** The pin names of the module that have no datasheet line, and the datasheet lines that name no pin. Both empty is correct. */
export function datasheetGaps(type: ModuleType): { missing: string[]; extra: string[] } {
  const part = FOOTPRINTS[type];
  const names = new Set(part.pins.map((p) => p.name));
  const lines = Object.keys(part.datasheet.pins);
  return {
    missing: [...names].filter((n) => !part.datasheet.pins[n]?.trim()),
    extra: lines.filter((n) => !names.has(n)),
  };
}
