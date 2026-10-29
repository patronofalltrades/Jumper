import type { Bench } from "@/lib/circuit/bench";
import type { ConnectionState } from "@/lib/circuit/check";
import type { Part } from "@/lib/circuit/parts";
import type { Plan } from "./engine";

// Issue #113 (red step): the types only. The logic comes in the next commit.

export type HologramTarget = { kind: "task"; index: number } | { kind: "connection"; a: string; b: string };
export type Ghost = { parts: Part[]; line: string[] };

export function connectionHologram(state: ConnectionState): HologramTarget | null {
  void state;
  return null;
}

export function hologramGhost(bench: Bench, parts: Part[], target: HologramTarget, plan: Plan | null, swaps: string[] = [], finish: Part[] = []): Ghost | null {
  void [bench, parts, target, plan, swaps, finish];
  return null;
}
