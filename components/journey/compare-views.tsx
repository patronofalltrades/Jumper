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
  referenceDifference,
  selectionAt,
  showsTarget,
  type Target,
} from "@/lib/journey/select";
import { cn } from "@/lib/utils";
import { FaultClip, Photo } from "./media";
import { QuestionCard } from "./question-card";
import { SchematicAfLed } from "./schematic-af-led";

// Compare views (issue #202, TRD addendum 6.5): the same circuit as a schematic, as the 3D board and as a photo. One
// selection shows in each view. The schematic and the photo are reference views; the 3D board is the board of the
// learner, and the panel tells which of its connections differ from the reference. The panel is not modal: the board
// stays in view and the learner can change it. A level has the button only when it has a lesson file.

const text = ui.compare;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The schematic of each lesson, by lesson id. */
const SCHEMATICS: Record<string, typeof SchematicAfLed> = {
  "af-led": SchematicAfLed,
};

type View = "schematic" | "board" | "photo" | "list";

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
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"schematic" | "board" | "photo">("schematic");
  const closeButton = useRef<HTMLButtonElement>(null);

  const target = useMemo(
    () => (selected ? linkedTargets(lesson.map, selected, bench, parts) : null),
    [lesson, selected, bench, parts],
  );
  const difference = useMemo(
    () => referenceDifference(lesson.map, bench, reference, parts),
    [lesson, bench, reference, parts],
  );
  const lines = useMemo(
    () => diffLines(lesson.map, difference.diff, text.difference),
    [lesson, difference],
  );
  const questions = useMemo(() => readQuestions(lesson.questions), [lesson]);
  const photos = Object.entries(lesson.media?.photos ?? {});
  const Schematic = SCHEMATICS[lesson.id];

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

  /** A selection from a view: the other views show it, and the net glows on the 3D board. */
  const select = (id: string, view: View) => {
    if (id !== selected)
      record(found, "connection_selected", { id: eventId(id), view });
    setSelected(id);
    const next = linkedTargets(lesson.map, id, bench, parts);
    // The board listener below must know this selection before the glow moves, or it selects the net of the hole.
    latest.current = { target: next, selected: id };
    boardStore.getState().setHover(next?.holes[0] ?? null);
  };

  // The panel opens: one event, and the keyboard starts at the Close button.
  useEffect(() => {
    record(found, "comparison_opened", { view: laptop ? "all" : "schematic" });
    closeButton.current?.focus();
    return () => boardStore.getState().setHover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one time, when the panel opens
  }, []);

  // The 3D board is a view too. A hole under the pointer (laptop) or a tapped hole (phone) selects its connection.
  // When the pointer leaves the holes, the net of the selection glows again.
  useEffect(() => {
    latest.current = { target, selected };
  });
  useEffect(() => {
    return boardStore.subscribe((state, before) => {
      if (state.hover === before.hover) return;
      const now = latest.current;
      if (state.hover === null) {
        if (now.target?.holes.length) state.setHover(now.target.holes[0]);
        return;
      }
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

  const selection = (
    <div
      aria-live="polite"
      className={cn(
        "rounded-xl border px-3 py-2 text-sm",
        target ? "border-probe bg-probe/10" : "border-border bg-muted",
      )}
    >
      {target ? (
        <>
          <p className="flex flex-wrap items-center gap-2 font-bold">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              {text.selected}
            </span>
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
        </>
      ) : (
        <p className="text-muted-foreground">{text.none}</p>
      )}
    </div>
  );

  const schematic = Schematic && (
    <section aria-label={text.tabs.schematic}>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
        {text.tabs.schematic} {badge(text.reference, "reference")}
      </h3>
      <div className="rounded-xl border border-border bg-card p-2">
        <Schematic
          title={text.schematicLabel}
          selected={new Set(target?.schematic)}
          labels={sids.labels}
          onSelect={(sid) => {
            const id = sids.ids.get(sid);
            if (id) select(id, "schematic");
          }}
        />
      </div>
    </section>
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
          selected === id
            ? "border-2 border-probe bg-probe/10 font-bold"
            : "border-border bg-card",
        )}
      >
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

  const differences = (
    <section aria-label={text.difference.title} data-testid="difference">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
        {text.difference.title} {badge(text.yourBoard, "yours")}
      </h3>
      <p role="status" className="text-sm text-muted-foreground">
        {difference.same
          ? text.difference.same
          : lines.length === 1
            ? text.difference.countOne
            : fill(text.difference.count, { n: lines.length })}
      </p>
      {lines.length > 0 && (
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
      )}
    </section>
  );

  const photo = (
    <section aria-label={text.photo.title} className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        {text.photo.title} {badge(text.reference, "reference")}
      </h3>
      {photos.length === 0 && (
        <p
          data-testid="photo-absent"
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          {text.photo.absent}
        </p>
      )}
      {photos
        .filter(([key]) => !questions.some((q) => q.photo === key))
        .map(([key, media]) => (
          <Photo
            key={key}
            photo={media}
            name={key}
            map={lesson.map}
            selected={target}
            onSelect={(id) => select(id, "photo")}
          />
        ))}
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
            />
          )}
        </QuestionCard>
      ))}
    </section>
  );

  const tabs = (["schematic", "board", "photo"] as const).map((key) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        "min-h-11 flex-1 rounded-xl border px-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tab === key
          ? "border-2 border-probe bg-probe/10"
          : "border-border bg-card",
      )}
    >
      {text.tabs[key]}
    </button>
  ));

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
          ? "w-[min(440px,42%)] shrink-0 border-l"
          : cn(
              "fixed inset-x-0 bottom-0 rounded-t-2xl border-t shadow-panel",
              tab === "board" ? "max-h-[42dvh]" : "max-h-[62dvh]",
            ),
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
      {!laptop && (
        <div
          role="tablist"
          aria-label={text.tabs.label}
          className="flex gap-1.5 border-b border-border px-3 py-2"
        >
          {tabs}
        </div>
      )}
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-3 py-3">
        {laptop && (
          <p className="text-sm text-muted-foreground">{text.intro}</p>
        )}
        {selection}
        {laptop ? (
          <>
            {schematic}
            {differences}
            {list}
            {photo}
          </>
        ) : tab === "schematic" ? (
          <>
            {schematic}
            {list}
          </>
        ) : tab === "board" ? (
          <>
            <p className="text-sm text-muted-foreground">{text.boardHint}</p>
            {differences}
          </>
        ) : (
          photo
        )}
      </div>
    </aside>
  );
}
