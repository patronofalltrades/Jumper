"use client";

import type { ReactNode } from "react";
import { Tour } from "@/components/tour";
import text from "@/content/ui/tour.json";
import { LOBBY_TOUR_KEY, LOBBY_TOUR_STEPS } from "@/lib/game/tour";

// The tour for a new user: on the first visit to the lobby after the log-in, it shows what Jumper is and points at the
// main controls (the Start card, the top bar, the XP, the profile, Build and the dashboard). Each control is a <TourStep>.
export function LobbyTour({ children }: { children: ReactNode }) {
  return (
    <Tour steps={LOBBY_TOUR_STEPS} storageKey={LOBBY_TOUR_KEY} copy={text.lobby}>
      {children}
    </Tour>
  );
}
