import data from "../../content/code-terms/arduino.json";

// The code glossary (issue #143): the explanation of each word of a sketch, from content/code-terms/arduino.json.
// The editor shows the word under the pointer (laptop) or the tap (phone); the sketch panel lists all the words.
// Pure: no React and no editor code, so other code (for example Step by Step, issue #144) can read the words too.

/** One word of the code. `keys`: the words or signs in the code that show it. `does`: what `example` does. */
export type CodeWord = { keys: string[]; word: string; level: number; text: string; example: string; does: string };

/** All the code words, in the order of the content file. */
export const CODE_WORDS: readonly CodeWord[] = data.words;

const BY_KEY = new Map(CODE_WORDS.flatMap((w) => w.keys.map((k) => [k, w] as const)));

/** The explanation of a word or sign of the code, for example "digitalWrite" or "==". A comment is "//" or "/*". */
export const codeWord = (key: string): CodeWord | undefined => BY_KEY.get(key);

/** A comment, a word, a number, a two-letter sign, or one other sign. Spaces are not tokens. */
const TOKEN = /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|[A-Za-z_]\w*|\d\w*|==|!=|\S/g;

type Token = { text: string; from: number; to: number };

const tokens = (source: string): Token[] => [...source.matchAll(TOKEN)].map((m) => ({ text: m[0], from: m.index, to: m.index + m[0].length }));

/** The key of a token: a comment gives "//" or "/*", "void" gives the function after it ("setup" or "loop"). */
function keyOf(all: Token[], i: number) {
  const t = all[i].text;
  if (t.startsWith("//") || t.startsWith("/*")) return t.slice(0, 2);
  if (t === "void") return all.slice(i + 1).find((n) => !n.text.startsWith("/"))?.text ?? t;
  return t;
}

/**
 * The code word at `pos` (a character offset in `source`), with the start and end of its text, or null.
 * First the token that holds `pos`; if it has no explanation, the token that ends at `pos` (the cursor is just after it).
 */
export function codeWordAt(source: string, pos: number): { word: CodeWord; from: number; to: number } | null {
  const all = tokens(source);
  const hit = (i: number) => {
    const word = i >= 0 ? codeWord(keyOf(all, i)) : undefined;
    return word ? { word, from: all[i].from, to: all[i].to } : null;
  };
  return hit(all.findIndex((t) => t.from <= pos && pos < t.to)) ?? hit(all.findIndex((t) => t.to === pos));
}
