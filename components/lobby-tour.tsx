"use client";

import { Tour } from "@/components/build/tour";
import text from "@/content/ui/tour.json";
import { LOBBY_TOUR_KEY, LOBBY_TOUR_STEPS } from "@/lib/game/tour";

const LOBBY = { steps: LOBBY_TOUR_STEPS, storageKey: LOBBY_TOUR_KEY, label: text.lobby.label, copy: text.lobby.steps };

// The tour for a new user (lib/game/tour.ts): on the first visit to the lobby after the log-in, it shows what Jumper is
// and points at the main controls: the Start card, the top bar, the XP, the profile, Build and the dashboard.
export function LobbyTour() {
  return <Tour tour={LOBBY} />;
}
