import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DockPage = "lobby" | "builds" | "build" | "dashboard" | "profile";

type Item = { page: DockPage; label: string; href: string; icon: ReactNode };

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const LEFT: Item[] = [
  { page: "lobby", label: "Lobby", href: "/lobby", icon: icon("M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z") },
  { page: "builds", label: "Builds", href: "/lobby?tab=builds", icon: icon("M7 7h12v12H7zM4 16V5a1 1 0 0 1 1-1h11") },
];
const RIGHT: Item[] = [
  { page: "dashboard", label: "Dashboard", href: "/soon/dashboard", icon: icon("M5 20V11M12 20V5M19 20v-6") },
  { page: "profile", label: "Profile", href: "/soon/profile", icon: icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0") },
];

// The bottom navigation of the logged-in pages. Build, in the center, opens the level that Continue opens.
export function Dock({ active }: { active?: DockPage }) {
  return (
    <>
      <div className="h-28 shrink-0" aria-hidden="true" />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-start gap-2">
          <Group items={LEFT} active={active} />
          <Link href="/play" className="group flex flex-col items-center gap-1.5" aria-current={active === "build" ? "page" : undefined}>
            <span className="flex size-15 items-center justify-center rounded-full border-b-4 border-border bg-card text-foreground shadow-panel transition-[transform,border] group-active:translate-y-0.5 group-active:border-b-2">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-white drop-shadow">Build</span>
          </Link>
          <Group items={RIGHT} active={active} />
        </div>
      </nav>
    </>
  );
}

function Group({ items, active }: { items: Item[]; active?: DockPage }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1 rounded-full bg-[#13202a]/90 p-1.5 shadow-panel backdrop-blur">
        {items.map((item) => (
          <Link
            key={item.page}
            href={item.href}
            aria-label={item.label}
            aria-current={item.page === active ? "page" : undefined}
            className={cn(
              "flex h-12 w-15 items-center justify-center rounded-full transition-colors",
              item.page === active ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
            )}
          >
            {item.icon}
          </Link>
        ))}
      </div>
      <div className="flex gap-1">
        {items.map((item) => (
          <span
            key={item.page}
            className={cn("w-15 text-center text-[11px] font-semibold drop-shadow", item.page === active ? "text-white" : "text-white/70")}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
