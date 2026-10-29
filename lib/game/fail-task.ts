import { needsAck, placeConnections, type Connection, type PlanTask, type Target } from "./engine";

// The task of a failed level Check (issue #91). A require connection that is missing gives the task that makes it: a
// wire task with the same two ends, or a place task whose leads are that connection. A forbid rule gives no task.

/** The two sides of a button or a resistor are the same. Their pins "1" and "2" match each other. */
const sideless = (end: string) => end.replace(/\.[12]$/, ".*");
const key = (c: Connection) => [sideless(c.a), sideless(c.b)].sort().join("|");

const connectionsOf = (target: Target): Connection[] => (target.kind === "wire" ? [{ a: target.a, b: target.b }] : needsAck(target) ? [] : placeConnections(target));

/** The index of the task that makes the failed connection, or null when no task of this level makes it. */
export function taskOfFailure(tasks: PlanTask[], failed: { code: string; connection: Connection }): number | null {
  if (failed.code !== "missing_ground" && failed.code !== "wrong_pin") return null;
  const want = key(failed.connection);
  const index = tasks.findIndex((task) => connectionsOf(task.target).some((c) => key(c) === want));
  return index === -1 ? null : index;
}
