"use client";

import { useEffect } from "react";
import { create } from "zustand";
import text from "@/content/ui/build.json";
import { readHelp, saveHelp } from "@/lib/game/help";
import { cn } from "@/lib/utils";

// The Help switch of build mode (issue #210). The rules are in lib/game/help.ts.

/** `ready`: the saved choice is read. It is read after the first paint, so the server and the page match. */
const help = create(() => ({ on: false, ready: false }));

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** The saved choice, for an effect that runs one time when the level opens. */
export const helpNow = () => readHelp(storage());

export function useHelp() {
  const state = help();
  useEffect(() => {
    if (!help.getState().ready) help.setState({ on: helpNow(), ready: true });
  }, []);
  return state;
}

/** The Help button in the header of build mode. */
export function HelpButton() {
  const { on } = useHelp();
  const label = on ? text.help.on : text.help.off;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={text.help.button}
      title={label}
      onClick={() => {
        saveHelp(storage(), !on);
        help.setState({ on: !on, ready: true });
      }}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-b-4 px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2",
        on ? "border-primary-deep bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3M12 17.5h.01" />
        <circle cx="12" cy="12" r="9.5" />
      </svg>
      <span className="max-sm:hidden">{text.help.button}</span>
    </button>
  );
}
