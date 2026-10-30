"use client";

import { useMemo } from "react";
import text from "@/content/ui/build.json";
import type { Bench } from "@/lib/circuit/bench";
import { connectionStates, type ConnectionState, type Rules } from "@/lib/circuit/check";
import type { Part } from "@/lib/circuit/parts";
import { useBoard } from "@/lib/game/board-store";
import { connectionHologram } from "@/lib/game/hologram";
import { cn } from "@/lib/utils";
import { HologramRow } from "./hologram-row";
import { endpointName, strayRow } from "./names";
import { PanelHeader, usePanelOpen } from "./panel-header";

// The connection list (issue #92): each connection of the level, right or wrong, for the best way round of the
// resistors and buttons. It shows after a failed Check, and it updates each time the board changes. Its look is the task list.

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/**
 * The list under the task list, after a failed Check. `rules` are the rules of the level (joined with the earlier levels).
 * Its header opens and closes it, as the task list (issue #112): open on a laptop, closed on a phone or when the code panel is open (`small`).
 */
export function ConnectionList({ rules, laptop, small = false }: { rules: Rules; laptop: boolean; small?: boolean }) {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const states = useMemo(() => connectionStates(bench, parts, rules), [bench, parts, rules]);
  const done = states.filter((s) => s.ok).length;
  const [open, toggle] = usePanelOpen(laptop && !small);

  return (
    <section
      aria-label={text.connections.list}
      data-tour="connections"
      className={cn("pointer-events-auto flex min-h-0 flex-col self-start rounded-2xl border border-border bg-card shadow-panel", open && "w-full sm:w-72")}
    >
      <PanelHeader
        open={open}
        onToggle={toggle}
        label={fill(open ? text.connections.title : text.connections.chip, { done, total: states.length })}
        show={text.connections.show}
        hide={text.connections.hide}
      />
      {open && (
      <ol className="flex max-h-[40vh] min-h-0 flex-col gap-1 overflow-y-auto border-t border-border p-2">
        {states.map((state) => (
          <Row key={`${state.kind}:${state.connection.a}:${state.connection.b}`} state={state} bench={bench} parts={parts} />
        ))}
      </ol>
      )}
    </section>
  );
}

function Row({ state, bench, parts }: { state: ConnectionState; bench: Bench; parts: Part[] }) {
  const { kind, connection, ok } = state;
  const label =
    kind === "stray"
      ? strayRow(bench, parts, connection)
      : fill(text.connections[kind], { a: endpointName(bench, parts, connection.a), b: endpointName(bench, parts, connection.b) });
  return (
    // A connection that must be made shows a ghost wire between its two ends on the board (issue #113).
    <HologramRow target={connectionHologram(state)} className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-sm leading-snug">
      <Mark ok={ok} />
      <span className="sr-only">{ok ? text.connections.right : text.connections.wrong}:</span>
      <span className={cn("flex-1", ok ? "text-muted-foreground" : "font-bold")}>{label}</span>
    </HologramRow>
  );
}

/** A green tick when the connection is right, a red cross when it is wrong. */
function Mark({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-2", ok ? "border-primary bg-primary text-primary-foreground" : "border-destructive text-destructive")}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {ok ? <path d="m5 12 5 5 9-10" /> : <path d="M6 6l12 12M18 6 6 18" />}
      </svg>
    </span>
  );
}
