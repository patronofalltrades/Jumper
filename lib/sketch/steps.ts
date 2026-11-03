import text from "../../content/ui/sketch.json";
import { fill, FIXED, FUNCTIONS, ParseError, tokenize, UNSUPPORTED, WORDS, type ErrorCode, type Token } from "./parse.ts";

// Step by step (issue #144): the learner reads the goal of one line, types the line, and Jumper checks it.
// Hanif's decisions (Nov 3):
// - Spaces and // or /* */ comments do not matter.
// - A step whose line makes a variable (`const int ledPin = 13;`) takes the name that the learner types there, and the
//   next lines must use that name. `Names` keeps these names: the name in the content → the name of the learner.
// - A step can list more answers (`accept`), for example `int` in place of `const int`. Other lines do not pass, also
//   when they do the same thing (13 in place of ledPin).
// - A wrong line gets the reason in simple words, and the reason does not show the code of the line.

/** One line of the sketch: its code, the goal in simple words, more answers that pass, and a hint in words. */
export type LineStep = { line: string; goal: string; accept?: string[]; hint?: string };
/** The names of the variables: the name in the content → the name that the learner typed. */
export type Names = Readonly<Record<string, string>>;
export type LineResult = { ok: true; names: Names } | { ok: false; message: string };

type Why = { code: ErrorCode; values?: Record<string, string> } | { step: "wrong" | "extra" | "short" | "bad_name"; values?: Record<string, string> };

const RESERVED = new Set([...WORDS, ...UNSUPPORTED, ...Object.keys(FIXED), ...Object.keys(FUNCTIONS)]);
const quote = (t: Token) => `"${t.text}"`;

/** The tokens of a line, without the end. A sign that Jumper does not know gives the reason of the reader. */
function tokensOf(line: string): Token[] | { message: string } {
  try {
    return tokenize(line).filter((t) => t.type !== "eof");
  } catch (e) {
    if (e instanceof ParseError) return { message: e.error.reason };
    throw e;
  }
}

/** The place of the new name in a line that makes a variable: `int x` → 1, `const int x` → 2. Else -1. */
function declared(tokens: Token[]) {
  if (tokens[0]?.text === "int") return 1;
  if (tokens[0]?.text === "const" && tokens[1]?.text === "int") return 2;
  return -1;
}

/** Compares the typed tokens with the tokens of one answer. Gives the new names, or the first token that is different. */
function match(typed: Token[], want: Token[], names: Names): { names: Names } | { at: number; why?: Why } {
  const at = declared(want);
  const next: Record<string, string> = { ...names };
  for (let i = 0; i < Math.max(typed.length, want.length); i++) {
    const t = typed[i];
    const w = want[i];
    if (!t) return { at: i, why: w.text === ";" && i === want.length - 1 ? { code: "missing_semicolon" } : { step: "short" } };
    if (!w) return { at: i, why: { step: "extra", values: { found: quote(t) } } };
    if (i === at && t.type === "word") {
      if (RESERVED.has(t.text)) return { at: i, why: { step: "bad_name", values: { name: t.text } } };
      if (Object.values(names).includes(t.text)) return { at: i, why: { code: "redeclare", values: { name: t.text } } };
      next[w.text] = t.text;
      continue;
    }
    const expected = w.type === "word" ? (names[w.text] ?? w.text) : w.text;
    if (t.type !== w.type || t.text !== expected) return { at: i };
  }
  return { names: next };
}

/** The reason of a line that is different from the answer at token `at`, in the words of the reader where it can. */
function reason(typed: Token[], want: Token[], at: number, names: Names): Why {
  const t = typed[at];
  const w = want[at];
  const expected = w.type === "word" ? (names[w.text] ?? w.text) : w.text;
  if (t.type === "word" && w.type === "word" && t.text.toLowerCase() === expected.toLowerCase()) return { code: "unknown_name_case", values: { name: t.text, suggest: expected } };
  if (t.text === "=" && w.text === "==") return { code: "use_double_equals" };
  if (t.type === "word" && !RESERVED.has(t.text) && !Object.values(names).includes(t.text) && declared(want) !== at) return { code: "unknown_name", values: { name: t.text } };
  return { step: "wrong", values: { found: quote(t) } };
}

const say = (why: Why) => ("code" in why ? fill(text.errors[why.code], why.values ?? {}) : fill(text.steps[why.step], why.values ?? {}));

/** Checks one typed line against its step. Gives the names of the variables after the line, or the reason of a fail. */
export function checkLine(typed: string, step: LineStep, names: Names = {}): LineResult {
  const tokens = tokensOf(typed);
  if (!Array.isArray(tokens)) return { ok: false, message: tokens.message };
  if (tokens.length === 0) return { ok: false, message: text.steps.empty };

  for (const answer of [step.line, ...(step.accept ?? [])]) {
    const result = match(tokens, tokensOf(answer) as Token[], names);
    if ("names" in result) return { ok: true, names: result.names };
  }

  // The reason comes from the first answer: the line of the step.
  const unsupported = tokens.find((t) => t.type === "word" && UNSUPPORTED.has(t.text));
  if (unsupported) return { ok: false, message: say({ code: "unsupported_word", values: { name: unsupported.text } }) };
  const sign = tokens.find((t) => t.type === "other");
  if (sign) return { ok: false, message: say({ code: "unsupported_sign", values: { sign: sign.text } }) };
  const want = tokensOf(step.line) as Token[];
  const result = match(tokens, want, names);
  if ("names" in result) return { ok: true, names: result.names };
  return { ok: false, message: say(result.why ?? reason(tokens, want, result.at, names)) };
}

/** The sketch of the lines that the learner typed: each line has the indent of its step, and no spaces at its ends. */
export function stepSketch(steps: LineStep[], answers: string[]): string {
  return answers.map((typed, i) => `${/^\s*/.exec(steps[i].line)![0]}${typed.trim()}`).join("\n");
}
