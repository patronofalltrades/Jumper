"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import text from "@/content/ui/build.json";
import type { Track } from "@/lib/game/music";
import { cn } from "@/lib/utils";
import { MusicSwitch } from "./music";
import { ReadStepsSwitch, useSpeechSupported } from "./read-aloud";

// The sound settings of build mode (issue #218, quiet build mode): "Read steps aloud" and "Play music", behind one
// button: in the header on a laptop, and next to the task chip on a phone (the header of a phone has no space). Before,
// the two switches were in the task panel. The button does not show when the browser has no voice and the level has no music.

/** `className`: more classes for the button. The header has little space on a phone, so there the build page puts the button next to the task chip. */
export function SettingsMenu({ music, className }: { music: Track | null; className?: string }) {
  const speaks = useSpeechSupported();
  if (!speaks && !music) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={text.settings.label}
          title={text.settings.label}
          className={cn(
            "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-b-4 border-border bg-card text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2",
            className,
          )}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M19 5.5a9 9 0 0 1 0 13" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} collisionPadding={12} aria-label={text.settings.label} className="w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl p-2">
        <p className="px-2 pt-1 pb-0.5 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{text.settings.title}</p>
        <ReadStepsSwitch />
        <MusicSwitch track={music} />
      </PopoverContent>
    </Popover>
  );
}
