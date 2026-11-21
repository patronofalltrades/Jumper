"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markSeen, news, newsItem, readSeen, today, unseen } from "@/lib/game/news";
import { fill } from "@/lib/sketch/parse";
import { cn } from "@/lib/utils";

// A "What's new" spotlight (issue #197): a "New" pill next to a new part of the page. A click or Enter opens a short
// card; "Got it" closes the spotlight for good. A visitor keeps the seen spotlights in this browser.
// The text is in content/news.json. The pill shows only in the browser, after the page loads, so the server and the
// browser draw the same first page.

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function NewSpotlight({ id, side = "bottom", className }: { id: string; side?: "top" | "bottom" | "left" | "right"; className?: string }) {
  const item = newsItem(id);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!item || item.audience !== "visitor") return;
    const seen = readSeen(browserStorage());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only the browser knows the seen list
    if (seen !== null && unseen([item], seen, "visitor", today()).length > 0) setShow(true);
  }, [item]);

  if (!item || !show) return null;

  const gotIt = () => {
    markSeen(browserStorage(), item.id);
    setShow(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-news={item.id}
          aria-label={fill(news.ui.label, { title: item.title })}
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-sun px-3 text-xs font-bold tracking-wide text-on-sun uppercase shadow-[0_0_0_4px_rgba(245,197,24,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-white",
            className,
          )}
        >
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-on-sun/60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-on-sun" />
          </span>
          {news.ui.pill}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        collisionPadding={12}
        sideOffset={10}
        aria-label={item.title}
        className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border-white/10 bg-night-2 p-4 text-left text-white shadow-xl"
      >
        <p className="font-mono text-[11px] font-semibold tracking-wider text-sun uppercase">{news.ui.pill}</p>
        <h2 className="mt-1 text-base leading-snug font-bold">{item.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/75">{item.text}</p>
        <button type="button" onClick={gotIt} className="mt-3 min-h-11 w-full rounded-xl bg-emerald px-4 text-sm font-bold text-night-2">
          {news.ui.gotIt}
        </button>
      </PopoverContent>
    </Popover>
  );
}
