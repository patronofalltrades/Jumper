"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import text from "@/content/ui/build.json";
import { spokenText } from "@/lib/game/read-aloud";
import { speak } from "./alive-audio";
import { cn } from "@/lib/utils";

// Read the task aloud (issue #135). The voice is the browser's (alive-audio.ts). The choice "Read steps aloud" is kept in
// the browser (localStorage). Each browser call is wrapped in try/catch: a private window can refuse the storage.

const KEY = "jumper.readSteps";
const t = text.aloud;

/** The choice of the learner, and the line that the voice says now (null when it is quiet). */
const reader = createStore<{ line: string | null; choice: boolean }>(() => ({ line: null, choice: false }));

/** A new line or a stop makes the number go up, so a late "end" of an older line does nothing. */
let turn = 0;
let stopVoice: (() => void) | null = null;

/** Stops the voice. Called when the learner leaves the level, opens the Check card or starts "Build it for me". */
export function stopReading() {
  turn += 1;
  stopVoice?.();
  stopVoice = null;
  if (reader.getState().line !== null) reader.setState({ line: null });
}

/** Says a line now, and stops the line before it. The build page uses it when a new task opens. */
export function readAloud(line: string) {
  stopReading();
  const id = turn;
  reader.setState({ line });
  stopVoice = speak(
    spokenText(line),
    () => {},
    () => {
      if (id === turn) reader.setState({ line: null });
    },
  );
  if (!stopVoice) reader.setState({ line: null });
}

/** The button of a line: a second press on the line that is said now stops it. */
function toggleReading(line: string) {
  if (reader.getState().line === line) stopReading();
  else readAloud(line);
}

const subscribeNone = () => () => {};
/** False on the server and in a browser without Speech Synthesis: no button and no switch then. */
export function useSpeechSupported() {
  return useSyncExternalStore(
    subscribeNone,
    () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined",
    () => false,
  );
}

/** The choice "Read steps aloud". The saved choice is read after the first paint, so the server and the page match. */
export function useReadSteps(): [boolean, (on: boolean) => void] {
  const on = useStore(reader, (s) => s.choice);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // A private window can refuse the storage: the choice is off.
    }
    if (saved !== null) reader.setState({ choice: saved === "on" });
  }, []);
  const set = (value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "on" : "off");
    } catch {
      // The choice still holds for this page.
    }
    reader.setState({ choice: value });
  };
  return [on, set];
}

/** The speaker button of one task line. A second press stops it. It is not shown in a browser without a voice. */
export function SpeakButton({ line, className }: { line: string; className?: string }) {
  const supported = useSpeechSupported();
  const reading = useStore(reader, (s) => s.line === line);
  if (!supported) return null;
  const label = reading ? t.stop : t.read;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={reading}
      title={label}
      onClick={() => toggleReading(line)}
      className={cn(
        "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-b-4 border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2",
        reading && "border-primary-deep bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {reading ? <path d="M16.5 9.5 21 14.5M21 9.5l-4.5 5" /> : <path d="M16 8.5a5 5 0 0 1 0 7M19 5.5a9 9 0 0 1 0 13" />}
      </svg>
    </button>
  );
}

/** The switch "Read steps aloud". Shows only in a browser with a voice. */
export function ReadStepsSwitch() {
  const supported = useSpeechSupported();
  const [on, setOn] = useReadSteps();
  if (!supported) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{t.switch}</span>
      <span aria-hidden="true" className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors", on ? "border-primary bg-primary" : "border-border bg-muted")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-card shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
      </span>
    </button>
  );
}
