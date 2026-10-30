"use client";

import { useEffect, type ComponentProps, type PointerEvent } from "react";
import { boardStore } from "@/lib/game/board-store";
import type { HologramTarget } from "@/lib/game/hologram";
import { cn } from "@/lib/utils";

// A row of the task list or the connection list with a hologram (issue #113). The pointer on the row, or keyboard focus,
// shows the ghost of the row on the board. A phone has no hover, so a tap shows the ghost for TAP_MS.

const TAP_MS = 3000;
let tapTimer: ReturnType<typeof setTimeout> | undefined;

const same = (a: HologramTarget | null, b: HologramTarget) => JSON.stringify(a) === JSON.stringify(b);
const show = (target: HologramTarget) => {
  clearTimeout(tapTimer);
  boardStore.getState().setHologram(target);
};
/** Hides the ghost only when it is the ghost of this row: the pointer can be on the next row already. */
const hide = (target: HologramTarget) => {
  if (same(boardStore.getState().hologram, target)) boardStore.getState().setHologram(null);
};

/** A list row. With a `target`, it shows that ghost; with none, it is a plain row. */
export function HologramRow({ target, className, ...props }: ComponentProps<"li"> & { target: HologramTarget | null }) {
  const key = JSON.stringify(target);
  // A row that goes (the list closes, the level changes) takes its ghost with it.
  useEffect(() => {
    const t = JSON.parse(key) as HologramTarget | null;
    return () => {
      if (t) hide(t);
    };
  }, [key]);
  if (!target) return <li className={className} {...props} />;
  const mouse = (e: PointerEvent) => e.pointerType !== "touch";
  return (
    <li
      tabIndex={0}
      onPointerEnter={(e) => mouse(e) && show(target)}
      onPointerLeave={(e) => mouse(e) && hide(target)}
      onPointerUp={(e) => {
        if (mouse(e)) return;
        show(target);
        tapTimer = setTimeout(() => hide(target), TAP_MS);
      }}
      // On a phone the row gets focus after the tap: keep the timer of the tap.
      onFocus={() => !same(boardStore.getState().hologram, target) && boardStore.getState().setHologram(target)}
      onBlur={() => hide(target)}
      className={cn("cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  );
}
