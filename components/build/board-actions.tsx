"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import text from "@/content/ui/build.json";
import sketchText from "@/content/ui/sketch.json";
import { boardStore } from "@/lib/game/board-store";
import { EMPTY_NOTE } from "./check";

const BIG = "min-h-12 rounded-xl border-b-4 px-8 max-sm:min-h-11 max-sm:px-5 text-base font-extrabold tracking-wide uppercase shadow-panel outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2";

type Props = {
  /** All tasks are done: the Check can run. Before that, the Check button shows, but it is off. */
  ready: boolean;
  /** The learner placed no part in this level: Check and Clear are off. */
  empty: boolean;
  /** The level has a code step and the sketch did not do the goal yet. */
  locked: boolean;
  onCheck: () => void;
  onOpenCode: () => void;
};

/**
 * The button row at the bottom of the board while the learner builds: Clear and Check (issue #114).
 * Other board buttons (for example "Build it for me", issue #115) go in this row.
 */
export function BoardActions({ ready, empty, locked, onCheck, onOpenCode }: Props) {
  const note = ready && empty;
  return (
    <div className="absolute inset-x-3 bottom-4 z-20 flex flex-col items-center gap-2">
      {note && (
        <p id={EMPTY_NOTE} className="max-w-xs rounded-xl bg-card px-3 py-2 text-center text-sm font-semibold shadow-panel">
          {text.play.check.empty}
        </p>
      )}
      {ready && locked && (
        <button type="button" onClick={onOpenCode} className={`${BIG} border-primary-deep bg-primary text-primary-foreground`}>
          {sketchText.panel.open}
        </button>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ClearButton disabled={empty} />
        <button
          type="button"
          onClick={onCheck}
          disabled={!ready || empty || locked}
          aria-describedby={note ? EMPTY_NOTE : undefined}
          className={`${BIG} border-primary-deep bg-primary text-primary-foreground disabled:border-border disabled:bg-muted disabled:text-muted-foreground`}
        >
          {text.play.check.button}
        </button>
      </div>
    </div>
  );
}

/** Clear asks once, then removes the parts that the learner put in this level. Undo puts them back. */
function ClearButton({ disabled }: { disabled: boolean }) {
  const t = text.play.clear;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" disabled={disabled} className={`${BIG} border border-border bg-card text-foreground disabled:text-muted-foreground disabled:opacity-60`}>
          {t.button}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t.title}</DialogTitle>
        <DialogDescription>{t.text}</DialogDescription>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="min-h-11">
              {t.cancel}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" className="min-h-11" onClick={() => boardStore.getState().clear()}>
              {t.confirm}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
