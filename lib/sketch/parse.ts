import text from "../../content/ui/sketch.json";

// The reader of a sketch (issue #58): a small part of Arduino C, enough for the Arduino Foundations levels.
// - void setup() { … } and void loop() { … }
// - int and const int variables, with a value or with no value (0)
// - pinMode, digitalWrite, digitalRead and delay
// - if / else, == and !=, ! (not), HIGH, LOW, INPUT, OUTPUT, INPUT_PULLUP and LED_BUILTIN
// - // and /* */ comments
// An error gives the line and a message in simple words, from content/ui/sketch.json.

export type ErrorCode = keyof typeof text.errors;

/** A mistake in a sketch: the line (1, 2, 3…), a code for the tests, and the message for the learner. */
export type SketchError = { line: number; code: ErrorCode; message: string };

export type Expr =
  /** A number. `name`: the fixed name that gave it, for example "HIGH". */
  | { kind: "num"; value: number; line: number; name?: string }
  | { kind: "var"; slot: number; line: number }
  | { kind: "read"; pin: Expr; line: number }
  | { kind: "not"; expr: Expr; line: number }
  | { kind: "cmp"; op: "==" | "!="; a: Expr; b: Expr; line: number };

export type Stmt =
  | { kind: "set"; slot: number; value: Expr; line: number }
  | { kind: "mode"; pin: Expr; mode: Expr; line: number }
  | { kind: "write"; pin: Expr; value: Expr; line: number }
  | { kind: "read"; pin: Expr; line: number }
  | { kind: "delay"; ms: Expr; line: number }
  | { kind: "if"; test: Expr; then: Stmt[]; else: Stmt[]; line: number };

/** A sketch that the runner can run. Each variable has a slot; `globals` give the global variables their first values. */
export type Program = {
  globals: Stmt[];
  setup: { body: Stmt[]; line: number };
  loop: { body: Stmt[]; line: number };
  /** The number of variable slots. */
  slots: number;
};

export type ParseResult = { ok: true; program: Program } | { ok: false; error: SketchError };

/** The pin modes, with the values that the Arduino uses. */
export const MODES = { INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2 } as const;

/** The fixed names of the Arduino, and their values. */
const FIXED: Record<string, number> = { HIGH: 1, LOW: 0, ...MODES, LED_BUILTIN: 13 };

/** The functions that Jumper runs, and the number of values that each one needs. */
const FUNCTIONS = { pinMode: 2, digitalWrite: 2, digitalRead: 1, delay: 1 } as const;
type FunctionName = keyof typeof FUNCTIONS;

/** Words of Arduino C that Jumper does not run yet. They get a clear message, not "unknown name". */
const UNSUPPORTED = new Set([
  "for", "while", "do", "switch", "case", "return", "break", "continue", "goto",
  "float", "double", "bool", "boolean", "byte", "char", "long", "short", "unsigned", "String", "word", "static", "volatile",
  "Serial", "analogRead", "analogWrite", "millis", "micros", "delayMicroseconds", "tone", "noTone", "map", "random", "attachInterrupt",
  "true", "false",
]);

/** Fills a template from content/ui/sketch.json. */
export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));

/** The error for a line, with its message in simple words. */
export function sketchError(line: number, code: ErrorCode, values: Record<string, string | number> = {}): SketchError {
  return { line, code, message: fill(text.line, { line, message: fill(text.errors[code], values) }) };
}

class ParseError extends Error {
  constructor(readonly error: SketchError) {
    super(error.message);
  }
}

const fail = (line: number, code: ErrorCode, values?: Record<string, string | number>): never => {
  throw new ParseError(sketchError(line, code, values));
};

/** "other": a sign of C that Jumper does not use yet. The reader stops at it with a message, if no earlier mistake stops it first. */
type Token = { type: "num" | "word" | "sym" | "other" | "eof"; text: string; line: number };

const SYMBOLS = ["==", "!=", "(", ")", "{", "}", ";", ",", "=", "!"];
/** Signs of C that Jumper does not use yet: the longest first, so that "<=" is one sign. */
const OTHER_SIGNS = ["&&", "||", "<=", ">=", "++", "--", "+=", "-=", "*=", "/=", "<", ">", "+", "-", "*", "/", "%", "&", "|", "^", "~", "?", ":", "[", "]", "."];

/** Splits the sketch into numbers, words and signs, each with its line. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "\n") {
      line++;
      i++;
    } else if (/\s/.test(c)) i++;
    else if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") i++;
    } else if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      for (; i < stop; i++) if (source[i] === "\n") line++;
    } else if (/\d/.test(c)) {
      const m = /^\d+[A-Za-z_]*/.exec(source.slice(i))![0];
      if (!/^\d+$/.test(m)) fail(line, "bad_value", { found: m });
      tokens.push({ type: "num", text: m, line });
      i += m.length;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*/.exec(source.slice(i))![0];
      tokens.push({ type: "word", text: m, line });
      i += m.length;
    } else if (c === "#") {
      fail(line, "unsupported_word", { name: /^#\s*\w*/.exec(source.slice(i))![0].replace(/\s/g, "") });
    } else if (c === '"' || c === "'") {
      fail(line, "unsupported_text");
    } else {
      const sym = SYMBOLS.find((s) => source.startsWith(s, i));
      if (sym) {
        tokens.push({ type: "sym", text: sym, line });
        i += sym.length;
      } else {
        const other = OTHER_SIGNS.find((s) => source.startsWith(s, i)) ?? fail(line, "unknown_sign", { sign: c });
        tokens.push({ type: "other", text: other, line });
        i += other.length;
      }
    }
  }
  tokens.push({ type: "eof", text: "", line });
  return tokens;
}

/** A known name with other big and small letters: "digitalwrite" → "digitalWrite". */
function sameLetters(name: string) {
  const known = [...Object.keys(FUNCTIONS), ...Object.keys(FIXED), "setup", "loop", "void", "int", "const", "if", "else"];
  return known.find((k) => k !== name && k.toLowerCase() === name.toLowerCase());
}

type Variable = { slot: number; constant: boolean };

/** Reads a sketch. Gives the program, or the first mistake with its line. */
export function parseSketch(source: string): ParseResult {
  try {
    return { ok: true, program: new Parser(tokenize(source)).program() };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: e.error };
    throw e;
  }
}

class Parser {
  private i = 0;
  private slots = 0;
  private scopes: Map<string, Variable>[] = [new Map()];

  constructor(private tokens: Token[]) {}

  private get next() {
    return this.tokens[this.i];
  }
  private get prev() {
    return this.tokens[Math.max(0, this.i - 1)];
  }
  private take() {
    return this.tokens[this.i++];
  }
  private is(text: string) {
    return this.next.type !== "eof" && this.next.text === text;
  }
  /** Stops at a sign that Jumper does not use yet, for example + or <. */
  private noOtherSign() {
    if (this.next.type === "other") fail(this.next.line, "unsupported_sign", { sign: this.next.text });
  }
  private found(t: Token = this.next) {
    return t.type === "eof" ? "the end of the sketch" : `"${t.text}"`;
  }
  private expect(sym: keyof typeof text.want) {
    if (this.is(sym)) return this.take();
    this.noOtherSign();
    // A missing ) or { is at the end of the line before, so the error names that line.
    return fail(sym === "(" ? this.next.line : this.prev.line, "expected", { want: text.want[sym] });
  }
  private semicolon() {
    if (this.is(";")) return this.take();
    this.noOtherSign();
    return fail(this.prev.line, "missing_semicolon");
  }

  program(): Program {
    const globals: Stmt[] = [];
    const functions = new Map<string, { body: Stmt[]; line: number }>();
    while (this.next.type !== "eof") {
      const t = this.next;
      if (t.text === "int" || t.text === "const") globals.push(this.declaration());
      else if (t.text === "void") {
        this.take();
        const name = this.next;
        if (name.type !== "word") fail(name.line, "expected", { want: text.want.function });
        if (name.text !== "setup" && name.text !== "loop") fail(name.line, "own_function");
        this.take();
        if (functions.has(name.text)) fail(name.line, "duplicate_function", { name: name.text });
        this.expect("(");
        if (this.is("void")) this.take();
        this.expect(")");
        functions.set(name.text, { body: this.block(), line: name.line });
      } else if (t.text === "}") fail(t.line, "extra_brace");
      else if (t.type === "word" && UNSUPPORTED.has(t.text)) fail(t.line, "unsupported_word", { name: t.text });
      else if (t.type === "word" && this.tokens[this.i + 1]?.text === "(" && this.tokens[this.i + 2]?.text === ")" && this.tokens[this.i + 3]?.text === "{")
        fail(t.line, "own_function");
      else fail(t.line, "outside_function");
    }
    const last = this.next.line;
    const setup = functions.get("setup") ?? fail(1, "no_setup");
    const loop = functions.get("loop") ?? fail(last, "no_loop");
    return { globals, setup, loop, slots: this.slots };
  }

  /** `{ … }`: a new scope for the variables made inside it. */
  private block(): Stmt[] {
    const open = this.expect("{");
    this.scopes.push(new Map());
    const body: Stmt[] = [];
    while (!this.is("}")) {
      if (this.next.type === "eof") fail(open.line, "missing_close_brace");
      body.push(...this.statement());
    }
    this.take();
    this.scopes.pop();
    return body;
  }

  /** One statement, or none (an empty `;`). A block gives its statements. */
  private statement(): Stmt[] {
    const t = this.next;
    if (t.text === "{") return [{ kind: "if", test: { kind: "num", value: 1, line: t.line }, then: this.block(), else: [], line: t.line }];
    if (t.text === ";") {
      this.take();
      return [];
    }
    if (t.text === "}") fail(t.line, "extra_brace");
    this.noOtherSign();
    if (t.text === "int" || t.text === "const") return [this.declaration()];
    if (t.text === "if") return [this.ifStatement()];
    if (t.text === "else") fail(t.line, "bad_statement", { found: '"else"' });
    if (t.text === "void") fail(t.line, "own_function");
    if (t.type !== "word") fail(t.line, "bad_statement", { found: this.found() });
    if (UNSUPPORTED.has(t.text)) fail(t.line, "unsupported_word", { name: t.text });

    this.take();
    if (t.text in FUNCTIONS) {
      this.noOtherSign();
      const stmt = this.call(t, t.text as FunctionName);
      this.semicolon();
      return [stmt];
    }
    this.noOtherSign();
    if (this.is("(")) {
      if (t.text === "setup" || t.text === "loop") fail(t.line, "own_function");
      const suggest = sameLetters(t.text);
      if (suggest) fail(t.line, "unknown_name_case", { name: t.text, suggest });
      fail(t.line, "unknown_function", { name: t.text });
    }
    if (this.is("=")) {
      const variable = this.variable(t);
      if (variable.constant) fail(t.line, "const_change", { name: t.text });
      this.take();
      const value = this.expression();
      this.semicolon();
      return [{ kind: "set", slot: variable.slot, value, line: t.line }];
    }
    this.variable(t);
    return fail(t.line, "bad_statement", { found: `"${t.text}"` });
  }

  /** `int x = 3;`, `int x;` or `const int x = 3;` */
  private declaration(): Stmt {
    const first = this.take();
    const constant = first.text === "const";
    if (constant) {
      if (!this.is("int")) fail(this.next.line, this.next.type === "word" && UNSUPPORTED.has(this.next.text) ? "unsupported_word" : "expected", { name: this.next.text, want: '"int"' });
      this.take();
    }
    const name = this.next;
    if (name.type !== "word") fail(name.line, "expected", { want: text.want.name });
    this.take();
    if (name.text in FIXED || name.text in FUNCTIONS) fail(name.line, "fixed_name", { name: name.text });
    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name.text)) fail(name.line, "redeclare", { name: name.text });
    let value: Expr = { kind: "num", value: 0, line: name.line };
    if (this.is("=")) {
      this.take();
      value = this.expression();
    } else if (constant) fail(name.line, "const_needs_value", { name: name.text });
    this.semicolon();
    const slot = this.slots++;
    scope.set(name.text, { slot, constant });
    return { kind: "set", slot, value, line: name.line };
  }

  private ifStatement(): Stmt {
    const t = this.take();
    this.expect("(");
    const test = this.expression();
    if (this.is("=")) fail(this.next.line, "use_double_equals");
    this.expect(")");
    const then = this.branch();
    let otherwise: Stmt[] = [];
    if (this.is("else")) {
      this.take();
      otherwise = this.branch();
    }
    return { kind: "if", test, then, else: otherwise, line: t.line };
  }

  /** The part after `if (…)` or `else`: a block, or one statement. */
  private branch(): Stmt[] {
    if (this.is("{")) return this.block();
    this.scopes.push(new Map());
    const stmts = this.statement();
    this.scopes.pop();
    return stmts;
  }

  /** A call of one of the 4 functions. Its name is already taken. */
  private call(name: Token, fn: FunctionName): Stmt {
    this.expect("(");
    const args: Expr[] = [];
    if (!this.is(")")) {
      args.push(this.expression());
      while (this.is(",")) {
        this.take();
        args.push(this.expression());
      }
    }
    if (!this.is(")")) {
      if (this.is("=")) fail(this.next.line, "use_double_equals");
      this.noOtherSign();
      // A value with no comma before it, for example pinMode(13 OUTPUT).
      if (this.next.type !== "sym" || this.is("(")) fail(name.line, "arg_count", { name: fn, what: text.functions[fn] });
      this.expect(")");
    }
    this.take();
    if (args.length !== FUNCTIONS[fn]) fail(name.line, "arg_count", { name: fn, what: text.functions[fn] });
    const line = name.line;
    switch (fn) {
      case "pinMode": {
        const mode = args[1];
        // A number or a fixed name that is not a mode, for example pinMode(13, HIGH). A variable is checked when it runs.
        if (mode.kind === "num" && (mode.name ? !(mode.name in MODES) : !Object.values(MODES).includes(mode.value as 0 | 1 | 2))) fail(line, "bad_mode");
        return { kind: "mode", pin: args[0], mode, line };
      }
      case "digitalWrite":
        return { kind: "write", pin: args[0], value: args[1], line };
      case "digitalRead":
        return { kind: "read", pin: args[0], line };
      case "delay":
        return { kind: "delay", ms: args[0], line };
    }
  }

  /** The variable of a name, from the nearest scope. A fixed name or an unknown name is an error. */
  private variable(t: Token): Variable {
    for (let s = this.scopes.length - 1; s >= 0; s--) {
      const v = this.scopes[s].get(t.text);
      if (v) return v;
    }
    if (t.text in FIXED) return fail(t.line, this.is("=") ? "fixed_name" : "bad_statement", { name: t.text, found: `"${t.text}"` });
    const suggest = sameLetters(t.text);
    if (suggest) return fail(t.line, "unknown_name_case", { name: t.text, suggest });
    return fail(t.line, "unknown_name", { name: t.text });
  }

  /** a == b, a != b, or one value. */
  private expression(): Expr {
    let a = this.unary();
    while (this.is("==") || this.is("!=")) {
      const op = this.take();
      a = { kind: "cmp", op: op.text as "==" | "!=", a, b: this.unary(), line: op.line };
    }
    return a;
  }

  private unary(): Expr {
    if (this.is("!")) {
      const t = this.take();
      return { kind: "not", expr: this.unary(), line: t.line };
    }
    return this.value();
  }

  private value(): Expr {
    this.noOtherSign();
    const t = this.next;
    if (t.type === "num") {
      this.take();
      return { kind: "num", value: Number(t.text), line: t.line };
    }
    if (t.text === "(") {
      this.take();
      const e = this.expression();
      this.expect(")");
      return e;
    }
    if (t.type !== "word") return fail(t.type === "eof" ? this.prev.line : t.line, "bad_value", { found: this.found() });
    if (UNSUPPORTED.has(t.text)) fail(t.line, "unsupported_word", { name: t.text });
    this.take();
    if (t.text === "digitalRead") {
      const stmt = this.call(t, "digitalRead") as Extract<Stmt, { kind: "read" }>;
      return { kind: "read", pin: stmt.pin, line: t.line };
    }
    if (t.text in FUNCTIONS) fail(t.line, "not_a_value", { name: t.text });
    if (t.text in FIXED && !this.scopes.some((s) => s.has(t.text))) return { kind: "num", value: FIXED[t.text], line: t.line, name: t.text };
    if (this.is("(")) {
      const suggest = sameLetters(t.text);
      if (suggest) fail(t.line, "unknown_name_case", { name: t.text, suggest });
      fail(t.line, "unknown_function", { name: t.text });
    }
    this.noOtherSign();
    return { kind: "var", slot: this.variable(t).slot, line: t.line };
  }
}
