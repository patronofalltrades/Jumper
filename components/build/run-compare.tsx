"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ui from "@/content/ui/runs.json";
import { endpointHole } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { diffRuns, type RunDiff } from "@/lib/runs/diff";
import { isStale, type RunRecord } from "@/lib/runs/record";
import { cn } from "@/lib/utils";
import { endpointName } from "./names";

// Compare with last run (TRD addendum 6.3, issue #213): the two latest runs with their results, and each change between
// them: connections, parts and lines of the sketch. The list gives possible causes. It never names one cause (F3-R5).
// A run is complete at the press of Run, so there is no "pending" run to show (F3-R4).

const text = ui.compare;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));
const SMALL = "min-h-9 rounded-lg border border-b-2 border-border bg-card px-2.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b";

type Props = {
  /** The run records of the level, oldest first. */
  runs: RunRecord[];
  /** The sketch in the editor now. */
  code: string;
  /** The name of the LED of the level goal, for example "The LED". */
  led: string;
  onClose: () => void;
  /** "Restore this run" (issue #214): the board and the sketch of the run go on the bench. */
  onRestore: (run: RunRecord) => void;
  onUndoRestore: () => void;
};

export function RunCompare({ runs, code, led, onClose, onRestore, onUndoRestore }: Props) {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const hasBackup = useBoard((s) => s.restoreBackup !== null);
  const title = useRef<HTMLHeadingElement>(null);
  const last = runs[runs.length - 1];
  const before = runs[runs.length - 2];
  const diff = useMemo(() => (before && last ? diffRuns(before, last, bench) : null), [before, last, bench]);

  // The panel opens under the result: bring it into view, and give its title the focus for a screen reader.
  useEffect(() => {
    title.current?.focus();
    title.current?.scrollIntoView({ block: "nearest" });
  }, []);
  // The glow of "Show on the board" goes away with the panel.
  useEffect(() => {
    return () => boardStore.getState().setHover(null);
  }, []);

  return (
    <section data-testid="run-compare" aria-labelledby="run-compare-title" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-sm">
      <div className="flex items-center gap-2">
        <h3 id="run-compare-title" ref={title} tabIndex={-1} className="flex-1 text-base font-extrabold outline-none">
          {text.title}
        </h3>
        <button type="button" onClick={onClose} aria-label={text.close} className={SMALL}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {!before || !diff ? (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 leading-snug font-semibold">
          {text.one}
        </p>
      ) : (
        <>
          {isStale(last, parts, code) && isStale(before, parts, code) && (
            <p role="status" data-testid="run-unrun" className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 leading-snug">
              {text.unrun}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <RunCard label={text.before} run={before} led={led} onBench={!isStale(before, parts, code)} onRestore={onRestore} />
            <RunCard label={text.last} run={last} led={led} onBench={!isStale(last, parts, code)} onRestore={onRestore} />
          </div>
          {hasBackup && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 leading-snug">
              <button type="button" onClick={onUndoRestore} className={SMALL}>
                {text.undoRestore}
              </button>
              <span className="text-muted-foreground">{text.undoHelp}</span>
            </div>
          )}
          <Changes diff={diff} before={before} last={last} now={parts} />
          <p className="rounded-lg border-l-4 border-border bg-muted px-3 py-2 leading-snug font-semibold">{text.causes}</p>
        </>
      )}
    </section>
  );
}

/** One run: its label (successful or failed), its time, and its result. */
function RunCard({ label, run, led, onBench, onRestore }: { label: string; run: RunRecord; led: string; onBench: boolean; onRestore: (run: RunRecord) => void }) {
  const { result } = run;
  const ok = result.status === "ok";
  const time = new Date(run.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div data-testid="run-card" data-status={result.status} className={cn("flex flex-col gap-1 rounded-lg border border-l-4 px-3 py-2 leading-snug", ok ? "border-primary" : "border-destructive")}>
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label} · {fill(text.at, { time })}
      </p>
      <p className="font-extrabold">
        <span aria-hidden="true">{ok ? "✓ " : "✕ "}</span>
        {ok ? text.ok : text.failed}
        <span className="font-normal text-muted-foreground"> · {ok ? text.okHelp : text.failedHelp}</span>
      </p>
      {result.status === "ok" ? (
        <>
          <p>
            <span className="font-semibold">{text.led}:</span>{" "}
            {fill(text.observed[result.observed.kind], { led, ...(result.observed.kind === "blink" && { on: result.observed.onMs, off: result.observed.offMs }) })}
          </p>
          <p>
            <span className="font-semibold">{text.goal}:</span> {result.goalPassed ? text.goalDone : result.message}
          </p>
        </>
      ) : (
        // The message of a mistake starts with its line: "Line 5: Put a ; at the end of this line."
        <p data-testid="run-error">{result.error.message}</p>
      )}
      {onBench ? (
        <p data-testid="run-on-bench" className="mt-1 text-xs font-semibold text-muted-foreground">
          {text.onBench}
        </p>
      ) : (
        <button type="button" onClick={() => onRestore(run)} className={cn(SMALL, "mt-1 self-start")}>
          {text.restore}
        </button>
      )}
    </div>
  );
}

/** Each change between the two runs, in text. A connection can show its ends on the board. */
function Changes({ diff, before, last, now }: { diff: RunDiff; before: RunRecord; last: RunRecord; now: Part[] }) {
  const bench = useBoard((s) => s.bench);
  // The names use the parts of the two runs and of the board, so a part that is gone still has its name.
  const all = useMemo(() => [...(last.parts as Part[]), ...(before.parts as Part[]), ...now], [before, last, now]);
  const name = (id: string) => endpointName(bench, all, id);
  const partName = (p: Part) => endpointName(bench, all, `${p.id}.`).trim();
  /** The point that the board shows now, in words: the glow of the old end and of the new end look the same. */
  const [shown, setShown] = useState<string | null>(null);
  /** The glow of the net of a point on the board of now. A point that is not on the board has no button. */
  const show = (id: string, label: string) => {
    const hole = endpointHole(bench, now, id);
    if (hole === null) return null;
    return (
      <button
        type="button"
        className={SMALL}
        onClick={() => {
          boardStore.getState().setHover(hole);
          setShown(fill(text.shown, { name: name(id) }));
        }}
      >
        {label}
      </button>
    );
  };
  const { connections, parts } = diff;
  const boardChanges = connections.moved.length + connections.removed.length + connections.added.length + parts.added.length + parts.removed.length;

  if (diff.count === 0)
    return (
      <p role="status" data-testid="run-same" className="rounded-lg bg-muted px-3 py-2 leading-snug font-semibold">
        {text.same}
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <p className="font-extrabold">
        {text.changes} · <span data-testid="run-count">{diff.count === 1 ? text.countOne : fill(text.count, { n: diff.count })}</span>
      </p>

      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{text.board}</p>
      {boardChanges === 0 && !diff.layoutOnly && <p className="text-muted-foreground">{text.noBoard}</p>}
      <ul data-testid="run-board-changes" className="flex flex-col gap-1.5">
        {parts.removed.map((p) => (
          <Row key={`gone-${p.id}`}>{fill(text.partRemoved, { part: partName(p) })}</Row>
        ))}
        {parts.added.map((p) => (
          <Row key={`new-${p.id}`}>{fill(text.partAdded, { part: partName(p) })}</Row>
        ))}
        {connections.moved.map((m) => (
          <Row key={`moved-${m.kept}-${m.from}-${m.to}`} actions={[show(m.from, text.showOld), show(m.to, text.showNew)]}>
            {fill(text.moved, { kept: name(m.kept), from: name(m.from), to: name(m.to) })}
          </Row>
        ))}
        {connections.removed.map((c) => (
          <Row key={`removed-${c.a}-${c.b}`} actions={[show(c.a, text.show)]}>
            {fill(text.removed, { a: name(c.a), b: name(c.b) })}
          </Row>
        ))}
        {connections.added.map((c) => (
          <Row key={`added-${c.a}-${c.b}`} actions={[show(c.a, text.show)]}>
            {fill(text.added, { a: name(c.a), b: name(c.b) })}
          </Row>
        ))}
        {diff.layoutOnly && <Row>{text.layoutOnly}</Row>}
      </ul>
      <p role="status" data-testid="run-shown" className="text-xs font-semibold text-muted-foreground">
        {shown}
      </p>

      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{text.sketch}</p>
      {diff.code.length === 0 ? (
        <p className="text-muted-foreground">{text.noSketch}</p>
      ) : (
        <ul data-testid="run-code-changes" className="flex flex-col overflow-x-auto rounded-lg border border-border font-mono text-xs">
          {diff.code.map((line) => {
            const removed = line.kind === "removed";
            const n = removed ? line.before! : line.after!;
            return (
              <li key={`${line.kind}-${n}`} className={cn("flex gap-2 px-2 py-1 whitespace-pre", removed ? "bg-muted line-through decoration-1" : "font-bold")}>
                <span aria-hidden="true" className="w-3 shrink-0 no-underline">
                  {removed ? "−" : "+"}
                </span>
                <span className="sr-only">{fill(removed ? text.lineRemoved : text.lineAdded, { line: n })}: </span>
                <span aria-hidden="true" className="w-6 shrink-0 text-right text-muted-foreground">
                  {n}
                </span>
                <span>{line.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Row({ children, actions = [] }: { children: React.ReactNode; actions?: React.ReactNode[] }) {
  const shown = actions.filter(Boolean);
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2 leading-snug">
      <span>{children}</span>
      {shown.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {shown.map((action, i) => (
            <span key={i}>{action}</span>
          ))}
        </span>
      )}
    </li>
  );
}
