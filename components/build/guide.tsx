"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import text from "@/content/ui/build.json";
import type { Bench } from "@/lib/circuit/bench";
import { isModuleType } from "@/lib/circuit/modules";
import { buildNets, describeHole, type ModulePin } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { cn } from "@/lib/utils";

// The guidance on the build page, in two places:
// - The guide bar, at the top of the board: what to do now.
// - The spot card, next to the pointer (or above the finger on a phone): what is at this hole, or why the last
//   click did not work.
// The words come from content/ui/build.json.

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));

const subscribeTouch = (update: () => void) => {
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-touch"] });
  return () => observer.disconnect();
};

/** True on a touch screen, from data-touch on <html> (components/device-tag.tsx). */
function useTouch() {
  return useSyncExternalStore(subscribeTouch, () => document.documentElement.dataset.touch === "true", () => false);
}

function pinName(name: string) {
  const names: Record<string, string> = text.pins;
  const gpio = /^GPIO(\d+)$/.exec(name);
  return names[name] ?? (gpio ? fill(text.pins.gpio, { n: gpio[1] }) : name);
}

const problems: Record<string, string> = text.problem;
const partNames: Record<string, string> = text.tray.parts;
const modulePinName = (p: ModulePin) => `${partNames[p.type]} ${p.pin}`;

const joinNames = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/** What to do now, at the top of the board. */
export function GuideBar() {
  const tool = useBoard((s) => s.tool);
  const pending = useBoard((s) => s.pending);
  const notice = useBoard((s) => s.notice);
  const touch = useTouch();
  const act = touch ? "Tap" : "Click";

  const placing = isModuleType(tool);
  const steps = (placing ? text.guide.module : text.guide[tool]) as { start: string; finish?: string; preview?: string };
  const next = pending ? (steps.finish ?? steps.preview) : undefined;
  const instruction = fill(next ?? steps.start, { act, part: placing ? partNames[tool].toLowerCase() : "" });
  const step = steps.finish ? (pending ? 2 : 1) : null;
  // A notice without a hole (nothing to undo) has no spot on the board, so it shows here.
  const problem = notice && !notice.hole ? problems[notice.problem] : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <div
        role="status"
        className={cn(
          "flex max-w-xl items-start gap-3 rounded-2xl border bg-card px-4 py-2.5 shadow-panel",
          problem ? "border-destructive" : "border-border",
        )}
      >
        {step && (
          <span className="mt-0.5 shrink-0 rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] font-semibold text-primary-foreground">
            {fill(text.guide.step, { n: step })}
          </span>
        )}
        <div className="min-w-0">
          <p className={cn("text-[15px] leading-snug font-semibold", problem && "text-destructive")}>{problem ?? instruction}</p>
          {pending && !placing && !problem && <p className="text-sm text-muted-foreground">{touch ? text.guide.stop.phone : text.guide.stop.laptop}</p>}
        </div>
      </div>
    </div>
  );
}

const CARD_WIDTH = 240;
/** Space between the pointer or finger and the card. */
const GAP = 22;

type Spot = { x: number; y: number; width: number; height: number; touch: boolean; at: number };

/** A small card next to the pointer: what is at this hole, or why the last click did not work. */
export function SpotCard() {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [now, setNow] = useState(0);
  const hover = useBoard((s) => s.hover);
  const notice = useBoard((s) => s.notice);
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const nets = useMemo(() => buildNets(bench, parts), [bench, parts]);

  // Follow the pointer over the board. On a phone, keep the place of the last tap.
  useEffect(() => {
    const board = ref.current?.parentElement;
    if (!board) return;
    const place = (e: PointerEvent) => {
      const r = board.getBoundingClientRect();
      setSpot({ x: e.clientX - r.left, y: e.clientY - r.top, width: r.width, height: r.height, touch: e.pointerType !== "mouse", at: e.timeStamp });
    };
    const move = (e: PointerEvent) => e.pointerType === "mouse" && place(e);
    const down = (e: PointerEvent) => e.pointerType !== "mouse" && place(e);
    const leave = (e: PointerEvent) => e.pointerType === "mouse" && setSpot(null);
    board.addEventListener("pointermove", move);
    board.addEventListener("pointerdown", down);
    board.addEventListener("pointerleave", leave);
    return () => {
      board.removeEventListener("pointermove", move);
      board.removeEventListener("pointerdown", down);
      board.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Put the card above or below the point, where it fits, and keep it inside the board.
  // A finger hides the area below it, so on a phone the card goes above when it can.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.hidden || !spot) return;
    const h = el.offsetHeight;
    const fitsAbove = spot.y - GAP - h >= 8;
    const fitsBelow = spot.y + GAP + h <= spot.height - 8;
    const above = spot.touch ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
    const top = above ? spot.y - GAP - h : spot.y + GAP;
    el.style.top = `${Math.max(8, Math.min(top, spot.height - h - 8))}px`;
  });

  // On a phone, the card goes away 4 seconds after a tap, so it does not hide the board.
  useEffect(() => {
    if (!spot?.touch) return;
    const timer = setTimeout(() => setNow(spot.at + 4000), 4000);
    return () => clearTimeout(timer);
  }, [spot]);

  if (!spot || (spot.touch && now >= spot.at + 4000)) return <div ref={ref} hidden />;

  const problem = notice?.hole ? problems[notice.problem] : null;
  const lines = problem ? null : hover ? holeLines(bench, parts, nets, hover) : null;
  if (!problem && !lines) return <div ref={ref} hidden />;

  // Across: with a mouse, the card sits beside the pointer and flips near the right edge.
  // On a phone, it is centered on the finger and kept inside the screen. Up and down: see the layout effect above.
  const W = Math.min(CARD_WIDTH, spot.width - 16);
  const x = spot.touch
    ? Math.min(Math.max(spot.x - W / 2, 8), spot.width - W - 8)
    : spot.x + 14 + W < spot.width
      ? spot.x + 14
      : spot.x - 14 - W;
  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute z-10 rounded-xl border px-3 py-2 text-sm shadow-panel",
        problem ? "border-destructive bg-destructive text-white" : "border-border bg-card",
      )}
      style={{ left: x, width: W }}
    >
      {problem ? (
        <p className="font-semibold">{problem}</p>
      ) : (
        lines!.map((line, i) => (
          <p key={i} className={i === 0 ? "font-semibold" : "text-muted-foreground"}>
            {line}
          </p>
        ))
      )}
    </div>
  );
}

/** The words for a hole: a title, what connects inside the breadboard, and what connects to it. */
function holeLines(bench: Bench, parts: Part[], nets: ReturnType<typeof buildNets>, hole: string): string[] {
  const info = describeHole(bench, parts, nets, hole);
  const h = bench.byId.get(hole)!;
  const lines =
    info.kind === "pin"
      ? [fill(text.hole.pin, { pin: pinName(info.pin!) }), text.hole.pinTip]
      : info.kind === "part"
        ? [fill(text.hole.part, { part: partNames[info.part!.type], pin: info.part!.pin }), text.hole.partTip]
        : info.kind === "rail"
        ? [text.hole.rail[info.rail!], text.hole.railLine]
        : [fill(text.hole.main, { row: h.row, column: h.n }), text.hole.line];
  const connectedPins = [...info.pins.map(pinName), ...info.partPins.map(modulePinName)];
  if (connectedPins.length) lines.push(fill(text.hole.connectedPins, { pin: joinNames(connectedPins) }));
  else if (info.rails.length) lines.push(fill(text.hole.connectedRail, { rail: joinNames(info.rails.map((r) => text.railName[r])) }));
  else if (info.kind === "rail") lines.push(text.hole.railEmpty);
  else if (info.kind === "main") lines.push(text.hole.empty);
  return lines;
}

/** Clears a notice after a short time. */
export function useNoticeTimer() {
  const notice = useBoard((s) => s.notice);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => boardStore.setState({ notice: null }), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
}
