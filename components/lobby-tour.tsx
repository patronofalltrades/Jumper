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
import { browserStorage } from "@/components/build/tour";
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
import {
  LOBBY_TOUR_KEY,
  LOBBY_TOUR_STEPS,
  markTourSeen,
  nextIndex,
  tourPlan,
  tourSeen,
  type LobbyTourStep,
} from "@/lib/game/tour";
import { cn } from "@/lib/utils";

// The tour for a new user (lib/game/tour.ts): on the first visit to the lobby after the log-in, it shows what Jumper is
// and points at the main controls. <LobbyTour> wraps the lobby. Each control is wrapped in <TourStep id="…">, which
// gives the tour a React ref to the control (no DOM query). The card is a shadcn Popover with a Card, anchored to the
// control: Radix places it, flips it when there is no room, moves the focus into it, and closes it with Escape.

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

type Tour = {
  /** The step on the screen now, or null when the tour does not show. */
  active: LobbyTourStep | null;
  /** A <TourStep> tells the tour that its control is on the page. It returns the function that removes it. */
  register: (id: LobbyTourStep) => () => void;
  /** The place of the active step in the plan, and the number of steps. */
  index: number;
  total: number;
  next: () => void;
  finish: () => void;
};

const TourContext = createContext<Tour | null>(null);

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

export function LobbyTour({ children }: { children: ReactNode }) {
  // Seen until the flag is read in the browser, so the server and the first render match.
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the flag is in the browser only
    setSeen(tourSeen(browserStorage(), LOBBY_TOUR_KEY));
  }, []);

  const [present, setPresent] = useState<ReadonlySet<string>>(new Set());
  const register = useCallback((id: LobbyTourStep) => {
    setPresent((old) => new Set(old).add(id));
    return () =>
      setPresent((old) => {
        const rest = new Set(old);
        rest.delete(id);
        return rest;
      });
  }, []);

  // The plan is made once, when the tour first shows: the steps whose control is on the page, in order.
  const [plan, setPlan] = useState<LobbyTourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (seen || plan || !present.size) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the plan is made once, when the tour first shows
    setPlan(tourPlan(present, LOBBY_TOUR_STEPS));
  }, [seen, plan, present]);

  const finish = useCallback(() => {
    markTourSeen(browserStorage(), LOBBY_TOUR_KEY);
    setSeen(true);
  }, []);
  const next = useCallback(() => {
    const following = plan ? nextIndex(index, plan) : null;
    if (following === null) finish();
    else setIndex(following);
  }, [plan, index, finish]);

  const active = !seen && plan ? (plan[index] ?? null) : null;
  const tour = useMemo<Tour>(
    () => ({ active, register, index, total: plan?.length ?? 0, next, finish }),
    [active, register, index, plan, next, finish],
  );
  return <TourContext.Provider value={tour}>{children}</TourContext.Provider>;
}

/**
 * Marks one control of the lobby tour. `children` must be one element that takes a ref (a tag, or a Link): the Popover
 * anchors to it with Radix Slot, which also adds the ring of the active step. Outside <LobbyTour>, it shows only the child.
 * `wideSide`: the side of the card on a wide screen, for a control too tall to have room above or under it (the Start card).
 */
export function TourStep({
  id,
  wideSide,
  children,
}: {
  id: LobbyTourStep;
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
  const copy = text.lobby.steps[id];
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
        aria-label={text.lobby.label}
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
