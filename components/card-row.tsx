"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Laptop: a row of cards that scrolls sideways with CSS scroll snap, and page dots that follow the scroll.
// Phone: the same cards in one column that scrolls down with the page, without dots.
export function CardRow({ children, label }: { children: ReactNode; label: string }) {
  const row = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const items = Children.toArray(children);

  function onScroll() {
    const el = row.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const left = el.scrollLeft + el.clientWidth * 0.3;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setActive(atEnd ? cards.length - 1 : Math.max(0, cards.findLastIndex((c) => c.offsetLeft - el.offsetLeft <= left)));
  }

  function goTo(i: number) {
    row.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:my-auto">
      <ul
        ref={row}
        onScroll={onScroll}
        aria-label={label}
        className="flex w-full flex-col gap-3 px-4 sm:snap-x sm:snap-mandatory sm:scroll-px-8 sm:flex-row sm:overflow-x-auto sm:px-8 sm:pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <li key={i} className="sm:shrink-0 sm:snap-start">
            {child}
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <div className="hidden items-center gap-1.5 rounded-full bg-black/30 sm:flex px-2.5 py-1.5 backdrop-blur-sm">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to card ${i + 1}`}
              aria-current={i === active}
              className={cn("size-2 rounded-full transition-all", i === active ? "w-4 bg-white" : "bg-white/55")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
