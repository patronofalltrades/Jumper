import text from "@/content/ui/sketch.json";
import { CODE_WORDS, type CodeWord } from "@/lib/sketch/words";

// The "Code words" list of the sketch panel (issue #143): each word that Jumper reads, what it does, and one example.
// The same text shows when the learner points at (or taps) a word in the editor. Native details: no script.

export function CodeWords() {
  return (
    <details className="rounded-xl bg-muted px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">{text.words.title}</summary>
      <p className="mt-2 leading-snug text-muted-foreground">{text.words.text}</p>
      <dl className="mt-2 flex flex-col gap-3">
        {CODE_WORDS.map((w) => (
          <div key={w.word}>
            <dt className="font-mono font-bold">{w.word}</dt>
            <dd className="leading-snug">
              <WordText word={w} />
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** The explanation and the example of a word. */
export function WordText({ word }: { word: CodeWord }) {
  return (
    <>
      {word.text}{" "}
      <span className="text-muted-foreground">
        {text.words.example} <code className="font-mono text-foreground">{word.example}</code> {word.does}
      </span>
    </>
  );
}
