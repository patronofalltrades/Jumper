"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { logEvents } from "@/app/actions/journey";
import ui from "@/content/ui/journey.json";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { lessonOf, type LevelLesson } from "@/lib/journey/lesson-of";
import { readQuestions } from "@/lib/journey/questions";
import {
  diffLines,
  linkedTargets,
  placeText,
  referenceDifference,
  selectionAt,
  showsTarget,
  terminalLabel,
  verdictOf,
  type Target,
  type Verdict,
} from "@/lib/journey/select";
import { cn } from "@/lib/utils";
import { connectionColor, OFF_COLOR } from "./compare-colors";
import { FaultClip, Photo, PhotoCredit, PhotoDifferences } from "./media";
import { QuestionCard } from "./question-card";
import { SchematicAfLed } from "./schematic-af-led";

// Compare views (issue #202, TRD addendum 6.5): the same circuit as a drawing, as the 3D board and as a photo. The panel
// gives the answer first: the board matches the reference, or the connection that is off. Under it, the drawing and the
// photo show side by side, and each connection has one color in the three views. The drawing and the photo are
// reference views; the 3D board is the board of the learner. The panel is not modal: the board stays in view and the
// learner can change it. A level has the button only when it has a lesson file.

const text = ui.compare;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The schematic of each lesson, by lesson id. */
const SCHEMATICS: Record<string, typeof SchematicAfLed> = {
  "af-led": SchematicAfLed,
};

type View = "schematic" | "board" | "photo" | "list";
type Shot = [string, NonNullable<LevelLesson["lesson"]["media"]>["photos"][string]];

/** An event of the pilot records. A save that fails changes nothing for the learner. */
function record(
  found: LevelLesson,
  name: "comparison_opened" | "connection_selected",
  data: Record<string, string | number | boolean>,
) {
  void logEvents([
    {
      id: crypto.randomUUID(),
      name,
      lessonId: found.lesson.id,
      lessonVersion: found.lesson.version,
      data,
    },
  ]).catch(() => {});
}

/** An event value is a short id with no spaces: "bbA.+" becomes "bbA._". */
const eventId = (id: string) => id.replace(/[^A-Za-z0-9_.:-]/g, "_");

export function CompareViews({
  project,
  position,
  laptop,
}: {
  project: string;
  position: number;
  laptop: boolean;
}) {
  const found = useMemo(() => lessonOf(project, position), [project, position]);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  // The intro pop-up of the level comes first.
  const intro = useBoard((s) => s.progress.phase === "intro");
  if (!found || intro) return null;
  if (!open)
    return (
      // A wrapper with no width at the right edge of the board: the button is over the board, and takes no space.
      <div className="relative w-0 shrink-0 self-stretch">
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-3 bottom-3 z-30 max-sm:bottom-[9.5rem] inline-flex w-max min-h-11 items-center gap-1.5 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-bold shadow-panel outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 5h7v14H3zM14 5h7v14h-7zM10 12h4" />
          </svg>
          {text.button}
        </button>
      </div>
    );
  return <Panel found={found} laptop={laptop} onClose={() => setOpen(false)} />;
}

/** What the photo shows of the selection, in words: a selection that is not in the photo, one end only, or a note of the photo. */
function PhotoStatus({ target, name, note }: { target: Target; name: string; note?: string }) {
  const shown = target.photos[name]?.length ?? 0;
  const message = shown === 0 ? fill(text.photo.notHere, { label: target.label }) : shown < target.terminals.length ? text.photo.oneEnd : null;
  if (!message && !note) return null;
  return (
    <p data-testid="photo-status" role="status" className="rounded-xl border border-border bg-muted px-3 py-2 text-sm">
      {[message, note].filter(Boolean).join(" ")}
    </p>
  );
}

/** The id that the panel selects when it opens: the connection that is off, or the first connection when all match. */
function firstSelection(verdict: Verdict, connections: { id: string }[]): string | null {
  if (verdict.kind === "wire" || verdict.kind === "open") return verdict.connection;
  if (verdict.kind === "extra") return verdict.line.terminal;
  return connections[0]?.id ?? null;
}

/** The answer in words. */
function verdictText(found: LevelLesson, verdict: Verdict): string {
  const { map } = found.lesson;
  const v = text.verdict;
  if (verdict.kind === "match") return v.match;
  if (verdict.kind === "extra") return verdict.line.text;
  const c = map.connections.find((x) => x.id === verdict.connection)!;
  if (verdict.kind === "open") return fill(v.open, { a: terminalLabel(map, c.a), b: terminalLabel(map, c.b) });
  const terminal = map.terminals.find((t) => t.id === verdict.terminal);
  const side = verdict.now.kind === "row" && verdict.ref.kind === "row" && verdict.now.n === verdict.ref.n;
  return fill(v.wire, {
    wire: terminal?.wire ?? fill(v.wireFrom, { label: terminal?.label ?? verdict.terminal }),
    now: placeText(verdict.now, v.place, side),
    ref: placeText(verdict.ref, v.place, side),
  });
}

function Panel({
  found,
  laptop,
  onClose,
}: {
  found: LevelLesson;
  laptop: boolean;
  onClose: () => void;
}) {
  const { lesson, reference } = found;
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const closeButton = useRef<HTMLButtonElement>(null);

  const difference = useMemo(
    () => referenceDifference(lesson.map, bench, reference, parts),
    [lesson, bench, reference, parts],
  );
  const lines = useMemo(
    () => diffLines(lesson.map, difference.diff, text.difference),
    [lesson, difference],
  );
  const verdict = useMemo(
    () => verdictOf(lesson.map, bench, reference, parts, difference, lines),
    [lesson, bench, reference, parts, difference, lines],
  );
  // The panel never opens on an empty selection: it starts on the connection that is off.
  const [selected, setSelected] = useState<string | null>(() => firstSelection(verdict, lesson.map.connections));
  const target = useMemo(
    () => (selected ? linkedTargets(lesson.map, selected, bench, parts) : null),
    [lesson, selected, bench, parts],
  );
  const questions = useMemo(() => readQuestions(lesson.questions), [lesson]);
  const photos = Object.entries(lesson.media?.photos ?? {});
  /** The photos of the photo view: a photo of a question shows in its question. The first is the "Real kit". */
  const shots: Shot[] = photos.filter(([key]) => !questions.some((q) => q.photo === key));
  const [shotKey, setShotKey] = useState<string | null>(null);
  const shot = shots.find(([key]) => key === shotKey) ?? shots[0];
  const otherShot = shots.find(([key]) => key !== shots[0]?.[0]);
  const Schematic = SCHEMATICS[lesson.id];

  /** One color for each connection, the same in the three views. A terminal has the color of its first connection. */
  const colors = useMemo(() => {
    const byId = new Map<string, string>();
    lesson.map.connections.forEach((c, i) => byId.set(c.id, connectionColor(i)));
    for (const t of lesson.map.terminals) {
      const i = lesson.map.connections.findIndex((c) => c.a === t.id || c.b === t.id);
      if (i >= 0) byId.set(t.id, connectionColor(i));
    }
    const nets = new Map<string, string>();
    lesson.map.connections.forEach((c, i) => c.schematic && nets.set(c.schematic, connectionColor(i)));
    return { byId, nets };
  }, [lesson]);
  const mark = selected ? colors.byId.get(selected) : undefined;
  /** On the photo: a terminal of the selection has the color of the selection, the others the color of their connection. */
  const colorOf = (terminal: string) => colors.byId.get(terminal);

  /** The sid of each element of the schematic → the id in the map, and its label. */
  const sids = useMemo(() => {
    const ids = new Map<string, string>();
    const labels = new Map<string, string>();
    const add = (sid: string | undefined, id: string, label: string) => {
      if (!sid) return;
      ids.set(sid, id);
      labels.set(sid, label);
    };
    for (const t of lesson.map.terminals)
      add(t.schematic, t.id, fill(text.selectTerminal, { label: t.label }));
    for (const c of lesson.map.connections)
      add(
        c.schematic,
        c.id,
        fill(text.selectConnection, {
          label: linkedTargets(lesson.map, c.id, bench, [])?.label ?? c.id,
        }),
      );
    return { ids, labels };
  }, [lesson, bench]);

  /** The selection now, for the board listener. */
  const latest = useRef<{ target: Target | null; selected: string | null }>({
    target,
    selected,
  });

  /** A selection from a view: the other views show it, and its nets glow in its color on the 3D board. */
  const select = (id: string, view: View) => {
    if (id !== selected)
      record(found, "connection_selected", { id: eventId(id), view });
    setSelected(id);
    latest.current = { target: linkedTargets(lesson.map, id, bench, parts), selected: id };
  };

  // The panel opens: one event, and the keyboard starts at the Close button.
  useEffect(() => {
    record(found, "comparison_opened", { view: laptop ? "all" : "schematic" });
    closeButton.current?.focus();
    return () => {
      boardStore.getState().setHover(null);
      boardStore.getState().setCompare(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one time, when the panel opens
  }, []);

  // The marks on the 3D board: the nets of the selection in its color, and the wire that is off in its own color.
  useEffect(() => {
    const holes: Record<string, string> = {};
    for (const h of target?.holes ?? []) if (mark) holes[h] = mark;
    boardStore.getState().setCompare({ holes, parts: verdict.kind === "wire" ? { [verdict.wire]: OFF_COLOR } : {} });
  }, [target, mark, verdict]);

  // The 3D board is a view too. A hole under the pointer (laptop) or a tapped hole (phone) selects its connection.
  useEffect(() => {
    latest.current = { target, selected };
  });
  useEffect(() => {
    return boardStore.subscribe((state, before) => {
      if (state.hover === before.hover || state.hover === null) return;
      const now = latest.current;
      if (
        now.target &&
        showsTarget(state.bench, state.parts, now.target, state.hover)
      )
        return;
      const id = selectionAt(lesson.map, state.bench, state.parts, state.hover);
      if (!id || id === now.selected) return;
      record(found, "connection_selected", { id: eventId(id), view: "board" });
      setSelected(id);
    });
  }, [found, lesson]);

  const badge = (label: string, tone: "reference" | "yours" | "changed") => (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase",
        tone === "reference" && "border-border bg-muted text-muted-foreground",
        tone === "yours" && "border-primary bg-primary/10 text-foreground",
        tone === "changed" &&
          "border-dashed border-destructive text-destructive",
      )}
    >
      {tone === "changed" && <span aria-hidden="true">≠&nbsp;</span>}
      {label}
    </span>
  );

  /** A small dot in the color of a connection. */
  const swatch = (color: string | undefined) =>
    color && <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />;

  // 1. The answer: the largest, boldest text in the panel.
  const answer = (
    <section
      aria-label={text.verdict.label}
      data-testid="verdict"
      data-verdict={verdict.kind}
      className={cn(
        "rounded-2xl border-2 px-4 py-3",
        verdict.kind === "match" ? "border-primary bg-primary/10" : "bg-card",
      )}
      style={verdict.kind === "match" ? undefined : { borderColor: OFF_COLOR }}
    >
      <p role="status" aria-live="polite" className="text-xl leading-snug font-extrabold tracking-tight sm:text-2xl">
        {verdictText(found, verdict)}
      </p>
      {verdict.kind === "wire" && (
        <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" className="inline-block h-1.5 w-6 shrink-0 rounded-full" style={{ backgroundColor: OFF_COLOR }} />
          {text.verdict.mark}
        </p>
      )}
    </section>
  );

  /** A view of the same size as the other: a label, and the picture in a box of the same shape. */
  const view = (label: string, testid: string, children: ReactNode) => (
    <figure data-testid={testid} className="grid min-w-0 content-start gap-1">
      <figcaption className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</figcaption>
      <div className="grid aspect-[11/9] place-items-center overflow-hidden rounded-xl border border-border bg-card">{children}</div>
    </figure>
  );

  // 2. The drawing and the real kit, side by side, under the answer.
  const views = (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        {Schematic &&
          view(
            text.views.drawing,
            "view-drawing",
            <div className="w-full p-1">
              <Schematic
                title={text.schematicLabel}
                selected={new Set(target?.schematic)}
                labels={sids.labels}
                colors={colors.nets}
                mark={mark}
                onSelect={(sid) => {
                  const id = sids.ids.get(sid);
                  if (id) select(id, "schematic");
                }}
              />
            </div>,
          )}
        {view(
          text.views.kit,
          "view-kit",
          shot ? (
            <div className="w-full">
              <Photo key={shot[0]} photo={shot[1]} name={shot[0]} map={lesson.map} selected={target} onSelect={(id) => select(id, "photo")} colorOf={colorOf} mark={mark} compact />
            </div>
          ) : (
            <p data-testid="photo-absent" className="p-2 text-xs text-muted-foreground">
              {text.photo.absent}
            </p>
          ),
        )}
      </div>
      {otherShot && (
        <button
          type="button"
          aria-pressed={shot?.[0] === otherShot[0]}
          onClick={() => setShotKey(shot?.[0] === otherShot[0] ? shots[0][0] : otherShot[0])}
          className="justify-self-start text-sm font-semibold text-muted-foreground underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {shot?.[0] === otherShot[0] ? text.views.lessonKit : text.views.otherLayout}
        </button>
      )}
      {!laptop && <p className="text-sm text-muted-foreground">{text.boardHint}</p>}
    </div>
  );

  // 3. Under the photo: its differences, marked, and its credit.
  const photoNotes = shot && (
    <div data-testid="photo-view" className="grid gap-2">
      {target && <PhotoStatus target={target} name={shot[0]} note={shot[1].notes?.[target.id]} />}
      <PhotoDifferences photo={shot[1]} />
      <PhotoCredit photo={shot[1]} />
    </div>
  );

  const selection = target && (
    <div aria-live="polite" className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: mark }}>
      <p className="flex flex-wrap items-center gap-2 font-bold">
        <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          {text.selected}
        </span>
        {swatch(mark)}
        <span data-testid="selected-label">{target.label}</span>
        {difference.changed.includes(target.id) &&
          badge(text.changed, "changed")}
      </p>
      {target.explain && (
        <p className="mt-1 text-muted-foreground">{target.explain}</p>
      )}
      {target.holes.length < target.terminals.length && (
        <p className="mt-1 font-semibold">{text.notOnBoard}</p>
      )}
    </div>
  );

  const pick = (id: string, label: string, aria: string, extra?: ReactNode) => (
    <li key={id}>
      <button
        type="button"
        aria-pressed={selected === id}
        aria-label={aria}
        onClick={() => select(id, "list")}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected === id ? "border-2 bg-muted font-bold" : "border-border bg-card",
        )}
        style={selected === id ? { borderColor: colors.byId.get(id) } : undefined}
      >
        {swatch(colors.byId.get(id))}
        <span className="flex-1">{label}</span>
        {extra}
      </button>
    </li>
  );

  const list = (
    <section aria-label={text.connections} className="grid gap-3">
      <div>
        <h3 className="mb-1 text-sm font-bold">{text.connections}</h3>
        <ul className="grid gap-1.5">
          {lesson.map.connections.map((c) => {
            const label =
              linkedTargets(lesson.map, c.id, bench, [])?.label ?? c.id;
            return pick(
              c.id,
              label,
              fill(text.selectConnection, { label }),
              difference.changed.includes(c.id)
                ? badge(text.changed, "changed")
                : undefined,
            );
          })}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-bold">{text.terminals}</h3>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {lesson.map.terminals.map((t) =>
            pick(t.id, t.label, fill(text.selectTerminal, { label: t.label })),
          )}
        </ul>
      </div>
    </section>
  );

  // All the differences, when there is more than one: the answer names the first.
  const differences = lines.length > 1 && (
    <section aria-label={text.difference.title} data-testid="difference">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
        {text.difference.title} {badge(text.yourBoard, "yours")}
      </h3>
      <p className="text-sm text-muted-foreground">{fill(text.difference.count, { n: lines.length })}</p>
      <ul className="mt-1.5 grid gap-1.5">
        {lines.map((line) => (
          <li
            key={line.text}
            className="flex items-center gap-2 rounded-xl border border-dashed border-destructive px-3 py-2 text-sm"
          >
            <span className="flex-1">
              <span aria-hidden="true" className="font-bold text-destructive">
                ≠{" "}
              </span>
              {line.text}
            </span>
            <button
              type="button"
              onClick={() => select(line.terminal, "list")}
              className="min-h-9 shrink-0 rounded-lg border border-b-2 border-border bg-card px-2 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {text.difference.show}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  const extras = (
    <>
      {lesson.media?.fault && <FaultClip fault={lesson.media.fault} />}
      {questions.map((q) => (
        <QuestionCard key={q.id} found={found} question={q}>
          {q.photo && lesson.media?.photos[q.photo] && (
            <Photo
              photo={lesson.media.photos[q.photo]}
              name={q.photo}
              map={lesson.map}
              selected={target}
              onSelect={(id) => select(id, "photo")}
              colorOf={colorOf}
              mark={mark}
            />
          )}
        </QuestionCard>
      ))}
    </>
  );

  return (
    <aside
      role="region"
      aria-label={text.title}
      data-testid="compare-views"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className={cn(
        "z-40 flex min-h-0 flex-col border-border bg-card",
        // Beside the board on a laptop, so the board stays in view. A sheet at the bottom of the screen on a phone.
        laptop
          ? "w-[min(520px,45%)] shrink-0 border-l"
          : "fixed inset-x-0 bottom-0 max-h-[62dvh] rounded-t-2xl border-t shadow-panel",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <h2 className="flex-1 text-base font-extrabold tracking-tight">
          {text.title}
        </h2>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={text.close}
          title={text.close}
          className="grid size-11 place-items-center rounded-xl border border-b-4 border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-3 py-3">
        {answer}
        {views}
        {selection}
        {photoNotes}
        {differences}
        {list}
        {extras}
      </div>
    </aside>
  );
}

/** The label of the 3D canvas while Compare views is open: the board of the learner. */
export function CompareBoardLabel() {
  const open = useBoard((s) => s.compare !== null);
  if (!open) return null;
  return (
    <p
      data-testid="your-board-label"
      className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] font-semibold tracking-wide uppercase shadow-panel max-sm:top-16"
    >
      {text.views.board}
    </p>
  );
}
