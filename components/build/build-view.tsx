"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { boardStore, useBoard, WIRE_COLORS, type Notice, type Tool } from "@/lib/game/board-store";
import type { Bench } from "@/lib/circuit/bench";
import { cn } from "@/lib/utils";

// Only this page loads three.js, so the lobby stays fast (TRD 12.1).
const BuildScene = dynamic(() => import("@/components/scene/build-scene"), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">Loading the board…</p>,
});

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TOOLS: { tool: Tool; label: string; key: string; icon: ReactNode }[] = [
  { tool: "wire", label: "Wire", key: "1", icon: icon("M5 18c0-8 14-4 14-12M5 18h.01M19 6h.01") },
  { tool: "resistor", label: "Resistor", key: "2", icon: icon("M2 12h4l2-4 3 8 3-8 3 8 2-4h3") },
  { tool: "led", label: "LED", key: "3", icon: icon("M8 14V9a4 4 0 0 1 8 0v5M6 14h12M10 14v6M14 14v4") },
  { tool: "remove", label: "Remove", key: "4", icon: icon("M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3") },
];

export function BuildView({ level, eyebrow, title }: { level: string; eyebrow: string; title: string }) {
  useKeys();
  useEffect(() => boardStore.getState().open(level), [level]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
        <Link
          href="/lobby"
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
        >
          ← Lobby
        </Link>
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
          <h1 className="truncate text-lg leading-tight font-extrabold tracking-tight">{title}</h1>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <BuildScene />
        <HoverLabel />
      </div>

      <ToolBar />
    </div>
  );
}

function ToolBar() {
  const tool = useBoard((s) => s.tool);
  const canUndo = useBoard((s) => s.history.length > 0);
  const { setTool, undo } = boardStore.getState();

  return (
    <div className="z-10 border-t border-border bg-card px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] sm:px-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        <div className="flex min-h-7 items-center justify-between gap-3">
          <Hint />
          {tool === "wire" && <Swatches />}
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <ToolButton key={t.tool} pressed={tool === t.tool} onClick={() => setTool(t.tool)} label={t.label} shortcut={t.key}>
              {t.icon}
            </ToolButton>
          ))}
          <ToolButton onClick={undo} label="Undo" shortcut="Ctrl+Z" disabled={!canUndo}>
            {icon("M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3")}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  pressed,
  label,
  shortcut,
  children,
  ...props
}: { pressed?: boolean; label: string; shortcut: string; children: ReactNode } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={`${label} (${shortcut})`}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-b-4 text-xs font-semibold transition-[transform,border] outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 disabled:opacity-40",
        pressed ? "border-primary-deep bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
      )}
      {...props}
    >
      {children}
      {label}
    </button>
  );
}

function Swatches() {
  const wireColor = useBoard((s) => s.wireColor);
  return (
    <div className="flex shrink-0 gap-1.5" role="group" aria-label="Wire color">
      {WIRE_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          aria-label={`${c.name} wire`}
          aria-pressed={c.hex === wireColor}
          onClick={() => boardStore.getState().setWireColor(c.hex)}
          className="size-6 rounded-full border-2 border-card shadow-[0_0_0_1px_var(--line)] aria-pressed:shadow-[0_0_0_2px_var(--probe)]"
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );
}

const subscribeTouch = (update: () => void) => {
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-touch"] });
  return () => observer.disconnect();
};

/** "tap" on a touch screen and "click" with a mouse, from data-touch on <html> (set in the lobby work, components/device-tag.tsx). */
function useTapWord() {
  const touch = useSyncExternalStore(subscribeTouch, () => document.documentElement.dataset.touch === "true", () => false);
  return touch ? "Tap" : "Click";
}

function Hint() {
  const tool = useBoard((s) => s.tool);
  const pending = useBoard((s) => s.pending);
  const notice = useBoard((s) => s.notice);
  const bench = useBoard((s) => s.bench);
  const tap = useTapWord();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => boardStore.setState({ notice: null }), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const text = notice ? noticeText(notice, bench) : toolHint(tool, pending !== null, tap);
  return (
    <p role="status" className={cn("min-w-0 text-sm text-balance", notice ? "font-semibold text-destructive" : "text-muted-foreground")}>
      {text}
    </p>
  );
}

function toolHint(tool: Tool, pending: boolean, tap: string) {
  const lower = tap.toLowerCase();
  if (tool === "remove") return `Remove: ${lower} a part or one of its holes.`;
  if (tool === "led") return pending ? `Now ${lower} the hole for the − (short) leg, 1 to 3 holes away.` : `LED: ${lower} the hole for the + (long) leg.`;
  if (tool === "resistor") return pending ? `Now ${lower} the hole for the second leg, 2 to 10 holes away.` : `Resistor: ${lower} the hole for the first leg.`;
  return pending ? `Now ${lower} the hole for the other end. Esc cancels.` : `Wire: ${lower} a hole to start.`;
}

function noticeText({ problem, hole }: Notice, bench: Bench) {
  const name = hole ? holeName(hole, bench) : "";
  switch (problem) {
    case "covered":
      return `${name} is under the ESP32-S3. Use a free hole next to its pins.`;
    case "esp_pin":
      return `${hole} holds the ESP32-S3 ${bench.pinAt.get(hole!)?.name} pin. Use a free hole in the same strip.`;
    case "taken":
      return `${name} already has a leg in it. Each hole holds one.`;
    case "led_span":
      return "LED legs reach only 1 to 3 holes. Pick a hole nearer the + leg.";
    case "resistor_span":
      return "Put the resistor legs 2 to 10 holes apart.";
    case "nothing_to_remove":
      return `There is nothing to remove in ${name}.`;
    case "nothing_to_undo":
      return "There is nothing to undo.";
    default:
      return "Pick a hole on the breadboard.";
  }
}

/** "A-c14", or "A-j8 · GPIO1" for a hole with an ESP32-S3 pin. */
function holeName(hole: string, bench: Bench) {
  const pin = bench.pinAt.get(hole);
  return pin ? `${hole} · ${pin.name}` : hole;
}

/** The name of the hole under the pointer, top left of the board. */
function HoverLabel() {
  const hover = useBoard((s) => s.hover);
  const bench = useBoard((s) => s.bench);
  if (!hover) return null;
  return (
    <p className="pointer-events-none absolute top-3 left-3 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold shadow-panel">
      {holeName(hover, bench)}
    </p>
  );
}

/** Esc cancels, 1–4 pick a tool, Ctrl+Z or Cmd+Z undoes. */
function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      const { setTool, undo, cancel } = boardStore.getState();
      const tool = TOOLS.find((t) => t.key === e.key);
      if (e.key === "Escape") cancel();
      else if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      } else if (tool && !e.metaKey && !e.ctrlKey) setTool(tool.tool);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
