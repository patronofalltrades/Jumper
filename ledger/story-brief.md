# Story brief for the Jumper reflection

This file is source material. It is not the reflection. Hanif writes the reflection in Hanif's own voice. Claude wrote this file from `ledger/LEDGER.md`, `git log` and `PLAN.md`. The words of Claude are in third person. The quotes of Hanif are copied from the ledger without change.

Date of the count: Oct 27, 2026. Repository: https://github.com/patronofalltrades/Jumper

## The numbers

| Item | Count | Source |
| --- | --- | --- |
| Merged pull requests | 45 (at commit aa05e38) | `git log --merges` |
| Commits (no merge commits) | 119 (at commit aa05e38) | `git log --no-merges` |
| Vitest tests | 386 in 27 files | `npx vitest run` |
| Planned features shipped | 13 of 15 | Rows 1 to 13 of "Plan vs. Reality", with 2a and 5a, are 15 planned features. 13 are done. Feature 11 (simulation) is not built. Feature 12 (tests) is partly done (the 67% test is done, the Data isolation test is not). The brief from the coordinating session said 12 of 14. Claude counted again from `PLAN.md`. |
| Unplanned rows | 14 | Rows 14 to 27 of "Plan vs. Reality" |
| Decisions by Hanif in the ledger | 73 | "Decisions by Hanif" (the count is before the Oct 27 line) |
| Corrections and agent issues in the ledger | 39 | "Corrections and agent issues" |

## Possible arc

"I wanted to learn hardware without a bench full of parts. To build it, I had to learn how to manage an AI engineer."

Claude suggests this arc. Hanif can change it or drop it. The arc has two threads:

1. The product thread: a plan, then a working game, then a second project.
2. The management thread: guardrails, tests, and QA that catch what the agent gets wrong.

## Chapter 1. A plan before code

**What occurred.** Oct 15 to 17. Hanif wrote the plan, the PRD and the TRD first, with one prompt log for each. The pitch is in `PLAN.md`: a game that teaches hardware with a 3D breadboard. Hanif then asked Claude to compare the Solo App brief with the repository. Claude listed 7 gaps.

**Evidence.**
- Plan, PRD and TRD: https://github.com/patronofalltrades/Jumper/pull/4, https://github.com/patronofalltrades/Jumper/pull/5, https://github.com/patronofalltrades/Jumper/pull/6
- CLAUDE.md and README: https://github.com/patronofalltrades/Jumper/pull/8

**Hanif's words.**
- Oct 16: "I want to understand hardware without buying a bench full of parts."
- Oct 17: "Before moving on, read the prompt first"

**For Hanif.**
- What did you decide in the plan that you kept until the end? What did you drop?
- What did you not know about hardware when you wrote the plan?

## Chapter 2. Guardrails for the agent

**What occurred.** Oct 18. Hanif put rules into hooks: no push to `main`, no merge, no approval, a flag on each PR comment, and a ledger. Hanif corrected Claude about shadcn/ui. Hanif also set the rule that Hanif makes every issue, branch and PR.

**Evidence.**
- Hook and rule changes: https://github.com/patronofalltrades/Jumper/pull/8
- The first feature, with a rule broken on the way: https://github.com/patronofalltrades/Jumper/issues/9
- Later, Claude pushed to a branch that the cloud session made. Hanif caught it on Oct 21. See "Corrections" in `ledger/LEDGER.md`.

**Hanif's words.**
- Oct 18: "this is wrong, add shadcn ui into the packages. This is not a skill."
- Oct 18: "do not merge PRs, do not open branches, do not start issues. All of these have to be done by me."
- Oct 21: "which branch is this? we can't work on a random branch, every feature needs to be documented and worked in a formal way"
- Oct 18: Hanif wants the reflection "purely in my voice" and asked Claude to keep a ledger instead of writing it.

**For Hanif.**
- Which rule did you add after the agent broke it? Which rule did you add before?
- Did the hooks change how you wrote prompts?

## Chapter 3. The sprint of Oct 18

**What occurred.** In one day, features 1 to 7 and feature 10 moved from issue to PR: sign-up and login, the data model, the lobby, the 3D breadboard, module placement, build mode, the level check, snapshots, validation and the dashboard. Hanif tested on a Mac, ran migrations in the Supabase SQL Editor, and set up Vercel and Supabase. The live URL is https://jumper-inky-sigma.vercel.app/.

**Evidence.**
- Login: https://github.com/patronofalltrades/Jumper/issues/9, https://github.com/patronofalltrades/Jumper/pull/10
- Data model: https://github.com/patronofalltrades/Jumper/issues/11, https://github.com/patronofalltrades/Jumper/pull/12
- Lobby: https://github.com/patronofalltrades/Jumper/issues/13, https://github.com/patronofalltrades/Jumper/pull/14
- 3D breadboard: https://github.com/patronofalltrades/Jumper/issues/15, https://github.com/patronofalltrades/Jumper/pull/16
- Modules: https://github.com/patronofalltrades/Jumper/issues/17, https://github.com/patronofalltrades/Jumper/pull/18
- Build mode: https://github.com/patronofalltrades/Jumper/issues/19, https://github.com/patronofalltrades/Jumper/pull/21
- Level check: https://github.com/patronofalltrades/Jumper/issues/25, https://github.com/patronofalltrades/Jumper/pull/26
- Snapshots: https://github.com/patronofalltrades/Jumper/issues/23, https://github.com/patronofalltrades/Jumper/pull/24

**Hanif's words.**
- Oct 18: "awesome! It's working."
- Oct 18: "I have tested enough so we acn proceed"
- Oct 18: "are we using vercel? I don't think we have set up anything"
- Oct 18: "let's add CI workflows. That is easier to parse and understand for the professor and the GSI"

**For Hanif.**
- Which step of the sprint was slowest for you, and why?
- What did you check yourself, and what did you let Claude check?
- When did the first test on the Mac change your plan?

## Chapter 4. The agent was wrong about hardware

**What occurred.** Hanif was not sure about the pin orders of the parts. Claude checked 4 pin layouts against the real board files. Claude had made 2 of them wrong: the INMP441 mic was one row of 6 pins (the real board has 2 rows of 3), and the speaker terminal of the MAX98357A had + and - swapped. A second bug showed that the amplifier output could drive current into an ESP32-S3 pin, and the checker did not see it.

**Evidence.**
- Module placement: https://github.com/patronofalltrades/Jumper/issues/17, https://github.com/patronofalltrades/Jumper/pull/18
- Build mode (amplifier fix and the `esp_line` rule): https://github.com/patronofalltrades/Jumper/pull/21
- Details: "Corrections and agent issues", Oct 18, in `ledger/LEDGER.md`.

**Hanif's words.**
- Oct 18: "I am not sure as I am still learning about the hardware, so can you help check the pin orders?"
- Oct 18: Hanif chose "Fix it in this PR" for the amplifier.

**For Hanif.**
- How did you decide that a pin layout was right when you could not tell yourself?
- What did this teach you about trust in an agent that writes about hardware?

## Chapter 5. The beginner wall, Oct 21 to 22

**What occurred.** Hanif tried level 1 and could not pass the first step. The text used technical words, and the screen did not show where to click. Claude rewrote the text in very simple words, added a bouncing arrow and a "Nice! Here is what happened" pop-up, and a task list. Hanif also found that the Continue card cut off a long level name.

**Evidence.**
- Beginner guidance: https://github.com/patronofalltrades/Jumper/issues/38, https://github.com/patronofalltrades/Jumper/pull/39
- Continue card: https://github.com/patronofalltrades/Jumper/issues/51, https://github.com/patronofalltrades/Jumper/pull/53
- Task checklist: https://github.com/patronofalltrades/Jumper/issues/52, https://github.com/patronofalltrades/Jumper/pull/55, https://github.com/patronofalltrades/Jumper/pull/56

**Hanif's words.**
- Oct 21: "Right now, the whole of Jumper's instruction is still using technical language that is hard for me to follow."
- Oct 21: "I am not able to go through the first step because I don't know what a breadboard is and I don't know what to do with the board."
- Oct 22: "the text is cut off on the first image"
- Oct 22: "I wish I had a list of steps that I can track in order for me to know what to do. In this level, I don't have a to-do list which is very confusing for me"
- Oct 22: "im stuck on this page because there is no way to exit it or to close the pop up"

**For Hanif.**
- You are the first learner of your own app. What did that change?
- Which of your complaints led to the biggest change in the product?

## Chapter 6. Proof, red and green

**What occurred.** The assignment needs a test with a red run and a green run. Hanif asked for CI in GitHub Actions because it is easy for the professor and the GSI to read. The first attempt failed because the PR was already merged when the red commit came. Hanif refused a branch only for the proof, and chose the dashboard test (67% first-try pass rate) for PR #32. Hanif set the order: wait for the green run, then push red, then push green.

**Evidence.**
- CI: https://github.com/patronofalltrades/Jumper/pull/22
- Dashboard and the 67% test: https://github.com/patronofalltrades/Jumper/issues/28, https://github.com/patronofalltrades/Jumper/pull/32
- Open item: the Data isolation test (section 4, test 1 of `PLAN.md`) is not in the repository yet.

**Hanif's words.**
- Oct 18: "wait I think that screenshot should be the testing on Github's page no?"
- Oct 18: "is this the green success test that we are looking for?"
- Oct 18: "I don't agree with opening another branch for only that."
- Oct 19: "wait the green run is still in progress"
- Oct 19: "would these be enough?"

**For Hanif.**
- Why did the 67% test explain your work better than the first idea?
- What would a real change look like that makes the 67% test fail?

## Chapter 7. QA as a separate step, Oct 24 to 25

**What occurred.** Hanif asked Claude to write test plans and run end-to-end tests. The audit found bugs. Hanif made issues #61 to #65 and opened one session for each. The fixes: a Chrome 153 crash, an Undo false Mistake, a replay Check that opened Level complete, a second user who saw the first user's board, and a Check that missed the earlier levels. Hanif ran the migration for #62 in the Supabase SQL Editor.

**Evidence.**
- Chrome crash: https://github.com/patronofalltrades/Jumper/issues/61, https://github.com/patronofalltrades/Jumper/pull/66
- Replay Check: https://github.com/patronofalltrades/Jumper/issues/62, https://github.com/patronofalltrades/Jumper/pull/68
- Undo and remove: https://github.com/patronofalltrades/Jumper/issues/63, https://github.com/patronofalltrades/Jumper/pull/67
- Second user: https://github.com/patronofalltrades/Jumper/issues/64, https://github.com/patronofalltrades/Jumper/pull/69
- Check with earlier levels: https://github.com/patronofalltrades/Jumper/issues/65, https://github.com/patronofalltrades/Jumper/pull/70

**Hanif's words.**
- Oct 24: "can you write test plans and run end to end tests for all the available modules, features, and functions of the app?"
- Oct 24: "Create issues for the top 5 on Github."
- Oct 24: "Open separate sessions to work on each issues (61-65) on their respective branches. Read documentation before touching any code."
- Oct 24: "migration successfully ran"
- Oct 25: "replay check on the live app for me and do your QA"
- Oct 25: "can you close and fix them in the same branch?"

**For Hanif.**
- Why did you ask for QA as its own step and not inside each feature?
- Which bug of the five would a real learner have met first?

## Chapter 8. Beyond the plan

**What occurred.** The plan had Arduino Foundations as a "Coming soon" card. It is now a project with 4 wiring levels and a code step that runs on the 3D board. Home page, walkthrough video, mascot, profile, stars and find were not all in the first plan, and Hanif added them as rows 14 to 27 of "Plan vs. Reality". Feature 11 (the "It's alive" simulation of Perch) is not built.

**Evidence.**
- Home page: https://github.com/patronofalltrades/Jumper/issues/46, https://github.com/patronofalltrades/Jumper/pull/47
- Walkthrough: https://github.com/patronofalltrades/Jumper/issues/48, https://github.com/patronofalltrades/Jumper/pull/50, https://github.com/patronofalltrades/Jumper/issues/49, https://github.com/patronofalltrades/Jumper/pull/54
- Mascot: https://github.com/patronofalltrades/Jumper/issues/44, https://github.com/patronofalltrades/Jumper/pull/45
- Profile: https://github.com/patronofalltrades/Jumper/issues/34, https://github.com/patronofalltrades/Jumper/pull/35, https://github.com/patronofalltrades/Jumper/issues/36, https://github.com/patronofalltrades/Jumper/pull/37
- Arduino Foundations: https://github.com/patronofalltrades/Jumper/pull/59, https://github.com/patronofalltrades/Jumper/pull/60

**Hanif's words.**
- Oct 18: "Alright so we're using the things we will be working on as card heroes" (the first decision about the mascot; the mascot came back as row 16.)
- Oct 22: "add the playwright skill as dependency"
- Oct 24: "continue with this build"

**For Hanif.**
- Which unplanned feature do you think was the right call? Which one cost the most time?
- What did you cut, and what did the cut order in the plan tell you?

## Recurring patterns

Claude saw these in the ledger. Hanif can accept or reject each one.

- Hanif reads the docs rule first: most prompts say "read documentation before touching any code".
- A bug that Hanif found by using the app came before a bug that a test found. Then a QA step found more.
- Claude found bugs in its own code during browser checks (layout, touch, pin layouts).
- Claude stopped its own shell with `pkill -f` or `kill` more than once. The ledger records each time (Oct 18, 21, 22 and 24).
- Hanif chose between 2 or 3 options that Claude gave, with short answers ("Content", "Both", "Temp test account").
- A temporary test account on the real Supabase project was made and deleted many times, each time after Hanif said yes.

## Before you submit

Check this list against the assignment rules in `CLAUDE.md`.

- [ ] Rule 1: each issue includes the user story from `PLAN.md`.
- [ ] Rule 3: the PR that adds a required test has a plain-English explanation, a red and a green screenshot, and one sentence about a real change that makes the test fail.
  - 67% test: PR #32 has this.
  - **Data isolation test: not in the repository.** Feature 12 in "Plan vs. Reality" says Backlogged. Decide: build it, or say in the reflection why it is not built.
- [ ] Rule 4: if you found a bug that the agent made, the PR text says what occurred, how you found it and how it was repaired. The ledger lists bugs that Hanif found: the `Date.now()` error (Oct 18, issue #9) and the stuck "All tasks are done" card (Oct 22, issue #52) and the false `main` check (Oct 22). Check that the PR text of each one has the "Bug found by Hanif" part.
- [ ] Rule 5: the live URL shows the current version after the last merge: https://jumper-inky-sigma.vercel.app/
- [ ] Rule 6: `schema.md` compares the built schema with section 3 of `PLAN.md`.
- [ ] Rule 7: 9 or more merged PRs (yes: see "The numbers") and **5 or more real entries of your data by Nov 4, 2026. Hanif to check:** make 5 or more real entries in the live app (for example snapshots with real notes). No placeholder text.
- [ ] Rule 2: `PLAN.md` has only added table rows. Run `git diff aa05e38 -- PLAN.md` and check that each changed line starts with `|`.
- [ ] The "Learning" column of "Plan vs. Reality" is empty. Write it yourself.
- [ ] The reflection is in your own voice.
