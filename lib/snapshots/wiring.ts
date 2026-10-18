import { z } from "zod";
import type { Part } from "@/lib/circuit/parts";
import { partSchema } from "@/lib/content/schema";

// The board in a snapshot (snapshots.wiring): the same parts as on the bench, so the snapshot page opens the same board.
// `version` lets a later format read old snapshots.
export const wiringSchema = z.object({ version: z.literal(1), parts: z.array(partSchema) });
export type Wiring = z.infer<typeof wiringSchema>;

/** The board, as the JSON to save. */
export function toWiring(parts: Part[]): Wiring {
  return { version: 1, parts: parts.filter((p) => p.type !== "wire") };
}

/** The board from saved JSON, or null if the JSON is not a board. */
export function readWiring(json: unknown): Part[] | null {
  const parsed = wiringSchema.safeParse(json);
  return parsed.success ? (parsed.data.parts as Part[]) : null;
}

/** How many wires, and how many other parts, are on the board. */
export function countWiring(parts: Part[]): { parts: number; wires: number } {
  const wires = parts.filter((p) => p.type === "wire").length;
  return { parts: parts.length - wires, wires };
}
