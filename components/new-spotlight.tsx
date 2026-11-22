"use client";

import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { loadSeenNews, markNewsSeen } from "@/app/actions/news";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { firstUnseen, markSeen, news, newsItem, readSeen, today } from "@/lib/game/news";
import { fill } from "@/lib/sketch/parse";
import { cn } from "@/lib/utils";

// A "What's new" spotlight (issues #197 and #198): a "New" pill next to a new part of the page. A click or Enter opens a
// short card; "Got it" closes the spotlight for good. A visitor keeps the seen spotlights in this browser. A logged-in
// learner keeps them on the account (profiles.seen_news): each learner spotlight reads the list when it shows first. There
// is no cache of the seen list across spotlights, so a second user on the same tab never gets the list of the first (row 26).
// The text is in content/news.json. The pill shows only in the browser, after the page loads, so the server and the
// browser draw the same first page.
// Quiet build mode (issue #218): a page shows one pill at a time. The first item of the page that the person did not
// see shows (firstUnseen); after "Got it", the next one shows.

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The spotlights that the page holds now, and the ones closed with "Got it" in this visit. A spotlight that leaves the page takes its id out. */
const page = createStore<{ on: string[]; closed: string[] }>(() => ({ on: [], closed: [] }));

export function NewSpotlight({ id, side = "bottom", className }: { id: string; side?: "top" | "bottom" | "left" | "right"; className?: string }) {
  const item = newsItem(id);
  // The seen list of this person. Null until it is read, and when the read fails: no spotlight then.
  const [seen, setSeen] = useState<string[] | null>(null);
  const on = useStore(page, (s) => s.on);
  const closed = useStore(page, (s) => s.closed);

  useEffect(() => {
    page.setState((s) => ({ on: [...s.on, id] }));
    return () => page.setState((s) => ({ on: s.on.filter((x) => x !== id), closed: s.closed.filter((x) => x !== id) }));
  }, [id]);

  useEffect(() => {
    if (!item) return;
    if (item.audience === "visitor") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- only the browser knows the seen list
      setSeen(readSeen(browserStorage()));
      return;
    }
    let live = true;
    // A failed read hides the spotlight.
    void loadSeenNews().catch(() => null).then((list) => {
      if (live) setSeen(list);
    });
    return () => {
      live = false;
    };
  }, [item]);

  if (!item || seen === null || firstUnseen(news.items, [...seen, ...closed], item.audience, today(), on)?.id !== item.id) return null;

  const gotIt = () => {
    // The pill closes at once, and the next pill of the page can show.
    page.setState((s) => ({ closed: [...s.closed, item.id] }));
    if (item.audience === "visitor") return markSeen(browserStorage(), item.id);
    // The account keeps the id for the next visit and for other devices.
    void markNewsSeen(item.id);
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
