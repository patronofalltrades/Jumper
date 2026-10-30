"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PerchWake } from "@/components/art/perch-wake";
import { Mascot } from "@/components/art/mascot";
import { readSavedLevel } from "@/components/build/autosave";
import { SaveSnapshot, type LevelOption } from "@/components/snapshots/save-snapshot";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/complete.json";
import { accuracy, accuracyTier, formatDuration, isReplay, titleTier } from "@/lib/stats/level-summary";
import type { MascotId } from "@/lib/game/project-mascot";
import { cn } from "@/lib/utils";

export type LevelSummary = {
  xp: number;
  tasksDone: number;
  mistakes: number;
  durationMs: number;
};

// The pop-up at the end of a level: the device wakes up, then XP, accuracy and time.
// It does not close with Esc or a click outside; Continue is the way out, and it has the focus.
/** Where Save snapshot finds the board: the level and the user, as build mode saved them in this browser. */
export type SaveFrom = { levels: LevelOption[]; user: string; project: string; position: number };

export function LevelComplete({ summary, continueHref, save, preview = false, mascot = "volt" }: { summary: LevelSummary; continueHref: string; save: SaveFrom; preview?: boolean; mascot?: MascotId }) {
  const continueRef = useRef<HTMLAnchorElement>(null);
  const percent = accuracy(summary.tasksDone, summary.mistakes);
  const xp = useCountUp(summary.xp, 1200);
  const pct = useCountUp(percent, 1350);

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            continueRef.current?.focus();
          }}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-background px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none"
        >
          {preview && <p className="mb-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{text.preview}</p>}

          <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6">
            {/* The project's mascot cheers next to the device that wakes up. Only Perch has a device picture. */}
            <div className="flex items-end gap-1 sm:gap-3">
              <Mascot id={mascot} pose="cheer" label className="w-24 sm:w-32" />
              {save.project === "perch" && <PerchWake className="w-40 sm:w-56" />}
            </div>

            <div className="rise-in text-center" style={{ animationDelay: "0.9s" }}>
              <Dialog.Title className="text-3xl font-extrabold text-probe sm:text-4xl">{isReplay(summary.xp) ? text.title.replay : text.title[titleTier(summary.mistakes)]}</Dialog.Title>
              <Dialog.Description className="mt-2 text-lg">{isReplay(summary.xp) ? text.subtitleReplay : text.subtitle.replace("{xp}", String(summary.xp))}</Dialog.Description>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:gap-3">
              <StatCard label={text.cards.xp} tone="probe" delay={1.05} icon={<BoltIcon />} value={xp} />
              <StatCard label={text.cards.accuracy[accuracyTier(percent)]} tone="pcb" delay={1.15} icon={<TargetIcon />} value={`${pct}%`} />
              <StatCard label={text.cards.time} tone="ink" delay={1.25} icon={<ClockIcon />} value={formatDuration(summary.durationMs)} />
            </div>
          </div>

          <div className="rise-in mt-6 w-full max-w-md" style={{ animationDelay: "1.4s" }}>
            <div className="flex gap-3">
              <SaveSnapshot levels={save.levels} read={() => readSavedLevel(save.user, save.project, save.position)}>
                <Button variant="outline" className="h-14 px-5">
                  <CameraIcon />
                  <span className="max-sm:sr-only">{text.snapshot}</span>
                </Button>
              </SaveSnapshot>
              <Button asChild className="h-14 flex-1 text-base tracking-wide uppercase">
                <Link ref={continueRef} href={continueHref}>{text.continue}</Link>
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Strip and outline color, and the value color, for each card. --ink is the same color as the page text.
const TONES = {
  probe: { frame: "border-probe bg-probe text-[#13202a]", value: "text-probe" },
  pcb: { frame: "border-primary bg-primary text-primary-foreground", value: "text-primary" },
  ink: { frame: "border-foreground bg-foreground text-card", value: "text-foreground" },
} as const;

function StatCard({ label, tone, delay, icon, value }: { label: string; tone: keyof typeof TONES; delay: number; icon: ReactNode; value: ReactNode }) {
  const t = TONES[tone];
  return (
    <div className={cn("rise-in flex flex-col rounded-2xl border-2 shadow-panel", t.frame)} style={{ animationDelay: `${delay}s` }}>
      <p className="py-1 text-center text-[11px] font-bold tracking-wider sm:text-xs">{label}</p>
      <div className={cn("m-0.5 mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-card px-1 py-3 text-lg font-extrabold tabular-nums sm:text-xl", t.value)}>
        {icon}
        {value}
      </div>
    </div>
  );
}

// Counts from 0 to the target. With reduced motion, it shows the target at once.
function useCountUp(target: number, ms: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const length = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = length > 0 ? Math.min(1, (now - start) / length) : 1;
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", "aria-hidden": true, className: "shrink-0" } as const;

function BoltIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M10 2h4" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
