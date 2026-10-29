"use client";

import { useState } from "react";

// The header button of a side panel (issue #112): the task list and the connection list open and close with it.

/** Open or closed. Until the learner taps the header, `byScreen` decides (open on a laptop); then the choice stays while the panel is on the screen. */
export function usePanelOpen(byScreen: boolean) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? byScreen;
  return [open, () => setToggled(!open)] as const;
}

/** `label`: the text in the header. `show` and `hide`: the tooltip when the panel is closed or open. */
export function PanelHeader({ open, onToggle, label, show, hide }: { open: boolean; onToggle: () => void; label: string; show: string; hide: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      title={open ? hide : show}
      onClick={onToggle}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3 text-left text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex-1">{label}</span>
      {/* A minus closes the panel, a plus opens it. */}
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg border border-b-2 border-border bg-card">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d={open ? "M5 12h14" : "M5 12h14M12 5v14"} />
        </svg>
      </span>
    </button>
  );
}
