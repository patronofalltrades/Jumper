# Prompt log: Presentation setup (issue #210)

1. Hanif's prompt (his words, November 21). It gives the feedback of his supervisor:

   "1. The Product that the AI prompts determined is Same Circuit, three worlds, which is schematic, simulated and physical. Right now in the app, I only see simulated. Maybe I'm not looking in the right place. But we may need to add those two worlds. [...] 3. Personally, I find the choices of exercises a little overwhelming. [...] Do you think we need to strip it down? Or just build a dedicated section for Same Circuit, Three Worlds? [...] Along the same line, the helpful pop-up instructions could also be overwhelming. Maybe think about when those should pop-up. Or make some as a click-on so it remains collapsed unless the user was looking for help. 4. Minor improvement - Navigating within the app can be difficult sometimes. For example, once I entered Arduino foundations, I cannot go back home and try a different exercise."

   "Please prepare for the presentation day and decide for me: how should I use my 5 mins on stage? Should I strip everything down or should I keep all the build?"

2. Claude's answer: keep the full build. The three views are built, but they are behind one button in Arduino Foundations level 2, and level 2 is locked until level 1 passes. Claude recommended a door in the lobby and a Home button before the presentation, and the change to the pop-ups after it, because that change touches the game flow.

3. Hanif's prompt (his words, November 22): "Let's just risk it and touch the game flow. Then also touch the same circuit three worlds build plan. But, make sure to remember that we will rollback after the presentation"

4. The first version (one pull request, so that one revert removes it) had three parts: a Help button that kept the pop-ups closed, a card in the lobby for "Same circuit, three worlds", and a Home button in build mode.

5. Hanif's prompt (his words, November 22): "merge PR and check what changed". Claude found merge conflicts: `main` had quiet build mode (issue #218) and a new Compare views panel (issues #222 and #224). Claude recommended to remove the Help button, because quiet build mode does the same job.

6. Hanif's prompt (his words, November 22): "Drop it an build on top of main"

7. What the pull request has now, on top of `main`:
   - A card in the lobby, "Same circuit, three worlds". It opens `/p/arduino-foundations/2?compare=1`: level 2 with the panel open, also when level 1 did not pass. The test is `tests/three-worlds-door.test.ts`.
   - The button has the name "Three worlds" and the panel has the name "Same circuit, three worlds" (before: "Compare views").
   - A Home button in the header of build mode.

8. Browser check: Supabase is not available in the build container, so Claude used a local route that was not committed. Claude did not test the lobby card and the lock of level 2 with a real account.

## Rollback

Hanif decided that this change is for the presentation only. After the presentation, revert the merge commit of the pull request of issue #210.
