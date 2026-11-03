// The words that the voice says for a task (issue #135). Pure: no browser, no React. The screen shows the text as it is written.

// A plus sign is read as "plus" only when it stands alone (spaces, brackets or a comma around it): "red + line", "(+)",
// "+ into +,". A "+" inside a word, such as "C++", is not changed.
const LOOSE_PLUS = /(?<![^\s(])\+(?![^\s).,;:])/g;

/** The text of a task as the voice says it. Gives the same words as the screen, with the symbols spelled out. */
export function spokenText(line: string): string {
  return line
    .replace(/Ω/g, "ohm")
    .replace(/→/g, "to")
    .replace(/−/g, "minus")
    .replace(LOOSE_PLUS, "plus")
    .replace(/\b3V3\b/g, "3.3 volts")
    .replace(/\bGND\b/g, "ground");
}
