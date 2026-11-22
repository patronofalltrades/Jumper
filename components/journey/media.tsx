"use client";

import { useState } from "react";
import ui from "@/content/ui/journey.json";
import type { Lesson } from "@/lib/content/schema";
import type { LessonMap, Target } from "@/lib/journey/select";
import { cn } from "@/lib/utils";

// The reference media of Compare views (issue #202): a photo of the real circuit with a point on each terminal, and the
// clip of a real fault with captions and a text description (F1-R5). Media that does not load gives a Retry button and
// the text alternative, and nothing else on the page changes (F1-AC5).

const text = ui.compare;
type Media = NonNullable<Lesson["media"]>;

/** The message when the media did not load: what failed, Retry, and the text alternative. */
function Failed({ message, alternative, onRetry }: { message: string; alternative: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive px-3 py-2 text-sm">
      <p className="font-bold">{message}</p>
      <p className="mt-1 text-muted-foreground">
        {text.photo.alternative} {alternative}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-11 rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
      >
        {text.photo.retry}
      </button>
    </div>
  );
}

/**
 * `name`: the key of the photo in the lesson file. Each terminal that has a point on this photo is a button.
 * `colorOf`: the color of the connection of a terminal, as in the drawing and on the 3D board; `mark`: the color of the
 * selection. The differences of the photo show as numbered markers (issue #202).
 */
export function Photo({
  photo,
  name,
  map,
  selected,
  onSelect,
  colorOf,
  mark,
  compact = false,
}: {
  photo: Media["photos"][string];
  name: string;
  map: LessonMap;
  selected: Target | null;
  onSelect: (id: string) => void;
  colorOf?: (terminal: string) => string | undefined;
  mark?: string;
  /** A small view (the "Real kit" beside the drawing): smaller points and labels, so they do not cover the photo. */
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  if (failed) return <Failed message={text.photo.failed} alternative={photo.alt} onRetry={() => (setFailed(false), setTries(tries + 1))} />;
  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- a Retry loads the same file again, and the points use the size of the picture */}
      <img key={tries} src={tries ? `${photo.src}?retry=${tries}` : photo.src} alt={photo.alt} onError={() => setFailed(true)} className="block h-auto w-full" />
      {map.terminals.map((t) => {
        const spot = t.photos?.[name];
        if (!spot) return null;
        const on = !!selected?.terminals.includes(t.id);
        const color = on && mark ? mark : colorOf?.(t.id);
        return (
          <span key={t.id}>
          <button
            type="button"
            aria-label={t.label}
            aria-pressed={on}
            title={t.label}
            onClick={() => onSelect(t.id)}
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, ...(color && { borderColor: color, ...(on && { backgroundColor: `${color}55`, boxShadow: `0 0 0 4px ${color}66` }) }) }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "size-4 before:absolute before:-inset-2 before:content-['']" : "size-6",
              on ? "z-10 border-probe bg-probe/30 ring-4 ring-probe/40" : "border-white/90 bg-black/30",
              color && "ring-0",
            )}
          />
          {/* The selected point also has its name on the photo: a mark that is not color only. */}
          {on && (
            <span
              aria-hidden="true"
              style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, ...(mark && { borderColor: mark }) }}
              className={cn(
                "pointer-events-none absolute z-10 rounded-md border border-probe bg-card leading-tight font-bold text-foreground shadow-panel",
                compact ? "px-1 py-px text-[9px] whitespace-nowrap" : "max-w-[45%] px-1.5 py-0.5 text-[11px]",
                spot.x > 0.55 ? (compact ? "-translate-x-[calc(100%+12px)]" : "-translate-x-[calc(100%+18px)]") : compact ? "translate-x-[12px]" : "translate-x-[18px]",
                "-translate-y-1/2",
              )}
            >
              {t.label}
            </span>
          )}
          </span>
        );
      })}
      {/* The differences from the lesson: numbered markers. The list under the photo gives the text. */}
      {photo.differences?.map((d, i) => (
        <span
          key={i}
          aria-hidden="true"
          data-testid="photo-difference"
          style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}
          className="pointer-events-none absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border-2 border-white bg-foreground font-mono text-[11px] font-bold text-background shadow-panel"
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

/** The list under a photo: what is different from the lesson, and fine on the board of the learner. The numbers are the markers. */
export function PhotoDifferences({ photo }: { photo: Media["photos"][string] }) {
  if (!photo.differences?.length) return null;
  return (
    <section aria-label={text.photo.differences} data-testid="photo-differences">
      <h4 className="mb-1 text-sm font-bold">{text.photo.differences}</h4>
      <ol className="grid gap-1 text-sm">
        {photo.differences.map((d, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-px grid size-5 shrink-0 place-items-center rounded-md bg-foreground font-mono text-[11px] font-bold text-background">
              {i + 1}
            </span>
            <span>{d.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FaultClip({ fault }: { fault: NonNullable<Media["fault"]> }) {
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  return (
    <div className="grid gap-1.5">
      <h3 className="text-sm font-bold">{text.fault.title}</h3>
      {failed ? (
        <Failed message={text.fault.failed} alternative={fault.description} onRetry={() => (setFailed(false), setTries(tries + 1))} />
      ) : (
        <>
          <video key={tries} controls playsInline preload="metadata" onError={() => setFailed(true)} className="w-full rounded-xl border border-border bg-black">
            <source src={fault.src} onError={() => setFailed(true)} />
            <track kind="captions" src={fault.captions} srcLang="en" label="English" default />
          </video>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{text.fault.description}</span> {fault.description}
          </p>
        </>
      )}
    </div>
  );
}

/** Under a photo: what it shows that is different from the lesson, and who made it, with the license (issue #208). */
export function PhotoCredit({ photo }: { photo: Media["photos"][string] }) {
  const { credit } = photo;
  const link = "font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="grid gap-1.5 text-xs text-muted-foreground">
      {photo.note && !photo.differences?.length && (
        <p data-testid="photo-note" className="text-sm">
          <span className="font-semibold text-foreground">{text.photo.note}</span> {photo.note}
        </p>
      )}
      <p data-testid="photo-credit">
        {text.photo.credit.replace("{author}", credit.author)}{" "}
        <a href={credit.source} target="_blank" rel="noopener noreferrer" className={link}>
          {text.photo.source}: {credit.sourceTitle}
        </a>
        {". "}
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {credit.license}
        </a>
        {". "}
        {text.photo.changes} {credit.changes}
      </p>
    </div>
  );
}
