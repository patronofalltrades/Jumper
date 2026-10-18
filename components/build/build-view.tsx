"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import text from "@/content/ui/build.json";
import { boardStore, useBoard, WIRE_COLORS, type Tool } from "@/lib/game/board-store";
import { GuideBar, SpotCard, useNoticeTimer } from "./guide";
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

/** The parts tray: modules and the speaker, in the order of content/ui/build.json. */
const TRAY = Object.entries(text.tray.parts).map(([tool, label]) => ({ tool: tool as Tool, label }));
const inTray = (tool: Tool) => TRAY.some((t) => t.tool === tool);

/** "parts" opens the parts tray, with the part that the learner used last. */
type ToolKey = Tool | "parts";

const TOOLS: { tool: ToolKey; label: string; key: string; icon: ReactNode }[] = [
  { tool: "wire", label: "Wire", key: "1", icon: icon("M5 18c0-8 14-4 14-12M5 18h.01M19 6h.01") },
  { tool: "resistor", label: "Resistor", key: "2", icon: icon("M2 12h4l2-4 3 8 3-8 3 8 2-4h3") },
  { tool: "led", label: "LED", key: "3", icon: icon("M8 14V9a4 4 0 0 1 8 0v5M6 14h12M10 14v6M14 14v4") },
  { tool: "parts", label: text.tray.label, key: "4", icon: icon("M4 6h7v7H4zM15 8h5M15 12h5M4 17h16M7 13v4M10 13v4") },
  { tool: "remove", label: "Remove", key: "5", icon: icon("M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3") },
];

/** The last part picked in the tray. The Parts button and key 4 go back to it. */
let lastTrayTool: Tool = TRAY[0].tool;
const pickTool = (tool: ToolKey) => {
  const next = tool === "parts" ? lastTrayTool : tool;
  if (inTray(next)) lastTrayTool = next;
  boardStore.getState().setTool(next);
};

export function BuildView({ level, eyebrow, title }: { level: string; eyebrow: string; title: string }) {
  useKeys();
  useNoticeTimer();
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
        <GuideBar />
        <SpotCard />
      </div>

      <ToolBar />
    </div>
  );
}

function ToolBar() {
  const tool = useBoard((s) => s.tool);
  const canUndo = useBoard((s) => s.history.length > 0);
  const { undo } = boardStore.getState();

  return (
    <div className="z-10 border-t border-border bg-card px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] sm:px-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {/* The row keeps its space for every tool, so the board does not move when the tool changes. */}
        <div className="h-11">{inTray(tool) ? <Tray tool={tool} /> : <Swatches hidden={tool !== "wire"} />}</div>
        <div className="grid grid-cols-6 gap-1 sm:gap-2" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <ToolButton
              key={t.tool}
              pressed={t.tool === "parts" ? inTray(tool) : tool === t.tool}
              onClick={() => pickTool(t.tool)}
              label={t.label}
              shortcut={t.key}
            >
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

function Swatches({ hidden }: { hidden: boolean }) {
  const wireColor = useBoard((s) => s.wireColor);
  return (
    <div className={cn("flex h-full items-center justify-center gap-2", hidden && "invisible")} aria-hidden={hidden} role="group" aria-label="Wire color">
      <span className="text-xs font-semibold text-muted-foreground">Wire color</span>
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

/** The parts tray: one chip for each module and the speaker. */
function Tray({ tool }: { tool: Tool }) {
  const row = useRef<HTMLDivElement>(null);
  // Keep the selected chip in view on a narrow screen.
  useEffect(() => row.current?.querySelector("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "nearest" }), [tool]);
  return (
    <div ref={row} className="flex h-full items-center gap-1.5 overflow-x-auto sm:justify-center" role="group" aria-label={text.tray.label}>
      {TRAY.map((t) => (
        <button
          key={t.tool}
          type="button"
          aria-pressed={t.tool === tool}
          onClick={() => pickTool(t.tool)}
          className="min-h-11 shrink-0 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 aria-pressed:border-primary-deep aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Esc cancels, 1–5 pick a tool, Ctrl+Z or Cmd+Z undoes. */
function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      const { undo, cancel } = boardStore.getState();
      const tool = TOOLS.find((t) => t.key === e.key);
      if (e.key === "Escape") cancel();
      else if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      } else if (tool && !e.metaKey && !e.ctrlKey) pickTool(tool.tool);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
