import { describe, expect, it } from "vitest";
import { codeTermsSchema } from "@/lib/content/schema";
import { loadTerms } from "@/lib/content/terms";
import { KNOWN_WORDS, parseSketch, SYMBOLS } from "@/lib/sketch/parse";
import { CODE_WORDS, codeWord, codeWordAt } from "@/lib/sketch/words";
import codeTerms from "@/content/code-terms/arduino.json";

// Issue #143: the code glossary. Each word that the sketch reader accepts has an explanation in
// content/code-terms/arduino.json, and the editor finds the word under the pointer or the tap.

/** The word at the first "|" of the sketch. The "|" is not part of the sketch. */
const at = (marked: string) => {
  const pos = marked.indexOf("|");
  const hit = codeWordAt(marked.replace("|", ""), pos);
  return hit && { word: hit.word.word, text: marked.replace("|", "").slice(hit.from, hit.to) };
};

describe("the code words", () => {
  it("has a valid content file", () => {
    expect(codeTermsSchema.safeParse(codeTerms).success).toBe(true);
  });

  it("explains each word that lib/sketch/parse.ts accepts (void comes with setup and loop)", () => {
    for (const w of KNOWN_WORDS.filter((w) => w !== "void")) expect(codeWord(w), w).toBeDefined();
    for (const s of SYMBOLS.filter((s) => !["(", ")", ","].includes(s))) expect(codeWord(s), s).toBeDefined();
    expect(codeWord("//")).toBeDefined();
  });

  it("explains only words that the reader knows, each one time", () => {
    const keys = CODE_WORDS.flatMap((w) => w.keys);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect([...KNOWN_WORDS, ...SYMBOLS, "//", "/*"], k).toContain(k);
  });
});

describe("the examples", () => {
  it("are valid code for Jumper, so a learner can copy them (a part of a line is checked inside an if)", () => {
    for (const w of CODE_WORDS) {
      const ex = w.example.replace(/\/\/.*$/, "").trim();
      const line = ex.startsWith("}") ? `if (state == LOW) { ${ex}` : ex.endsWith(";") || ex.endsWith("}") ? ex : `if (${ex}) { }`;
      const src = line.startsWith("void")
        ? `${line.startsWith("void setup") ? "" : "void setup() { }\n"}${line}\n${line.startsWith("void loop") ? "" : "void loop() { delay(1); }"}`
        : `int state = 0;\nvoid setup() { }\nvoid loop() {\n${line}\ndelay(1);\n}`;
      const result = parseSketch(src);
      expect(result.ok ? "" : result.error.message, `${w.word}: ${w.example}`).toBe("");
    }
  });
});

describe("the word under the cursor", () => {
  it("finds a function name at its start, in its middle and just after it", () => {
    expect(at("  |digitalWrite(13, HIGH);")).toEqual({ word: "digitalWrite(pin, value)", text: "digitalWrite" });
    expect(at("  digital|Write(13, HIGH);")?.text).toBe("digitalWrite");
    expect(at("  digitalWrite|(13, HIGH);")?.text).toBe("digitalWrite");
  });

  it("finds a fixed name and a sign", () => {
    expect(at("digitalWrite(13, HI|GH);")?.word).toBe("HIGH");
    expect(at("delay(500)|;")?.word).toBe("; (semicolon)");
    expect(at("if (s =|= LOW)")).toEqual({ word: "== (is equal to)", text: "==" });
    expect(at("int s |= LOW;")?.word).toBe("= (put in)");
    expect(at("void loop() |{")?.word).toBe("{ } (braces)");
  });

  it("gives void the explanation of the function after it", () => {
    expect(at("v|oid setup() {")).toEqual({ word: "void setup()", text: "void" });
    expect(at("void /* x */ |loop() {")?.word).toBe("void loop()");
  });

  it("gives const and int each their own explanation", () => {
    expect(at("con|st int ledPin = 13;")?.word).toBe("const int");
    expect(at("const i|nt ledPin = 13;")?.word).toBe("int");
  });

  it("gives a comment the comment explanation, not the words inside it", () => {
    expect(at("delay(5); // wait for dela|y")).toEqual({ word: "// (comment)", text: "// wait for delay" });
    expect(at("/* two\nli|nes */")?.word).toBe("// (comment)");
  });

  it("finds nothing on a space, a number, a variable or a word that Jumper does not know", () => {
    expect(at("delay(500);  |  ")).toBeNull();
    expect(at("delay(5|00);")).toBeNull();
    expect(at("pinMode(led|Pin, OUTPUT);")).toBeNull();
    expect(at("digitalwr|ite(13, HIGH);")).toBeNull();
    expect(at("|")).toBeNull();
  });

  it("gives the same word at the start of a very long sketch, and does not read past it", () => {
    const long = `void setup() {\n${"digitalWrite(13, HIGH);\n".repeat(50_000)}}`;
    expect(codeWordAt(long, 1)?.word.word).toBe("void setup()");
    expect(codeWordAt(long, long.length - 1)?.word.word).toBe("{ } (braces)");
  });
});

describe("the dashboard", () => {
  it("adds each code word to the terms of its level of Arduino Foundations", () => {
    const terms = loadTerms().filter((t) => t.project === "arduino-foundations");
    const write = terms.find((t) => t.term === "digitalWrite(pin, value)");
    expect(write?.level).toBe(2);
    expect(write?.definition).toContain("digitalWrite(13, HIGH);");
    expect(terms.filter((t) => CODE_WORDS.some((w) => w.word === t.term))).toHaveLength(CODE_WORDS.length);
  });
});
