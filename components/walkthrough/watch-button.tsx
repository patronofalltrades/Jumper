"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import type { Clip } from "@/lib/game/walkthrough";

/** The clip player loads three.js, so it loads only when a clip opens. */
export const ClipPlayer = dynamic(() => import("./clip-player"), { ssr: false });

/** A button that opens a walkthrough clip. When the clip closes, the focus goes back to the button. */
export function WatchButton({ clip, title, label, className, children }: { clip: Clip; title: string; label: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={button} type="button" aria-label={label} title={label} onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <ClipPlayer
          clip={clip}
          title={title}
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        />
      )}
    </>
  );
}

/** The play icon of the Watch buttons. */
export const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4v16l13-8z" />
  </svg>
);
