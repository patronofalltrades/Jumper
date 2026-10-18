"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A row of cards that scrolls sideways with CSS scroll snap, and page dots that follow the scroll.
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
        className="flex w-full snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <li key={i} className="shrink-0 snap-start">
            {child}
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
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
