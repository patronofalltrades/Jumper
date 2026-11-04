"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Volt } from "@/components/art/volt";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import text from "@/content/ui/tour.json";
import { markTourSeen, nextIndex, shouldShowTour, tourPlan, tourSeen, type TourStorage } from "@/lib/game/tour";
import { cn } from "@/lib/utils";

// A first-visit tour (lib/game/tour.ts): a card that points at one control at a time, with Next and Skip. The lobby
// (components/lobby-tour.tsx) and build mode (issue #123) use it, each with its own steps, text and flag.
// <Tour> wraps the page. Each control is wrapped in <TourStep id="…">, which gives the tour a React ref to the control
// (no DOM query). The card is a shadcn Popover with a Card, anchored to the control: Radix places it, flips it when
// there is no room, and closes it with Escape. A click outside does not close it.

/** The browser storage, or null when the browser blocks it. */
export function browserStorage(): TourStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The text of one tour: the label of the card, and the title and text of each step. */
export type TourCopy = { label: string; steps: Record<string, { title: string; text: string }> };

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

type TourState = {
  /** The step on the screen now, or null when the tour does not show. */
  active: string | null;
  copy: TourCopy;
  /** A <TourStep> tells the tour that its control is on the page. It returns the function that removes it. */
  register: (id: string) => () => void;
  /** The place of the active step in the plan, and the number of steps. */
  index: number;
  total: number;
  next: () => void;
  finish: () => void;
};

const TourContext = createContext<TourState | null>(null);

/** True on a screen of 640 px or wider (the Tailwind `sm` size). False on the server. */
const WIDE = "(min-width: 640px)";
function useWide() {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener("change", change);
      return () => query.removeEventListener("change", change);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/**
 * `steps`: the steps of the tour, in order. `storageKey`: the browser key of its "seen" flag. `copy`: its text.
 * `busy`: a pop-up, a clip or the Check card is open. The tour waits (the card hides) until it is not busy.
 */
export function Tour({
  steps,
  storageKey,
  copy,
  busy = false,
  children,
}: {
  steps: readonly string[];
  storageKey: string;
  copy: TourCopy;
  busy?: boolean;
  children: ReactNode;
}) {
  // Seen until the flag is read in the browser, so the server and the first render match.
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the flag is in the browser only
    setSeen(tourSeen(browserStorage(), storageKey));
  }, [storageKey]);
  const show = shouldShowTour(seen, busy);

  // The controls on the page. The ref changes at once, in the effect of each <TourStep>, so a plan made in the same
  // commit (the Clear and Check row shows when a pop-up closes) sees every control. The state renders the tour again.
  const presentRef = useRef(new Set<string>());
  const [present, setPresent] = useState<ReadonlySet<string>>(new Set());
  const register = useCallback((id: string) => {
    presentRef.current.add(id);
    setPresent(new Set(presentRef.current));
    return () => {
      presentRef.current.delete(id);
      setPresent(new Set(presentRef.current));
    };
  }, []);

  // The plan is made once, when the tour first shows: the steps whose control is on the page, in order.
  // A control that is not on the page at the first show (the connection list before a failed Check) has no step.
  const [plan, setPlan] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!show || plan || !presentRef.current.size) return;
    setPlan(tourPlan(presentRef.current, steps));
  }, [show, plan, present, steps]);

  const finish = useCallback(() => {
    markTourSeen(browserStorage(), storageKey);
    setSeen(true);
  }, [storageKey]);
  const next = useCallback(() => {
    const following = plan ? nextIndex(index, plan) : null;
    if (following === null) finish();
    else setIndex(following);
  }, [plan, index, finish]);

  const step = show && plan ? (plan[index] ?? null) : null;
  // A control that left the page during the tour (the Check row under a pop-up) is left out: the tour goes on.
  const gone = step !== null && !present.has(step);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the tour moves on once, when the control of the step leaves the page
    if (gone) next();
  }, [gone, next]);
  const active = gone ? null : step;

  const tour = useMemo<TourState>(
    () => ({ active, copy, register, index, total: plan?.length ?? 0, next, finish }),
    [active, copy, register, index, plan, next, finish],
  );
  return <TourContext.Provider value={tour}>{children}</TourContext.Provider>;
}

/**
 * Marks one control of a tour. `children` must be one element that takes a ref (a tag, or a Link): the Popover
 * anchors to it with Radix Slot, which also adds the ring of the active step. Outside <Tour>, it shows only the child.
 * `wideSide`: the side of the card on a wide screen, for a control too tall to have room above or under it (the Start card).
 */
export function TourStep({
  id,
  wideSide,
  children,
}: {
  id: string;
  wideSide?: "right";
  children: ReactNode;
}) {
  const tour = useContext(TourContext);
  const ref = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const wide = useWide();
  const register = tour?.register;
  useEffect(() => {
    if (register) return register(id);
  }, [register, id]);

  const open = tour?.active === id;
  useEffect(() => {
    // A control out of view (a card far along the lobby row) comes into view first.
    if (open)
      ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open]);

  if (!tour) return children;
  const copy = tour.copy.steps[id];
  const last = tour.index === tour.total - 1;
  return (
    <Popover open={open} onOpenChange={(stay) => !stay && tour.finish()}>
      <PopoverAnchor
        asChild
        ref={ref}
        className={cn(
          open && "ring-4 ring-probe ring-offset-2 ring-offset-transparent",
        )}
      >
        {children}
      </PopoverAnchor>
      <PopoverContent
        aria-label={tour.copy.label}
        side={wide && wideSide ? wideSide : "bottom"}
        collisionPadding={12}
        sideOffset={12}
        className="w-[min(24rem,calc(100vw-1.5rem))] border-0 bg-transparent p-0 shadow-none"
        // The tour stays open on a click outside. Escape (onOpenChange) and Skip end it.
        onInteractOutside={(event) => event.preventDefault()}
        // The focus goes to Next, so Enter moves the tour on.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nextRef.current?.focus();
        }}
      >
        <Card className="gap-3 rounded-2xl border-border bg-card py-4 shadow-panel">
          <CardHeader className="flex items-center gap-3 px-4">
            <Volt pose="idle" className="h-12 w-auto shrink-0" />
            <div className="min-w-0">
              <CardDescription className="font-mono text-[11px] font-medium tracking-wide uppercase">
                {fill(text.step, { n: tour.index + 1, total: tour.total })}
              </CardDescription>
              <CardTitle className="text-base leading-snug font-extrabold">
                <h2>{copy.title}</h2>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 text-sm leading-relaxed">
            <p>{copy.text}</p>
          </CardContent>
          <CardFooter className="justify-between gap-2 px-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={tour.finish}
            >
              {text.skip}
            </Button>
            <Button
              ref={nextRef}
              type="button"
              className="min-h-11"
              onClick={tour.next}
            >
              {last ? text.done : text.next}
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
