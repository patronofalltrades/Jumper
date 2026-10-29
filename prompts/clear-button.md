# Prompt log: Clear button beside Check (issue #114)

1. Hanif's request for the batch #111 to #115 (his words):

   "I can't run it, so let's just focus on something else:

   1. I realized that level 1 builds on level 2, and level 2 builds on level 3, and so on. The problem with this is that if we erase all the builds of level 1, it will be hard to progress to level 3 when we are doing level two.
   2. Therefore, users should have the following features
      1. They should be able to work on level 2 based on component presets that are level one builds. They should be able to just press a button that places all the entire level 1 build when they erase all components coming into level two
      2. Level one should build on a specific template so that when level two comes into play, level one's build is still there. This applies to all the levels
      3. The panels on the right side should be collapsible, especially the connection one
      4. One thing that could be very helpful is a hologram of where to put the components for the tasks and the connection. For example: on connections, we have red + line → red + line. Hovering your cursor above it should show on the board where the connection ideally happens. Same with tasks: Done:
   Put the light (LED) on breadboard A. Put its long leg (+) in the same column as the free leg of the resistor. Put its short leg (−) in the next column, in the same row task should show a hologram of what it visually looks like on the board when you hover your cursor over it
      5. Beside a check button, there should be a clear button to clear all the components that we have put so far. 
      6. Beside the check and the clear button, there should be a button that simulates the final build for the level. It does not give you XP and does not solve the board but it automatically builds your board based on the tasks. This is programmatic and follows the same build pattern. When a user opts for this, clear all components they have put on the board and then start from zero"

2. Hanif's answers to Claude's questions (his choices from a multiple-choice form):

   - Start board: "Own board, preset as backup"
   - Build it for me: "Show, then clear"
   - Workflow: "Yes, issues and PRs"

Claude's work for #114 (not Hanif's words): this issue is item 5. Red tests first for the `clear` store action, then the action and the button row. See the ledger for the details.
