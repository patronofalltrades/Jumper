"use client";

import { cpp } from "@codemirror/lang-cpp";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, hoverTooltip, showTooltip, type DecorationSet, type Tooltip } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import text from "@/content/ui/sketch.json";
import { codeWordAt, type CodeWord } from "@/lib/sketch/words";

// The sketch editor (issue #58): CodeMirror 6 with C++ colors, line numbers and a red mark on the line of a mistake.
// Issue #143: the pointer on a word (laptop) or a tap on it (phone) shows what the word does.
// Hanif approved CodeMirror on Oct 23 (house rule 8). The colors come from the --code-* tokens, so they follow the theme.

const markLine = StateEffect.define<number | null>();
const lineMark = Decoration.line({ class: "cm-sketch-error" });

/** The red line of a mistake. It goes away when the learner changes the code. */
const errorLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marks, tr) {
    for (const e of tr.effects) {
      if (!e.is(markLine)) continue;
      if (e.value === null || e.value > tr.state.doc.lines) return Decoration.none;
      return Decoration.set([lineMark.range(tr.state.doc.line(e.value).from)]);
    }
    return tr.docChanged ? Decoration.none : marks;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const colors = HighlightStyle.define([
  { tag: [tags.keyword, tags.typeName, tags.modifier, tags.controlKeyword], color: "var(--code-keyword)", fontWeight: "600" },
  { tag: [tags.function(tags.variableName)], color: "var(--code-function)" },
  { tag: [tags.number], color: "var(--code-number)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [tags.constant(tags.variableName), tags.bool], color: "var(--code-constant)", fontWeight: "600" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "var(--panel)", color: "var(--ink)" },
  "&.cm-focused": { outline: "2px solid var(--probe)", outlineOffset: "-2px" },
  ".cm-scroller": { fontFamily: "var(--font-plex-mono), ui-monospace, monospace", lineHeight: "1.55" },
  ".cm-content": { caretColor: "var(--ink)", padding: "8px 0" },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  ".cm-gutters": { backgroundColor: "var(--panel-2)", color: "var(--muted)", borderRight: "1px solid var(--line)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--probe) 8%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--probe) 16%, transparent)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--probe) 30%, transparent) !important" },
  ".cm-sketch-error": { backgroundColor: "var(--code-error)", boxShadow: "inset 3px 0 0 var(--danger)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--pcb) 22%, transparent)", outline: "none" },
});

/** The Arduino names: they get the constant color, as in the Arduino IDE. */
const ARDUINO = /\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN)\b/g;
const arduinoMark = Decoration.mark({ class: "cm-arduino-name" });
const arduinoNames = StateField.define<DecorationSet>({
  create: (state) => findNames(state.doc.toString()),
  update: (marks, tr) => (tr.docChanged ? findNames(tr.state.doc.toString()) : marks),
  provide: (f) => EditorView.decorations.from(f),
});
function findNames(doc: string) {
  return Decoration.set([...doc.matchAll(ARDUINO)].map((m) => arduinoMark.range(m.index, m.index + m[0].length)));
}
const arduinoTheme = EditorView.theme({ ".cm-arduino-name, .cm-arduino-name *": { color: "var(--code-constant) !important", fontWeight: "600" } });

/** The card of a code word (issue #143): its name, what it does, and one example. */
function wordCard(word: CodeWord) {
  const dom = document.createElement("div");
  dom.className = "cm-word-card";
  const add = (tag: string, value: string, className?: string) => {
    const el = dom.appendChild(document.createElement(tag));
    el.textContent = value;
    if (className) el.className = className;
    return el;
  };
  add("strong", word.word);
  add("p", word.text);
  const example = add("p", `${text.words.example} `, "cm-word-example");
  example.appendChild(document.createElement("code")).textContent = word.example;
  example.append(` ${word.does}`);
  return { dom };
}

/** The tooltip of the code word at `pos`, or null. */
function wordTooltip(doc: string, pos: number): Tooltip | null {
  const hit = codeWordAt(doc, pos);
  return hit && { pos: hit.from, end: hit.to, above: true, create: () => wordCard(hit.word) };
}

/** Laptop: the pointer stays on a word, and its card shows. */
const wordHover = hoverTooltip((view, pos) => wordTooltip(view.state.doc.toString(), pos), { hoverTime: 350 });

/** Phone: a tap on a word shows its card. A tap on another place, or a change to the code, closes it. */
const tapWord = StateEffect.define<number | null>();
const wordTap = StateField.define<Tooltip | null>({
  create: () => null,
  update(tip, tr) {
    for (const e of tr.effects) if (e.is(tapWord)) return e.value === null ? null : wordTooltip(tr.state.doc.toString(), e.value);
    return tr.docChanged ? null : tip;
  },
  provide: (f) => showTooltip.from(f),
});
const tapHandler = EditorView.domEventHandlers({
  pointerup(e, view) {
    if (e.pointerType === "mouse") return;
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    const hit = pos === null ? null : codeWordAt(view.state.doc.toString(), pos);
    // A tap after the end of a line gives the position at the end of the line: show a card only when the tap is on the word.
    const start = hit && view.coordsAtPos(hit.from, 1);
    const end = hit && view.coordsAtPos(hit.to, -1);
    const onWord = start && end && (start.top !== end.top || (e.clientX >= start.left - 4 && e.clientX <= end.right + 4));
    view.dispatch({ effects: tapWord.of(onWord ? pos : null) });
  },
});

const wordTheme = EditorView.theme({
  ".cm-tooltip:has(.cm-word-card)": { border: "none", backgroundColor: "transparent" },
  ".cm-word-card": {
    boxSizing: "border-box",
    maxWidth: "min(320px, calc(100vw - 32px))",
    padding: "8px 10px",
    border: "1px solid var(--line)",
    borderRadius: "12px",
    backgroundColor: "var(--panel)",
    boxShadow: "0 6px 20px rgb(0 0 0 / 0.18)",
    fontFamily: "var(--font-display), system-ui, sans-serif",
    fontSize: "13px",
    lineHeight: "1.4",
    color: "var(--ink)",
  },
  ".cm-word-card strong": { display: "block", fontFamily: "var(--font-plex-mono), ui-monospace, monospace", marginBottom: "2px" },
  ".cm-word-card p": { margin: "0" },
  ".cm-word-example": { marginTop: "4px !important", color: "var(--muted)" },
  ".cm-word-example code": { fontFamily: "var(--font-plex-mono), ui-monospace, monospace", color: "var(--ink)" },
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** The line to mark red, or null. A new object marks the line again, after the learner changed the code. */
  errorAt: { line: number } | null;
  label: string;
};

export function CodeEditor({ value, onChange, errorAt, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          cpp(),
          syntaxHighlighting(colors),
          theme,
          arduinoNames,
          arduinoTheme,
          errorLine,
          wordHover,
          wordTap,
          tapHandler,
          wordTheme,
          EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) change.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor is made one time. A new value from outside (Start again) goes in with the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const line = errorAt?.line ?? null;
    editor.dispatch({ effects: markLine.of(line) });
    if (line !== null && line <= editor.state.doc.lines) {
      editor.dispatch({ effects: EditorView.scrollIntoView(editor.state.doc.line(line).from, { y: "center" }) });
    }
  }, [errorAt]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden rounded-xl border border-border" />;
}
