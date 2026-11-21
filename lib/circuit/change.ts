import type { ChangeOp } from "../content/schema.ts";
import type { Part } from "./parts.ts";

// A change of a lesson (content/lessons/, TRD addendum section 4) on a board and its sketch: move a part, add a wire,
// remove a part, or change the code. It returns new values and does not change its inputs.

export function applyChange(parts: readonly Part[], code: string, ops: readonly ChangeOp[]): { parts: Part[]; code: string } {
  let board = [...parts];
  let sketch = code;
  for (const op of ops) {
    if (op.op === "remove") board = board.filter((p) => p.id !== op.part);
    else if (op.op === "wire") board.push({ id: op.id, type: "wire", a: op.a, b: op.b });
    else if (op.op === "code") sketch = sketch.split(op.from).join(op.to);
    else board = board.map((p) => (p.id === op.part && "a" in p ? { ...p, a: op.a, b: op.b } : p));
  }
  return { parts: board, code: sketch };
}
