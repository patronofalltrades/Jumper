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

/** `name`: the key of the photo in the lesson file. Each terminal that has a point on this photo is a button. */
export function Photo({ photo, name, map, selected, onSelect }: { photo: Media["photos"][string]; name: string; map: LessonMap; selected: Target | null; onSelect: (id: string) => void }) {
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
        return (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            aria-pressed={on}
            title={t.label}
            onClick={() => onSelect(t.id)}
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
            className={cn(
              "absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-probe bg-probe/30 ring-4 ring-probe/40" : "border-white/90 bg-black/30",
            )}
          />
        );
      })}
    </div>
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
