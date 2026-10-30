# UX polish: 6 issues (Oct 30)

Hanif's prompt (his words): "Create issues for these ideas: 1. Level map 2. First visit 3. Hearts at zero 4. Feedback after pass 5. Phone Layout 6. Dashboard (top mistakes counter, dictionary for terms learned, flashcard (coming soon)"

Each issue copies its user story from `PLAN.md` (assignment rule 1). Branch names follow house rule 2.

---

## Issue A. Lobby: the Perch card opens the level map

**Branch:** `feature/card-to-map`

**User story (PLAN.md row 2a):** As a learner, after I log in I want to land in a lobby that shows the project catalog as cards, my XP, and a "Continue Perch" button that takes me back to the level I was on. Perch opens; the other projects and features show a "Coming soon" badge and can't be started.

**User story (PLAN.md row 5):** As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

**Changed:** When I tap the Perch card in the lobby, I want to go to the level map first, so that I see where I am on the path before I build.

**Problem:** The lobby card links to `/p/perch/<level>` (`lib/game/featured.ts`). The learner goes into the level and does not see the map. The dock's Build button (`app/play/route.ts`) does the same.

**Acceptance:**
- [ ] A tap on the card body opens `/p/<project>` (the level map).
- [ ] The round ▶ button on the card still opens the current level (row 2a).
- [ ] The map scrolls to the current level, and the current level pulses.
- [ ] The dock's Build button opens the map.
- [ ] A Vitest test for the card links.

---

## Issue B. Build mode: a short tour on the first visit

**Branch:** `feature/first-visit-tour`

**User story (PLAN.md row 18):** As a learner who has never built a circuit, I want each step in very simple words, a cue that shows where to click or tap, and a short note after each step about what I just did, so that I can finish a level without knowing technical words.

**Changed:** The first time I open build mode, I want a short tour of the screen (the task list, the connection list, Check, Clear and Build it for me), so that I know what each control does before I start.

**Acceptance:**
- [ ] The tour shows one time for each account. Its state is kept in `profiles` (or in `localStorage` if Hanif chooses no migration).
- [ ] 4 or 5 steps, each points at one control. Skip and Next buttons.
- [ ] The tour text is in `content/ui/` as JSON (house rule 7).
- [ ] The profile page has "Show the tour again".
- [ ] It works on a phone in portrait.

---

## Issue C. Check: tell the learner what happens at zero hearts

**Branch:** `feature/hearts-at-zero`

**User story (PLAN.md row 5a):** As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt.

**Changed:** When I lose my last heart, I want a clear message that tells me what occurs now and how to get my hearts back, so that a fail does not feel like a dead end.

**Problem:** At 0 hearts, the next fail fills the hearts again with no message (`lib/game/hearts.ts`: 3, 2, 1, 0, 3, 2…). The learner does not know this.

**Acceptance:**
- [ ] At 0 hearts, a card (with the mascot) tells the learner what occurred and the choices: "Try again" (hearts back to 3), "Watch the level clip", "Build it for me".
- [ ] The text is in `content/ui/build.json`.
- [ ] A Vitest test for the hearts rule and the card state.

---

## Issue D. Level map: show progress after a pass

**Branch:** `feature/pass-progress`

**User story (PLAN.md row 5):** As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

**Changed:** After a level passes and I go back to the map, I want to see my marker move to the next level and the XP count go up, so that I feel that I moved forward.

**Acceptance:**
- [ ] After Level complete, the map plays a short animation: the passed level gets its check mark, the path fills, and the next level opens.
- [ ] The XP number counts up to the new value.
- [ ] The animation plays one time for each pass, not on each visit.
- [ ] `prefers-reduced-motion` shows the end state with no animation.

---

## Issue E. Build mode: a phone layout that keeps the board clear

**Branch:** `feature/phone-layout`

**User story (PLAN.md row 3):** As a learner, I want to click two holes to place a wire, resistor or LED on a 3D breadboard holding an ESP32-S3, so that I can wire the way I would on a real bench. Hovering a hole lights up everything connected to it.

**Changed:** On a phone, I want the panels to stay small until I open them, so that the board fills most of the screen and I can tap the holes.

**Problem:** On a phone in portrait, the guide bar, the task list, the connection list and the button row (Check, Clear, Build it for me) cover a large part of the board.

**Acceptance:**
- [ ] Below 640 px, the task list and the connection list start closed (as a chip).
- [ ] The button row fits on one line, or goes into a bottom sheet.
- [ ] The board has 60% or more of the screen height.
- [ ] Playwright screenshots at 390 x 844 before and after.

---

## Issue F. Dashboard: top mistakes, terms I learned, flashcards (Coming soon)

**Branch:** `feature/dashboard-learning`

**User story (PLAN.md row 10):** As a learner, I want to see levels completed, completed sessions, XP and first-try pass rate, plus a chart of the mistakes I make most, so that I know what to practice.

**Changed:** I also want (1) a count of my top mistakes with a link to the level to practise, (2) a dictionary of the terms that I learned in the levels that I passed, and (3) a Flashcards card marked "Coming soon", so that the dashboard helps me study.

**Acceptance:**
- [ ] Top mistakes: the 3 most frequent fail reasons, with the count and a "Practise" link to the level where each occurred.
- [ ] Dictionary: each term (for example GPIO, ground, 3V3, I2S) with a simple definition. The terms are in `content/` as JSON, and each is tied to the level that teaches it. Only the terms of passed levels show.
- [ ] Flashcards: a disabled card with the "Coming soon" badge.
- [ ] The count and the term list are pure functions in `lib/stats`, with Vitest tests (house rule 6).
