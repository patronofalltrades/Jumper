"use client";

import type { ReactNode } from "react";
import { logOut } from "@/app/actions/auth";
import { boardStore } from "@/lib/game/board-store";

/** The Log out form. It empties the board in memory first, so the next user on this tab does not see it (issue #64). */
export function LogOutForm({ children }: { children: ReactNode }) {
  return (
    <form
      action={async () => {
        boardStore.getState().reset();
        await logOut();
      }}
    >
      {children}
    </form>
  );
}
