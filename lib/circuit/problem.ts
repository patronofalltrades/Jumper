import { type CheckResult, type Connection } from "./check.ts";
import type { Bench } from "./bench.ts";
import { buildNets, connected, endpointHole } from "./nets.ts";
import type { Part } from "./parts.ts";

// The problem of a failed Check (issue #90): the connection that the Check named. It stays on the board until the
// connection is right, so the learner can see where the problem is after the fail card closes.

/** `forbidden`: a forbid rule (a short circuit) that must stay open. Else a require rule that must be made. */
export type Problem = { connection: Connection; forbidden: boolean };

/** The reasons of a require rule that is not there. Every other reason is a forbid rule. */
const MISSING = new Set(["missing_ground", "wrong_pin"]);

/** The problem that a failed Check named. */
export function problemOf(result: Extract<CheckResult, { passed: false }>): Problem {
  return { connection: result.connection, forbidden: !MISSING.has(result.code) };
}

/** The holes of the two ends of the problem connection on this board. An end that the bench does not have is left out. */
export function problemHoles(bench: Bench, parts: Part[], problem: Problem): string[] {
  const { a, b } = problem.connection;
  return [endpointHole(bench, parts, a), endpointHole(bench, parts, b)].filter((h): h is string => h !== null);
}

/**
 * True when the problem connection is right on the board as it is now: a require connection is on the nets, or a
 * forbidden connection is not. The parts keep their sides as they are, so the marks clear when the learner turns
 * the part the right way.
 */
export function isProblemFixed(bench: Bench, parts: Part[], problem: Problem): boolean {
  const { a, b } = problem.connection;
  const on = connected(bench, parts, buildNets(bench, parts), a, b);
  return problem.forbidden ? !on : on;
}
