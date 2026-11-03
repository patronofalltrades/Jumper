"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import buildText from "@/content/ui/build.json";
import text from "@/content/ui/sketch.json";
import type { SketchStep } from "@/lib/content/schema";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { sketchStore, useSketch } from "@/lib/game/sketch-store";
import { sketchCircuit, type Circuit } from "@/lib/sketch/circuit";
import { checkGoal, type GoalResult } from "@/lib/sketch/goal";
import { fill, parseSketch, type SketchError } from "@/lib/sketch/parse";
import { createRunner } from "@/lib/sketch/run";
import { checkLine, stepSketch, type LineStep, type Names } from "@/lib/sketch/steps";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./code-editor";

// The code step of a level (issue #58). The learner writes the sketch and presses Run:
// 1. A mistake in the code marks its line and tells what is wrong. Nothing runs.
// 2. Else the goal check runs the sketch on its own clock, on the board as it is wired now, and gives a pass or the reason.
// 3. The sketch also runs on the 3D board, on the clock of the app: the LEDs light from the pins. While it runs, a tap
//    on the 3D button presses it. A sketch that does not do the goal does not cost a heart.
// Step by step (issue #144): the learner reads the goal of one line, types the line, and Jumper checks it. The editor
// shows the lines so far and is read-only. After the last line, Run works as in Free. Free keeps the lines.

type Outcome = { kind: "error"; error: SketchError } | { kind: "goal"; result: GoalResult };

const starterOf = (step: SketchStep) => step.starter.join("\n");

export function SketchPanel({ step, onClose, onDone }: { step: SketchStep; onClose: () => void; onDone: () => void }) {
  const saved = useBoard((s) => s.code);
  const code = saved ?? starterOf(step);
  const running = useSketch((s) => s.running);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [mark, setMark] = useState<{ line: number } | null>(null);
  const frame = useRef(0);
  const progress = useSketch((s) => s.steps);
  const steps = step.steps && progress?.of === step.task ? progress : null;
  const stepsDone = !!steps && steps.answers.length === step.steps!.length;

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    sketchStore.getState().stop();
  }, []);
  // Close the panel or leave the page: the sketch stops, and the LEDs go dark.
  useEffect(() => {
    return stop;
  }, [stop]);

  const showError = (error: SketchError) => {
    setOutcome({ kind: "error", error });
    setMark({ line: error.line });
  };

  const run = () => {
    stop();
    const parsed = parseSketch(code);
    if (!parsed.ok) return showError(parsed.error);

    const { bench, parts } = boardStore.getState();
    const result = checkGoal(parsed.program, sketchCircuit(bench, parts), step.goal);
    setOutcome({ kind: "goal", result });
    setMark(!result.passed && result.line ? { line: result.line } : null);
    if (result.passed) boardStore.getState().passCode();

    // The live run uses the board as it is now, also when the learner changes a wire while the sketch runs.
    let circuit: Circuit = sketchCircuit(bench, parts);
    let wiring = parts;
    const runner = createRunner(parsed.program, (pin, pins) => circuit.read(pin, pins, sketchStore.getState().pressed));
    const started = performance.now();
    sketchStore.getState().start();
    const tick = () => {
      const now = boardStore.getState();
      if (now.parts !== wiring) {
        wiring = now.parts;
        circuit = sketchCircuit(now.bench, wiring);
      }
      runner.runTo(performance.now() - started);
      sketchStore.getState().setLit(circuit.lit(runner.pins, sketchStore.getState().pressed));
      if (runner.error) {
        stop();
        return showError(runner.error);
      }
      frame.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const reset = () => {
    if (!window.confirm(text.panel.resetConfirm)) return;
    stop();
    setOutcome(null);
    setMark(null);
    if (steps) startSteps();
    else boardStore.getState().setCode(null);
  };

  /** Step by step starts at line 1, with an empty sketch. */
  const startSteps = () => {
    sketchStore.getState().setSteps({ of: step.task, answers: [], names: {} });
    boardStore.getState().setCode("");
  };
  const toSteps = () => {
    if (steps) return;
    if (saved !== null && saved.trim() !== "" && !window.confirm(text.steps.confirm)) return;
    stop();
    setOutcome(null);
    setMark(null);
    startSteps();
  };
  /** Free keeps the lines that the learner typed. */
  const toFree = () => sketchStore.getState().setSteps(null);

  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const buttons = useMemo(() => (running ? sketchCircuit(bench, parts).buttons : []), [running, bench, parts]);

  return (
    // The panel scrolls when its content is taller than the space, and the Run row stays at its bottom edge.
    <section aria-label={text.panel.title} className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto bg-card p-3 pb-0 sm:p-4 sm:pb-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl leading-tight font-extrabold tracking-tight">{text.panel.title}</h2>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{step.goal_text}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        >
          {text.panel.close}
        </button>
      </div>

      {step.steps && (
        <div role="group" aria-label={text.steps.mode} className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm font-bold">
          <ModeButton on={!steps} label={text.steps.free} onPick={toFree} />
          <ModeButton on={!!steps} label={text.steps.stepByStep} onPick={toSteps} />
        </div>
      )}

      {steps && step.steps && (
        <LineCard
          key={steps.answers.length}
          lines={step.steps}
          done={steps.answers.length}
          onPass={(typed, names) => {
            const answers = [...steps.answers, typed];
            sketchStore.getState().setSteps({ ...steps, answers, names });
            boardStore.getState().setCode(stepSketch(step.steps!, answers));
          }}
          names={steps.names}
        />
      )}

      {!steps && step.hints.length > 0 && (
        <details className="rounded-xl bg-muted px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold">{text.panel.hints}</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 leading-snug">
            {step.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="min-h-40 flex-1">
        <CodeEditor value={code} onChange={(next) => boardStore.getState().setCode(next)} errorAt={mark} label={text.panel.editor} readOnly={!!steps} />
      </div>

      <Result outcome={outcome} onDone={onDone} />

      {running && (
        <div className="flex flex-col gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-semibold" role="status">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-primary" />
            {buttons.length ? text.panel.runningButton : text.panel.running}
          </span>
          {buttons.map((id) => (
            <HoldButton key={id} id={id} />
          ))}
        </div>
      )}

      <div className="sticky bottom-0 -mx-3 mt-auto flex items-center justify-end gap-2 border-t border-border bg-card px-3 py-3 sm:-mx-4 sm:px-4">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl border border-b-4 border-border bg-card px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        >
          {text.panel.reset}
        </button>
        <button
          type="button"
          onClick={running ? stop : run}
          disabled={!!steps && !stepsDone && !running}
          className={cn(
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-11 rounded-xl border-b-4 px-6 text-sm font-extrabold tracking-wide uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2",
            running ? "border-border bg-muted text-foreground" : "border-primary-deep bg-primary text-primary-foreground",
          )}
        >
          {running ? text.panel.stop : text.panel.run}
        </button>
      </div>
    </section>
  );
}

function ModeButton({ on, label, onPick }: { on: boolean; label: string; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className="min-h-11 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-card aria-pressed:shadow-sm"
    >
      {label}
    </button>
  );
}

/** Step by step: the goal of the next line, a field to type it, and the reason of a wrong line. */
function LineCard({ lines, done, names, onPass }: { lines: LineStep[]; done: number; names: Names; onPass: (typed: string, names: Names) => void }) {
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  // A new line opens: the field gets the focus, so the learner can type at once. The first line waits for a tap.
  useEffect(() => {
    if (done > 0) field.current?.focus();
  }, [done]);

  if (done === lines.length)
    return (
      <p role="status" className="rounded-xl border border-l-4 border-primary bg-card px-3 py-2 text-sm leading-snug font-semibold">
        {text.steps.done}
      </p>
    );
  const line = lines[done];
  const submit = () => {
    const result = checkLine(typed, line, names);
    if (result.ok) onPass(typed, result.names);
    else setWrong(result.message);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm"
    >
      {done > 0 && !wrong && (
        <p role="status" className="font-semibold text-primary">
          {text.steps.correct}
        </p>
      )}
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{fill(text.steps.count, { n: done + 1, total: lines.length })}</p>
      <p className="text-base leading-snug font-bold">{line.goal}</p>
      <div className="flex gap-2">
        <input
          ref={field}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setWrong(null);
          }}
          aria-label={text.steps.input}
          aria-invalid={!!wrong}
          placeholder={text.steps.input}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-xl border-b-4 border-primary-deep bg-primary px-4 text-sm font-extrabold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        >
          {text.steps.check}
        </button>
      </div>
      {wrong && (
        <p role="alert" className="rounded-lg border-l-4 border-destructive bg-muted px-3 py-2 leading-snug font-semibold">
          {wrong}
        </p>
      )}
      {line.hint && (
        <details className="rounded-lg bg-muted px-3 py-2">
          <summary className="cursor-pointer font-semibold">{text.steps.hint}</summary>
          <p className="mt-1 leading-snug">{line.hint}</p>
        </details>
      )}
    </form>
  );
}

/** The result of the last Run: the mistake in the code, the reason of a goal that fails, or a pass. */
function Result({ outcome, onDone }: { outcome: Outcome | null; onDone: () => void }) {
  if (!outcome) return null;
  if (outcome.kind === "error")
    return (
      <p role="alert" className="rounded-xl border border-l-4 border-destructive bg-card px-3 py-2 text-sm leading-snug font-semibold">
        {outcome.error.message}
      </p>
    );
  const { result } = outcome;
  if (!result.passed)
    return (
      <div role="alert" className="flex flex-col gap-1 rounded-xl border border-l-4 border-destructive bg-card px-3 py-2 text-sm leading-snug">
        <p className="font-extrabold">{text.panel.failTitle}</p>
        <p className="font-semibold">{result.message}</p>
        <p className="text-muted-foreground">{text.panel.noHeart}</p>
      </div>
    );
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-l-4 border-primary bg-card px-3 py-2 text-sm leading-snug">
      <div className="flex-1">
        <p className="font-extrabold text-primary">{result.message}</p>
        <p className="text-muted-foreground">{text.panel.passNext}</p>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="min-h-11 shrink-0 rounded-xl border-b-4 border-primary-deep bg-primary px-4 text-sm font-extrabold tracking-wide text-primary-foreground uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
      >
        {buildText.play.check.button}
      </button>
    </div>
  );
}

/** A button to hold down, in place of the 3D button: for a keyboard, or a screen reader. */
function HoldButton({ id }: { id: string }) {
  const down = useSketch((s) => s.pressed.has(id));
  const press = (on: boolean) => sketchStore.getState().press(id, on);
  return (
    <button
      type="button"
      aria-pressed={down}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(true);
      }}
      onPointerUp={() => press(false)}
      onPointerCancel={() => press(false)}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && press(true)}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && press(false)}
      onBlur={() => press(false)}
      className="min-h-11 touch-none rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-bold select-none outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:translate-y-0.5 aria-pressed:border-b-2 aria-pressed:border-primary-deep aria-pressed:bg-primary aria-pressed:text-primary-foreground"
    >
      {text.panel.press}
    </button>
  );
}
