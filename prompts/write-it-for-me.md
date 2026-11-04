# Prompt log: Write it for me (issue #145)

1. The task of this session (Nov 3). It came from the planning session as a task text, not as a message that Hanif typed here. It gives Hanif's decisions from the planning session:

   - Learners find the sketch levels hard without C++. The work must be about learning to code.
   - Three features: #143 code glossary, #144 Step by Step mode, #145 "Write it for me".
   - For #145: (1) the button fills in the whole sketch, not one line; (2) the level still passes and the next level opens, only the code XP is lost, the wiring XP stays; (3) today the code step gives no XP, so this issue adds +20 XP for a sketch that the learner writes, and 0 XP when "Write it for me" was used, until the learner changes the code and passes the goal again.
   - Save the +20 one time only, also on a replay (PLAN.md row 24). If this needs a schema change, stop and ask.

2. Claude's question in this session: "Issue #145 (+20 XP for a sketch the learner writes) needs a database change. [...] How should the +20 be saved?" Options: a new parameter of `record_attempt`, a new column `levels.code_xp`, or no database change now.

   Hanif's choice (from the multiple-choice form): "New param (Recommended)".

3. Hanif's prompt (his words): "do adversarial testing on this before I merge"

4. Hanif's decision (his words): "leave the direct-call XP as is, I'll merge"

5. Hanif's prompt (his words): "resolve conflict PR"
