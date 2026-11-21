"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { completeAttempt, logEvents, saveAttempt, saveReflection, type JourneyResult } from "@/app/actions/journey";
import afBoards from "@/content/boards/arduino-foundations.json";
import afLed from "@/content/lessons/af-led.json";
import text from "@/content/ui/challenge.json";
import { challengeReducer, startState, type Attempt, type Event, type Rubric, type State } from "@/lib/challenge/machine";
import { runChallenge } from "@/lib/challenge/run";
import type { Bench } from "@/lib/circuit/bench";
import { applyChange } from "@/lib/circuit/change";
import { endpointHole } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { lessonSchema, type Behavior, type Challenge, type Lesson, type SketchStep } from "@/lib/content/schema";
import { boardStore } from "@/lib/game/board-store";
import { sketchStore } from "@/lib/game/sketch-store";
import type { LearningEvent } from "@/lib/journey/records";
import { sketchCircuit } from "@/lib/sketch/circuit";
import { fill, parseSketch } from "@/lib/sketch/parse";
import { createRunner } from "@/lib/sketch/run";
import { cn } from "@/lib/utils";

// Predict, Build, Explain (issue #203, TRD addendum 6.4). The button shows on a level that has a lesson with challenges.
// A challenge is a sandbox: the reference circuit and the sketch of the level go on the bench, with the task engine off
// (boardStore.startChallenge). The learner's own board and sketch come back when the panel closes. No hearts and no XP
// change (decision D6). The records go to learning_attempts and learning_events; a save that fails never stops the learner.

/** The lessons that have challenges, with the finished boards of their project. A new lesson adds one line. */
const LESSONS: { lesson: Lesson; boards: Record<string, unknown> }[] = [{ lesson: lessonSchema.parse(afLed), boards: afBoards.levels }];

const BUTTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-b-4 px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 disabled:pointer-events-none disabled:opacity-50";
const PLAIN = `${BUTTON} border-border bg-card`;
const PRIMARY = `${BUTTON} border-primary-deep bg-primary text-primary-foreground`;

type Props = { user: string; project: string; position: number; sketch: SketchStep | null };

/** The Challenge button of build mode, and its panel. It shows nothing on a level that has no challenges. */
export function ChallengeButton({ user, project, position, sketch }: Props) {
  const found = useMemo(() => LESSONS.find((l) => l.lesson.project === project && l.lesson.level === position && l.lesson.challenges?.length), [project, position]);
  // The finished board of the lesson: the parts of its baseline levels. One array, so the sandbox starts one time.
  const reference = useMemo(() => (found ? found.lesson.baseline.levels.flatMap((level) => (found.boards[level] ?? []) as Part[]) : []), [found]);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  if (!found || !sketch) return null;
  return (
    <>
      <button ref={button} type="button" aria-expanded={open} onClick={() => setOpen(true)} disabled={open} className={`${PLAIN} shrink-0`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V15h8v-1.5A6 6 0 0 0 12 3Z" />
        </svg>
        <span className="max-sm:sr-only">{text.button}</span>
      </button>
      {/* The header makes its own layer, so the panel goes to the body: it is above the sheet of the level on a phone. */}
      {open &&
        createPortal(
        <Panel
          user={user}
          lesson={found.lesson}
          reference={reference}
          sketch={sketch}
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        />,
          document.body,
        )}
    </>
  );
}

const uuid = () => crypto.randomUUID();

/** The LEDs on the 3D board do what the sketch says, as the Run of the code step does. `onFrame` gets the id of each frame, to stop it. */
function startLive(source: string, bench: Bench, parts: Part[], onFrame: (id: number) => void) {
  const parsed = parseSketch(source);
  if (!parsed.ok) return;
  const circuit = sketchCircuit(bench, parts);
  const runner = createRunner(parsed.program, (pin, pins) => circuit.read(pin, pins, sketchStore.getState().pressed));
  const started = performance.now();
  sketchStore.getState().start();
  const tick = () => {
    runner.runTo(performance.now() - started);
    if (runner.error) return sketchStore.getState().stop();
    sketchStore.getState().setLit(circuit.lit(runner.pins, sketchStore.getState().pressed));
    onFrame(requestAnimationFrame(tick));
  };
  tick();
}

/** The first attempt of each item, in this browser: a reload then still makes a retry, with its first attempt. */
function readFirsts(key: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return value && typeof value === "object" ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function Panel({ user, lesson, reference, sketch, onClose }: { user: string; lesson: Lesson; reference: Part[]; sketch: SketchStep; onClose: () => void }) {
  const challenges = lesson.challenges!;
  const code = useMemo(() => sketch.solution.join("\n"), [sketch]);
  const firstsKey = `jumper:challenge-firsts:${user}:${lesson.id}@${lesson.version}`;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [state, setState] = useState<State>(() => startState("", readFirsts(firstsKey)));
  const [unsaved, setUnsaved] = useState(false);
  const frame = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  const stopLive = () => {
    cancelAnimationFrame(frame.current);
    sketchStore.getState().stop();
  };

  // The sandbox starts when the panel opens, and the learner's own level comes back when it closes.
  useEffect(() => {
    boardStore.getState().startChallenge(reference, code);
    return () => {
      cancelAnimationFrame(frame.current);
      sketchStore.getState().stop();
      boardStore.getState().endChallenge();
    };
  }, [reference, code]);

  // A new step: the screen reader and the keyboard start at its title.
  useEffect(() => {
    heading.current?.focus();
  }, [state.phase, state.item, challenge]);

  /** A record that does not save shows one note. The challenge continues. */
  const record = (save: Promise<JourneyResult>) => {
    save.then((result) => result.error && setUnsaved(true)).catch(() => setUnsaved(true));
  };
  const log = (name: LearningEvent["name"], attempt: Attempt | null, data: LearningEvent["data"], runId: string | null = null) =>
    record(logEvents([{ id: uuid(), name, lessonId: lesson.id, lessonVersion: lesson.version, attemptId: attempt?.id ?? null, runId, data }]));

  const send = (event: Event) => {
    const next = challengeReducer(state, event);
    setState(next);
    if (next.firsts !== state.firsts) {
      try {
        localStorage.setItem(firstsKey, JSON.stringify(next.firsts));
      } catch {
        // Private mode: the next visit makes a first attempt again, and the account keeps the older one.
      }
    }
    return next;
  };

  const rubric: Rubric | null = challenge && (state.variation ? challenge.variation : challenge);
  const change = challenge && lesson.changes.find((c) => c.id === challenge.change);
  /** The board that the challenge starts with: the reference, or the layout of the variation. */
  const startBoard = challenge && state.variation ? (challenge.variation.parts as Part[]) : reference;
  const toStart = () => {
    stopLive();
    boardStore.getState().startChallenge(startBoard, code);
  };

  const pick = (next: Challenge | null, variation = false) => {
    stopLive();
    setChallenge(next);
    if (!next) return boardStore.getState().startChallenge(reference, code);
    send({ type: "open", item: variation ? next.variation.id : next.id, variation });
    boardStore.getState().startChallenge(variation ? (next.variation.parts as Part[]) : reference, code);
  };

  const predict = (prediction: Behavior | null) => {
    const { attempt } = send({ type: "predict", id: uuid(), prediction });
    if (!attempt) return;
    record(saveAttempt({ id: attempt.id, lessonId: lesson.id, lessonVersion: lesson.version, itemId: attempt.item, kind: attempt.kind, firstAttemptId: attempt.firstId, scored: attempt.scored, prediction }));
    log("prediction_submitted", attempt, { option: prediction ?? "skip", scored: attempt.scored });
  };

  const run = () => {
    if (!challenge || !rubric || state.phase !== "change") return;
    stopLive();
    // The board and the sketch at this moment. The result belongs to them (F3-AC4), also if the learner changes the board later.
    const { bench, parts, code: now } = boardStore.getState();
    const source = now ?? code;
    const expected = state.variation ? (challenge.variation.parts as Part[]) : applyChange(reference, code, change?.ops ?? []).parts;
    const result = runChallenge({ bench, parts, code: source, expected, terminals: lesson.map.terminals, led: sketch.goal.led, behavior: rubric.predict.expected });
    const runId = uuid();
    const next = send({ type: "run", result: result.ok ? { ...result, runId } : result });
    log("run_completed", next.attempt, result.ok ? { status: "ok", observed: result.observed } : { status: result.problem.kind }, runId);
    if (!result.ok) return;

    startLive(source, bench, parts, (id) => (frame.current = id));
  };

  const explain = (option: string) => {
    if (!rubric) return;
    const { attempt } = send({ type: "explain", rubric, option });
    if (!attempt || attempt.status !== "complete") return;
    record(completeAttempt({ id: attempt.id, status: "complete", behaviorCorrect: attempt.behaviorCorrect, explanation: option, explanationCorrect: attempt.explanationCorrect, hintsUsed: attempt.hints, runId: attempt.runId }));
    log("explanation_submitted", attempt, { option, correct: attempt.explanationCorrect === true });
  };

  /** Glows the net of a connection of the map on the board. */
  const glow = (connection: string | undefined) => {
    const c = lesson.map.connections.find((x) => x.id === connection);
    if (!c) return;
    const { bench, parts } = boardStore.getState();
    const hole = endpointHole(bench, parts, c.a) ?? endpointHole(bench, parts, c.b);
    if (hole) boardStore.getState().setHover(hole);
  };
  const hint = () => {
    if (!challenge || !state.attempt || state.attempt.hints >= challenge.hints.length) return;
    const level = state.attempt.hints + 1;
    const next = send({ type: "hint" });
    log("hint_used", next.attempt, { level });
    glow(challenge.hints[level - 1].highlight);
  };

  const { attempt, phase } = state;
  const hints = challenge && !state.variation && attempt && phase !== "predict" ? challenge.hints : [];
  const shown = hints.slice(0, attempt?.hints ?? 0);

  return (
    <section
      aria-label={text.title}
      data-challenge-panel
      className="fixed inset-x-2 z-50 flex flex-col max-sm:bottom-40 max-sm:max-h-[27%] sm:top-20 gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 text-sm shadow-panel sm:inset-x-auto sm:left-3 sm:max-h-[calc(100dvh-11rem)] sm:w-[340px]"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {text.title}
            {challenge && ` · ${text.steps[phase]}`}
          </p>
          <h2 ref={heading} tabIndex={-1} className="text-lg leading-tight font-extrabold tracking-tight outline-none">
            {challenge ? challenge.title : text.pick}
            {challenge && state.variation && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-xs font-bold">{text.variationTag}</span>}
          </h2>
        </div>
        <button type="button" onClick={onClose} title={text.closeNote} className={`${PLAIN} shrink-0`}>
          {text.close}
        </button>
      </div>

      {!challenge && (
        <>
          <p className="leading-snug text-muted-foreground">{text.intro}</p>
          <ul className="flex flex-col gap-2">
            {challenges.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pick(c)} className={`${PLAIN} w-full justify-start text-left`}>
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {challenge && rubric && phase === "predict" && (
        <>
          <p className="rounded-xl bg-muted px-3 py-2 leading-snug">
            <span className="font-bold">{state.variation ? "" : `${text.predict.change} `}</span>
            {state.variation ? challenge.variation.text : change?.text}
          </p>
          <Choice
            key={state.item + state.done.length}
            legend={state.variation ? text.predict.variationQuestion : text.predict.question}
            name="prediction"
            options={rubric.predict.options.map((id) => ({ id, label: text.behaviors[id] }))}
            submit={text.predict.submit}
            onSubmit={(id) => predict(id as Behavior)}
          />
          <button type="button" onClick={() => predict(null)} className={PLAIN}>
            {text.predict.skip}
          </button>
          <p className="text-xs leading-snug text-muted-foreground">{text.predict.skipNote}</p>
          {/* The Run button shows, but it is off until the prediction is saved (F2-AC1). */}
          <button type="button" disabled aria-describedby="challenge-run-locked" className={PRIMARY}>
            {text.build.run}
          </button>
          <p id="challenge-run-locked" className="text-xs leading-snug text-muted-foreground">
            {text.build.locked}
          </p>
        </>
      )}

      {challenge && phase === "change" && attempt && (
        <>
          <p className="rounded-xl bg-muted px-3 py-2 leading-snug">{state.variation ? challenge.variation.text : change?.text}</p>
          <p className="leading-snug">
            {attempt.prediction ? (
              <>
                {text.build.yours} <strong>{text.behaviors[attempt.prediction]}</strong>
              </>
            ) : (
              text.build.skipped
            )}
          </p>
          <p className="leading-snug">{state.variation ? text.build.doVariation : text.build.do}</p>
          {state.problem && (
            <div role="alert" className="rounded-xl border border-destructive bg-card px-3 py-2 leading-snug">
              <p className="font-bold">{text.build.problemTitle}</p>
              <p>{state.problem.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{text.build.noScore}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={run} className={PRIMARY}>
              {text.build.run}
            </button>
            <button type="button" onClick={toStart} className={PLAIN}>
              {text.build.reset}
            </button>
          </div>
        </>
      )}

      {challenge && rubric && phase === "explain" && attempt && (
        <>
          <Compare attempt={attempt} />
          <Choice
            key={attempt.id}
            legend={text.compare.why}
            name="explanation"
            options={rubric.explain.options.map((o) => ({ id: o.id, label: o.text }))}
            submit={text.compare.submit}
            onSubmit={explain}
          />
        </>
      )}

      {challenge && rubric && phase === "feedback" && attempt && (
        <>
          <Compare attempt={attempt} />
          <ul className="flex flex-col gap-1 font-bold">
            <Grade ok={attempt.behaviorCorrect} label={attempt.behaviorCorrect === null ? text.feedback.behaviorNone : attempt.behaviorCorrect ? text.feedback.behaviorRight : text.feedback.behaviorWrong} />
            <Grade ok={attempt.explanationCorrect} label={attempt.explanationCorrect ? text.feedback.explainRight : text.feedback.explainWrong} />
          </ul>
          {attempt.behaviorCorrect && !attempt.explanationCorrect && <p className="leading-snug font-semibold">{text.feedback.review}</p>}
          <p className="rounded-xl bg-muted px-3 py-2 leading-snug">{rubric.explain.options.find((o) => o.id === attempt.explanation)?.feedback}</p>
          <Reflection key={attempt.id} onSave={(reflection) => record(saveReflection({ id: attempt.id, reflection }))} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                send({ type: "retry" });
                toStart();
              }}
              className={PLAIN}
            >
              {text.feedback.retry}
            </button>
            {!state.variation && (
              <button type="button" onClick={() => pick(challenge, true)} className={PRIMARY}>
                {text.feedback.variation}
              </button>
            )}
            <button type="button" onClick={() => pick(null)} className={PLAIN}>
              {text.feedback.next}
            </button>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            {text.feedback.first} {fill(text.attempts, { n: state.done.filter((a) => a.item === state.item).length })}
          </p>
        </>
      )}

      {hints.length > 0 && phase !== "feedback" && (
        <div className="flex flex-col gap-2">
          {shown.map((h, i) => (
            <div key={h.text} className="rounded-xl border border-border px-3 py-2 leading-snug">
              <p className="font-bold">{fill(text.hints.title, { n: i + 1 })}</p>
              <p>{h.text}</p>
              {h.highlight && (
                <button type="button" onClick={() => glow(h.highlight)} className="mt-1 font-semibold underline underline-offset-2">
                  {text.hints.glow}
                </button>
              )}
            </div>
          ))}
          {shown.length < hints.length && (
            <button type="button" onClick={hint} className={PLAIN}>
              {fill(text.hints.button, { n: shown.length + 1, total: hints.length })}
            </button>
          )}
        </div>
      )}

      {unsaved && (
        <p role="status" className="rounded-xl bg-muted px-3 py-2 text-xs leading-snug font-semibold">
          {text.notSaved}
        </p>
      )}
    </section>
  );
}

/** A group of radio buttons with one submit button. The submit is off until the learner chooses. */
function Choice({ legend, name, options, submit, onSubmit }: { legend: string; name: string; options: { id: string; label: string }[]; submit: string; onSubmit: (id: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (picked) onSubmit(picked);
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 leading-snug font-bold">{legend}</legend>
        {options.map((o) => (
          <label key={o.id} className={cn("flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 leading-snug", picked === o.id ? "border-primary bg-muted font-semibold" : "border-border")}>
            <input type="radio" name={name} value={o.id} checked={picked === o.id} onChange={() => setPicked(o.id)} className="mt-1 accent-primary" />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={!picked} className={PRIMARY}>
        {submit}
      </button>
    </form>
  );
}

/** The prediction and what the LED did, side by side (F2-AC2). */
function Compare({ attempt }: { attempt: Attempt }) {
  const match = attempt.prediction === null ? text.compare.unscored : attempt.prediction === attempt.observed ? text.compare.match : text.compare.noMatch;
  return (
    <div role="status" className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border px-3 py-2">
          <dt className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{text.compare.predicted}</dt>
          <dd className="leading-snug font-bold">{attempt.prediction ? text.behaviors[attempt.prediction] : text.compare.none}</dd>
        </div>
        <div className="rounded-xl border border-primary px-3 py-2">
          <dt className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{text.compare.happened}</dt>
          <dd className="leading-snug font-bold">{attempt.observed && text.behaviors[attempt.observed]}</dd>
        </div>
      </dl>
      <p className="leading-snug">{match}</p>
    </div>
  );
}

/** One grade: a mark and its text, so the result does not depend on color. */
function Grade({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cn("inline-flex size-5 items-center justify-center rounded-full text-xs", ok ? "bg-primary text-primary-foreground" : "bg-muted")}>
        {ok === null ? "–" : ok ? "✓" : "!"}
      </span>
      {label}
    </li>
  );
}

/** The optional written reflection. It goes to the attempt record only, never to an event. */
function Reflection({ onSave }: { onSave: (text: string) => void }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSave(value.trim());
        setSaved(true);
      }}
    >
      <label className="flex flex-col gap-1 leading-snug font-semibold">
        {text.feedback.reflection}
        <textarea
          value={value}
          maxLength={2000}
          rows={2}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={!value.trim() || saved} className={PLAIN}>
          {text.feedback.reflectionSave}
        </button>
        {saved && (
          <span role="status" className="text-xs font-semibold">
            {text.feedback.reflectionSaved}
          </span>
        )}
      </div>
    </form>
  );
}
