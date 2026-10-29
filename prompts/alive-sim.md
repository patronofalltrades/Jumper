# Prompt log: "It's alive" (issue #86)

1. Task for issue #86 on `Feature/ItisAlive!`: "It's alive: Perch comes alive on the 3D board after each level passes". Read the issue, then CLAUDE.md, PLAN.md, the PRD, the TRD and `schema.md`. Write the Vitest tests first and commit them red, then make them green in a separate commit. The text, the emotion names and the triggers go in `content/` as JSON. No new dependency. Hanif opens the PR.

   Decisions that Hanif gave with the task:
   - The effects are per level and they stack. Level 2: the status LED blinks. Level 3: the laptop microphone moves a level meter (an animated meter if the browser refuses the microphone). Level 4: the browser says one line. Level 5: the screen shows the face of Perch. A later level plays the earlier effects again.
   - The effects show on the 3D board (the LED glows and blinks, the ST7789 screen shows the face, a small meter panel is over the board). Then the Level complete pop-up opens.
   - Claude designed the face (HomeView style) and Hanif approved it, with 9 emotions: idle, happy, talking, listening, thinking, surprised, sad, sleepy and excited. The shapes and colors are in the approved script (amber `#F2B705` on `#0E1114`, cheeks `#E26A5B`, tear `#2F6FD6`).
   - The sound of the microphone stays in the browser. The app does not record or save it.

   Claude wrote `tests/alive.test.ts` and `content/alive/perch.json` first (red: the module did not exist), then `lib/game/alive.ts` (green), then the store, the stage panel, the face drawing and the 3D scene.
