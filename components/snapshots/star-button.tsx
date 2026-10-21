"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleStar } from "@/app/actions/star";
import text from "@/content/ui/snapshots.json";
import { cn } from "@/lib/utils";

const t = text.stars;

/** The star of a snapshot. A press changes it at once; if the server refuses, it goes back and shows a message. */
export function StarButton({ id, starred, className }: { id: string; starred: boolean; className?: string }) {
  // The page sends the new `starred` after the action, so the optimistic state only covers the request.
  const [shown, setShown] = useOptimistic(starred);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const press = () => {
    const next = !shown;
    setError(null);
    start(async () => {
      setShown(next);
      const result = await toggleStar({ id, starred: next });
      if (result.error) setError(result.error);
    });
  };

  return (
    <span className={cn("flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={press}
        aria-pressed={shown}
        aria-label={shown ? t.unstar : t.star}
        title={shown ? t.unstar : t.star}
        className="grid size-11 place-items-center rounded-xl border border-b-4 border-border bg-card transition-[transform,border] outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 2.8 2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.14 6.38 20.1l1.07-6.27L2.9 9.4l6.3-.9L12 2.8Z"
            fill={shown ? "var(--probe)" : "none"}
            stroke={shown ? "var(--probe)" : "currentColor"}
            strokeWidth="1.8"
            strokeLinejoin="round"
            className={shown ? undefined : "text-muted-foreground"}
          />
        </svg>
      </button>
      {error && (
        <span role="alert" className="max-w-48 text-right text-xs font-medium text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
