"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Volt } from "@/components/art/volt";
import text from "@/content/ui/onboarding.json";
import { QUESTION_IDS, startCookie, startProject, type Answers, type QuestionId } from "@/lib/game/onboarding";
import { cn } from "@/lib/utils";

// The onboarding before sign-up (issue #152), after the Duolingo onboarding: one question on each screen with a
// progress bar, then one practice wire, then the sign-up. The answers stay in this component; the start project
// goes to the lobby in a cookie. The practice wire gives no XP (Hanif's choice: no database change).

type Step = { kind: "intro" } | { kind: "question"; id: QuestionId } | { kind: "wire" } | { kind: "save" };

const PRIMARY =
  "flex min-h-13 w-full items-center justify-center rounded-full border-b-4 border-[#15a352] bg-[#22d66b] text-[17px] font-semibold text-[#04140a] transition-[transform,border] active:translate-y-0.5 active:border-b-2";
const RAIL_HOLES = 8;
const TARGET_HOLE = 2;

/** The options of the "start" question: each one opens a project. */
const START = text.questions.start.options;

export function OnboardingFlow({ available, names, initialStart }: { available: string[]; names: Record<string, string>; initialStart: string | null }) {
  const [answers, setAnswers] = useState<Answers>(initialStart ? { start: initialStart } : {});
  const [index, setIndex] = useState(0);
  const [wired, setWired] = useState(false);

  const steps: Step[] = [{ kind: "intro" }, ...QUESTION_IDS.map((id) => ({ kind: "question" as const, id })), { kind: "wire" }, { kind: "save" }];
  const step = steps[index];
  const next = () => {
    // Leaving the last question: the lobby opens this project first.
    if (step.kind === "question" && steps[index + 1]?.kind === "wire") {
      const slug = startProject(answers, START, available);
      if (slug) document.cookie = startCookie(slug);
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const back = () => setIndex((i) => Math.max(i - 1, 0));
  const progress = Math.round((index / (steps.length - 1)) * 100);
  const project = names[startProject(answers, START, available) ?? ""] ?? names[available[0]];

  return (
    <div className="flex min-h-[calc(100dvh-2.25rem)] w-full flex-col sm:min-h-[40rem]">
      {step.kind !== "save" && (
        <div className="flex items-center gap-3 pb-2">
          <button type="button" onClick={back} disabled={index === 0} aria-label={text.back} className="flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-30">
            <ArrowLeft size={22} strokeWidth={2.6} aria-hidden="true" />
          </button>
          <div role="progressbar" aria-label={text.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-4 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#22d66b] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {step.kind === "intro" && (
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <p className="rounded-[1.25rem] border border-white/15 px-5 py-4 text-center text-lg font-semibold">{text.intro.volt}</p>
            <VoltBadge className="size-36" />
          </div>
          <button type="button" onClick={next} className={PRIMARY}>
            {text.intro.button}
          </button>
        </div>
      )}

      {step.kind === "question" && (
        <Question
          id={step.id}
          value={answers[step.id]}
          available={available}
          onPick={(value) => setAnswers((a) => ({ ...a, [step.id]: value }))}
          onNext={next}
        />
      )}

      {step.kind === "wire" && <Wire wired={wired} onWire={() => setWired(true)} onNext={next} />}

      {step.kind === "save" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <VoltBadge className="size-32" pose="cheer" />
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance">{text.save.title}</h1>
          <p className="text-white/65">{text.save.body.replace("{project}", project)}</p>
          <div className="flex w-full flex-col gap-3">
            <Link href="/signup" className={PRIMARY}>
              {text.save.signUp}
            </Link>
            <Link href="/login" className="min-h-11 content-center font-medium text-white/80 underline-offset-4 hover:underline">
              {text.save.logIn}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Volt on a light circle, so the dark outline shows on the night background in both themes.
function VoltBadge({ className, pose = "idle" }: { className?: string; pose?: "idle" | "cheer" }) {
  return (
    <span className={cn("relative block shrink-0 rounded-full bg-white/90", className)}>
      <Volt pose={pose} className="absolute inset-[14%] size-[72%]" />
    </span>
  );
}

function Question({
  id,
  value,
  available,
  onPick,
  onNext,
}: {
  id: QuestionId;
  value: string | undefined;
  available: string[];
  onPick: (value: string) => void;
  onNext: () => void;
}) {
  const q = text.questions[id];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-end gap-3 pt-2 pb-4">
        <VoltBadge className="size-16" />
        <h1 className="mb-3 rounded-[18px] rounded-bl-sm border border-white/15 px-4 py-3 text-lg leading-snug font-semibold">{q.volt}</h1>
      </div>
      <div role="radiogroup" aria-label={q.volt} className="flex flex-1 flex-col gap-2.5">
        {q.options.map((option) => {
          const soon = "project" in option && !available.includes(option.project);
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={soon}
              onClick={() => onPick(option.value)}
              className={cn(
                "flex min-h-16 w-full items-center gap-3.5 rounded-[1.25rem] border px-3.5 py-2.5 text-left transition-colors",
                selected && "border-[#22d66b] border-b-4 bg-[#123d24]",
                !selected && !soon && "border-white/15 border-b-4 border-b-white/15 bg-night-2 hover:border-white/30",
                soon && "border-dashed border-white/15 bg-transparent text-white/50",
              )}
            >
              <span
                className={cn(
                  "flex h-11 min-w-11 items-center justify-center rounded-xl px-1.5 font-mono text-xs font-semibold",
                  selected ? "bg-[#22d66b] text-[#04140a]" : "bg-white/10",
                )}
                aria-hidden="true"
              >
                {option.chip}
              </span>
              <span className="flex flex-1 flex-col">
                <strong className={cn("font-semibold", selected && "text-[#22d66b]")}>{option.label}</strong>
                <span className="text-[13px] text-white/60">{option.sub}</span>
              </span>
              {soon && <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-semibold">{text.soon}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-4 border-t border-white/10 pt-4">
        <button type="button" onClick={onNext} disabled={!value} className={cn(PRIMARY, "disabled:border-0 disabled:bg-white/10 disabled:text-white/40 disabled:active:translate-y-0")}>
          {text.continue}
        </button>
      </div>
    </div>
  );
}

// One practice wire on a flat drawing of the board: 3V3 is already selected, and the learner taps the glowing hole.
function Wire({ wired, onWire, onNext }: { wired: boolean; onWire: () => void; onNext: () => void }) {
  const w = text.wire;
  return (
    <div className="flex flex-1 flex-col gap-5 pt-2">
      <div>
        <span className="font-mono text-xs font-semibold tracking-wider text-[#22d66b] uppercase">{w.eyebrow}</span>
        <h1 className="mt-1 text-2xl leading-tight font-bold">{w.title}</h1>
      </div>
      <div className="flex flex-col gap-4 rounded-[1.25rem] border border-white/10 bg-night-2 p-4">
        <div className="flex gap-1.5" aria-hidden="true">
          {w.pins.map((pin, i) => (
            <span key={pin} className={cn("flex-1 rounded-lg py-2 text-center font-mono text-xs font-semibold", i === 0 ? "bg-[#f5c518] text-[#1a1400]" : "bg-white/10 text-white/80")}>
              {pin}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#c9412f]">
            <span aria-hidden="true">+</span>
            <span className="h-0.5 flex-1 bg-[#c9412f]" />
            <span className="sr-only">{w.rail}</span>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: RAIL_HOLES }, (_, i) =>
              i === TARGET_HOLE && !wired ? (
                <button
                  key={i}
                  type="button"
                  onClick={onWire}
                  aria-label={w.hole}
                  className="aspect-square min-h-8 rounded-md bg-[#f5c518] shadow-[0_0_0_5px_rgba(245,197,24,0.45),0_0_22px_4px_rgba(245,197,24,0.6)]"
                />
              ) : (
                <span key={i} className={cn("aspect-square min-h-8 rounded-md", wired ? "bg-[#22d66b]" : "bg-[#d6dde1]")} aria-hidden="true" />
              ),
            )}
          </div>
        </div>
      </div>
      {wired ? (
        <div role="status" className="mt-auto -mx-5 -mb-5 flex flex-col gap-3 bg-[#123d24] p-5 sm:mx-0 sm:mb-0 sm:rounded-[1.25rem]">
          <strong className="text-xl font-bold text-[#22d66b]">{w.done}</strong>
          <p className="text-white/80">{w.why}</p>
          <button type="button" onClick={onNext} className={PRIMARY}>
            {text.continue}
          </button>
        </div>
      ) : (
        <p className="flex items-start gap-3 font-medium">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f5c518] font-bold text-[#1a1400]" aria-hidden="true">
            !
          </span>
          {w.hint}
        </p>
      )}
    </div>
  );
}
