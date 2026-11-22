# Prompt log: Presentation setup (issue #210)

1. Hanif's prompt (his words, November 21). It gives the feedback of his supervisor:

   "1. The Product that the AI prompts determined is Same Circuit, three worlds, which is schematic, simulated and physical. Right now in the app, I only see simulated. Maybe I'm not looking in the right place. But we may need to add those two worlds. [...] 3. Personally, I find the choices of exercises a little overwhelming. [...] Do you think we need to strip it down? Or just build a dedicated section for Same Circuit, Three Worlds? [...] Along the same line, the helpful pop-up instructions could also be overwhelming. Maybe think about when those should pop-up. Or make some as a click-on so it remains collapsed unless the user was looking for help. 4. Minor improvement - Navigating within the app can be difficult sometimes. For example, once I entered Arduino foundations, I cannot go back home and try a different exercise."

   "Please prepare for the presentation day and decide for me: how should I use my 5 mins on stage? Should I strip everything down or should I keep all the build?"

2. Claude's answer: keep the full build. The three views are built, but they are behind one button in Arduino Foundations level 2, and level 2 is locked until level 1 passes. Claude recommended a door in the lobby and a Home button before the presentation, and the change to the pop-ups after it, because that change touches the game flow.

3. Hanif's prompt (his words, November 22): "Let's just risk it and touch the game flow. Then also touch the same circuit three worlds build plan. But, make sure to remember that we will rollback after the presentation"

4. What Claude built, in one pull request, so that one revert removes it:
   - A Help button in the header of build mode, off by default. With Help off, the level clip, the first-visit tour, the "New word" pop-up, the "what happened" pop-up and the pop-up of a task stay closed. The intro, a mistake and the Check card show as before. The rules are in `lib/game/help.ts`, with tests in `tests/help.test.ts`.
   - A card in the lobby, "Same circuit, three worlds". It opens `/p/arduino-foundations/2?compare=1`: level 2 with the panel open, also when level 1 did not pass.
   - The button and the panel have the name "Same circuit, three worlds" (before: "Compare views").
   - A Home button in the header of build mode.

5. Browser check: Supabase is not available in the build container, so Claude used a local route that was not committed. On a laptop screen, Playwright showed: Help is off at the start and no clip opens; the Home link is there; the panel is open after Start; with Help on, the "New word" pop-up and the level clip open again, and the choice stays after a reload. Claude did not test the lobby card and the lock of level 2 with a real account, and did not run the end-to-end tests in `e2e/`, which expect the pop-ups.

## Rollback

Hanif decided that this change is for the presentation only. After the presentation, revert the merge commit of the pull request of issue #210.
