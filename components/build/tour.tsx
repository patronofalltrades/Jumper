"use client";

import { useEffect, useState } from "react";
import { Volt } from "@/components/art/volt";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/tour.json";
import { cardSide, markTourSeen, nextIndex, shouldShowTour, tourPlan, tourSeen, TOUR_STEPS, type TourStep, type TourStorage } from "@/lib/game/tour";
import { cn } from "@/lib/utils";

// The first-visit tour of build mode (issue #123): a card that points at one control at a time, with Next and Skip.
// It shows once in each browser (lib/game/tour.ts). It waits while a pop-up, the intro clip or the Check card is open.
// The card goes under the control, or above it, so it does not cover the control (cardSide).

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The card's height, to decide its side. A card that is taller than this may cover the control. */
const CARD_HEIGHT = 220;

/** The place of a control on the screen, in pixels from the top left of the window. */
type Box = { top: number; bottom: number; left: number; width: number; height: number };

/** The browser storage, or null when the browser blocks it. */
export function browserStorage(): TourStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const controlOf = (step: TourStep) => document.querySelector<HTMLElement>(`[data-tour="${step}"]`);

/** The steps whose control is on the page now. */
const presentSteps = () => new Set(TOUR_STEPS.filter((step) => controlOf(step)));

/**
 * `busy`: a pop-up, the level intro clip or the Check card is open. The tour waits until it is not busy.
 * It renders nothing until the flag is read in the browser, so the server and the first render match.
 */
export function Tour({ busy }: { busy: boolean }) {
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the flag is in the browser only
    setSeen(tourSeen(browserStorage()));
  }, []);
  const show = shouldShowTour(seen, busy);

  // The steps of this visit, and the step on the screen now. The plan is made when the tour first shows.
  const [plan, setPlan] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  // The tour is over: keep the flag, and hide the card.
  const finish = () => {
    markTourSeen(browserStorage());
    setSeen(true);
  };
  const next = () => {
    if (!plan) return;
    const following = nextIndex(index, plan);
    if (following === null) finish();
    else setIndex(following);
  };

  useEffect(() => {
    if (!show || plan) return;
    const steps = tourPlan(presentSteps());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the plan is made once, when the tour first shows
    if (steps.length) setPlan(steps);
    else finish();
  }, [show, plan]);

  // Point at the control of this step, and follow it when the window changes size.
  useEffect(() => {
    if (!show || !plan) return;
    const step = plan[index];
    const place = () => {
      const control = controlOf(step);
      // A control that is not on the page (the Check row under a pop-up) is left out: the tour goes on.
      if (!control) return next();
      const { top, bottom, left, width, height } = control.getBoundingClientRect();
      setBox({ top, bottom, left, width, height });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- next() reads the plan and the index that this effect already has
  }, [show, plan, index]);

  if (!show || !plan) return null;
  const step = plan[index];
  const copy = text.steps[step];
  const last = index === plan.length - 1;
  const side = box ? cardSide(box, window.innerHeight, CARD_HEIGHT) : "bottom";

  return (
    <>
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 rounded-xl ring-4 ring-probe"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <section
        role="dialog"
        aria-label={text.label}
        aria-describedby="tour-text"
        className={cn(
          "fixed inset-x-3 z-50 flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-panel sm:left-1/2 sm:w-96 sm:-translate-x-1/2",
          side === "top" ? "top-3" : "bottom-4",
        )}
      >
        <div className="flex items-center gap-3">
          <Volt pose="idle" className="h-12 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{fill(text.step, { n: index + 1, total: plan.length })}</p>
            <h2 className="text-base leading-snug font-extrabold">{copy.title}</h2>
          </div>
        </div>
        <p id="tour-text" className="text-sm leading-relaxed">
          {copy.text}
        </p>
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={finish}>
            {text.skip}
          </Button>
          <Button type="button" className="min-h-11" onClick={next}>
            {last ? text.done : text.next}
          </Button>
        </div>
      </section>
    </>
  );
}
