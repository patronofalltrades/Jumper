"use client";

import { useRef, useState, type ReactNode } from "react";
import { completeAttempt, logEvents, saveAttempt } from "@/app/actions/journey";
import ui from "@/content/ui/journey.json";
import type { LevelLesson } from "@/lib/journey/lesson-of";
import { answerQuestion, answerRecord, lastFeedback, noAnswers, type Answers, type Question } from "@/lib/journey/questions";
import { cn } from "@/lib/utils";

// A question of Compare views (issue #202): the first-check question after the fault clip (F1-R5), or the transfer
// question on the photo of a different layout (F1-R6). The record keeps the first answer, the hints and the final answer
// as separate values. A save that fails shows a short message and never stops the learner.

const text = ui.compare.question;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The first attempt of this question in this browser, so that a later attempt is a retry and the first stays. */
const firstKey = (found: LevelLesson, question: Question) => `jumper:journey:${found.lesson.id}:${found.lesson.version}:${question.id}`;
function readFirst(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeFirst(key: string, id: string) {
  try {
    localStorage.setItem(key, id);
  } catch {
    // Private mode or a full storage: the question still works.
  }
}

export function QuestionCard({ found, question, children }: { found: LevelLesson; question: Question; children?: ReactNode }) {
  const [state, setState] = useState<Answers>(noAnswers);
  const [saveFailed, setSaveFailed] = useState(false);
  const attempt = useRef<string | null>(null);
  const lesson = { lessonId: found.lesson.id, lessonVersion: found.lesson.version };

  const event = (name: "hint_used" | "transfer_completed", data: Record<string, number | boolean>) =>
    void logEvents([{ id: crypto.randomUUID(), name, ...lesson, attemptId: attempt.current, data }]).catch(() => {});
  const failed = (result: { error?: string }) => {
    if (result.error) setSaveFailed(true);
  };

  const answer = (option: string) => {
    const next = answerQuestion(question, state, { type: "answer", option });
    if (next === state) return;
    setState(next);
    const done = () => {
      if (!next.done || !attempt.current) return;
      const r = answerRecord(next);
      void completeAttempt({ id: attempt.current, status: "complete", behaviorCorrect: r.firstCorrect, explanation: r.final, explanationCorrect: r.finalCorrect, hintsUsed: r.hintsUsed })
        .then(failed)
        .catch(() => setSaveFailed(true));
      if (question.kind === "transfer") event("transfer_completed", { first_correct: !!r.firstCorrect, final_correct: r.finalCorrect, hints_used: r.hintsUsed });
    };
    if (state.first !== null) return done();
    // The first answer: the record starts before the feedback shows.
    const key = firstKey(found, question);
    const first = readFirst(key);
    const id = crypto.randomUUID();
    attempt.current = id;
    if (!first) writeFirst(key, id);
    void saveAttempt({ id, ...lesson, itemId: question.id, kind: first ? "retry" : "first", firstAttemptId: first, prediction: option })
      .then((result) => (failed(result), done()))
      .catch(() => setSaveFailed(true));
  };

  const hint = () => {
    const next = answerQuestion(question, state, { type: "hint" });
    if (next === state) return;
    setState(next);
    event("hint_used", { level: next.hints });
  };

  const feedback = lastFeedback(question, state);
  const firstOption = question.options.find((o) => o.id === state.first);
  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <h3 className="text-sm font-bold">{question.kind === "transfer" ? text.transfer : text.firstCheck}</h3>
      {children}
      <p className="text-sm">{question.prompt}</p>
      <ul className="grid gap-1.5">
        {question.options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              disabled={state.done}
              aria-pressed={state.last === o.id}
              onClick={() => answer(o.id)}
              className={cn(
                "min-h-11 w-full rounded-xl border px-3 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
                state.last === o.id ? "border-2 border-probe bg-probe/10 font-bold" : "border-border bg-card",
              )}
            >
              {o.text}
            </button>
          </li>
        ))}
      </ul>
      {feedback && (
        <p role="status" className={cn("rounded-xl border px-3 py-2 text-sm", state.done ? "border-primary" : "border-dashed border-destructive")}>
          <span className="font-bold">{state.done ? text.correct : text.wrong}</span> {feedback} {!state.done && text.tryAgain}
        </p>
      )}
      {state.done && firstOption && state.first !== state.last && <p className="text-xs text-muted-foreground">{fill(text.firstAnswer, { text: firstOption.text })}</p>}
      {question.hints.slice(0, state.hints).map((h, i) => (
        <p key={h} className="rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="font-bold">{fill(text.hintN, { n: i + 1 })}:</span> {h}
        </p>
      ))}
      {!state.done && state.hints < question.hints.length && (
        <button
          type="button"
          onClick={hint}
          className="min-h-11 justify-self-start rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        >
          {text.hint}
        </button>
      )}
      {saveFailed && (
        <p role="status" className="text-xs text-muted-foreground">
          {text.saveFailed}
        </p>
      )}
    </div>
  );
}
