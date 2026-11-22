# Prompt log: Dark screen around the tour step

1. Hanif's request (his words):

   "when a new user goes through the tour for the features within a level or a lobby, make everything else dark and focus only on the buttons/things we want to highlight"

## Notes (Claude)

- `components/tour-spotlight.tsx`: a new component. It puts a box with a ring on the control of the step. The box has a very large dark shadow, so all the page is dark, except the control. The box follows the control on each frame (scroll, size change, motion). It goes in a portal on `document.body` at `z-50`, and it does not stop clicks.
- `components/build/tour.tsx` (build mode) and `components/lobby-tour.tsx` (lobby) use it. The ring of each tour is now on the spotlight box. The tour card goes above the dark screen (`z-[60]`).
- No new dependency. No change to `lib/game/tour.ts` or to the text in `content/`.
