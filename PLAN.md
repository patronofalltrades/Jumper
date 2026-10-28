# PLAN.md — Jumper

> Draft for review. Every decision below is mine to confirm or change before this PR merges.

## 1. Pitch

I'm building **Jumper**, a web app where you learn how to wire boards and learn about hardware engineering, because I want to understand hardware without buying a bench full of parts. Jumper gives students multiple board options (Arduino, ESP32 and more) and guides them through hardware engineering, all in their pocket.

The 3D breadboard is Jumper's main selling point. Instead of carrying around physical breadboards, you can find all the hardware components you need to build something you want in real life. Jumper offers a set of classes that take you from foundations to real labs. You can also gain XP, share your latest builds with friends, and collaborate on your next big project.

For this course, the first playable lab is **Perch**: a desk device that gives an AI agent a home (ears, voice, face), wired on a 3D ESP32-S3 breadboard one step at a time.

**How often I'll use it:** 3 times a week.

The app opens on a **catalog of hardware projects**. Perch is the one that's playable now; the others are listed as "Coming soon" so the app has room to grow.

Everything is digital. The parts are modeled on real ones (ESP32-S3-DevKitC-1, INMP441 mic, MAX98357A amplifier, ST7789 1.54" screen), and the pin assignments follow a published breadboard kit, so what I learn carries over to real hardware.

## 2. Features (user stories, in build order)

| # | Feature | User story | Type |
|---|---|---|---|
| 0 | Plan | This document, merged before any feature PR. | — |
| 1 | Sign up and login | As a new visitor, I want to create an account, log in and log out, so that my builds are mine. | Spine 1 |
| 2 | Data model | As the app, I want users, projects, steps, tasks, sessions, snapshots, attempts and stars tables with seeded project, level and task data, so that every feature has somewhere to store things. | Spine 2 |
| 2a | Lobby | As a learner, after I log in I want to land in a lobby that shows the project catalog as cards, my XP, and a "Continue Perch" button that takes me back to the level I was on. Perch opens; the other projects and features show a "Coming soon" badge and can't be started. | Lobby UI |
| 3 | 3D breadboard editor | As a learner, I want to click two holes to place a wire, resistor or LED on a 3D breadboard holding an ESP32-S3, so that I can wire the way I would on a real bench. Hovering a hole lights up everything connected to it. | My feature A |
| 4 | Module placement | As a learner, I want to drop multi-pin modules (button, mic, amplifier, screen) onto the board, so that I can build the full device. | My feature A (part 2) |
| 5 | Build mode with guided pop-ups | As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. | My feature B |
| 5a | Level check | As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt. | My feature B (part 2) |
| 6 | Snapshots | As a learner, I want to save my board as a snapshot with a title, step and notes, list my snapshots, open one in a view-only 3D page, edit its notes, and delete it after confirming, so that I keep a lab notebook of my build. | Spine 3 |
| 7 | Validation | As a learner, if I save a snapshot without a title or step, I want a friendly message telling me what's missing. I also can't press Check on an empty board. | Spine 4 |
| 8 | Stars | As a learner, I want to star snapshots and see a Starred view, so that I can find the builds I want to revisit. | Spine 5 |
| 9 | Find | As a learner, I want to search my snapshot notes, filter by step or passed/failed, and sort by newest or most mistakes. | Spine 6 |
| 10 | Dashboard | As a learner, I want to see levels completed, completed sessions, XP and first-try pass rate, plus a chart of the mistakes I make most, so that I know what to practice. | Spine 7 |
| 11 | "It's alive" simulation | As a learner, when a step passes I want Perch to come alive: the LED blinks, my laptop mic drives a level meter, the browser speaks, and the screen shows a face. | My feature C |
| 12 | Tests | Data isolation and dashboard stat tests (section 4). | Required |
| 13 | Docs | schema.md and README.md. | Required |

### Future work, shown in the app as "Coming soon"

These are part of the Jumper vision but are **not built** in this assignment. They appear in the app as visible, disabled features with a "Coming soon" badge, so users can see where Jumper is going:

- **Share builds with friends:** a Share button on each snapshot opens a "Coming soon" note.
- **Collaborate on a project:** an "Invite a collaborator" entry on the project page, marked "Coming soon".
- **More boards and classes:** the extra catalog cards below (Arduino and other ESP32 projects).

### Project catalog (seeded in the `projects` table)

| Project | Board | What it teaches | Status |
|---|---|---|---|
| **Perch**: a home for your AI agent | ESP32-S3 | Power, buttons, I²S audio in/out, SPI screen | **Available** |
| Arduino Foundations | Arduino Uno | Breadboard basics, Ohm's law, LEDs and buttons | Coming soon |
| Desk weather station | ESP32 DevKit V1 | Sensors, pull-up resistors, I²C screen | Coming soon |
| Plant-watering monitor | ESP32 DevKit V1 | Analog input, relays, powering a pump | Coming soon |
| Focus timer with buzzer | ESP32-C3 | PWM sound, buttons, LED patterns | Coming soon |
| Line-following robot | ESP32 DevKit V1 | Motor drivers, IR sensors, separate motor power | Coming soon |

"Coming soon" is a status column on the project, not separate code, so opening a new project later means adding its steps and switching its status to available.

### How build mode works (the same for every project)

Perch is the example, but every project and every level runs on the same build mode. A new project only adds data (levels, tasks, pop-up text), never new game code.

- **Level map:** a project's levels sit on a path, like Duolingo. A level unlocks when the one before it passes, and each finished level visibly adds to the device being built.
- **Pop-ups guide every move.** In build mode, a pop-up anchored to the 3D board shows where the next part or wire goes. The pop-ups are the core of the learning, not decoration. Each one says **what** to do, **where** (the target pin and holes glow), and **why**. For example: *"This is WS (word select). It tells the mic when to switch between left and right audio. Connect it to GPIO 4."*
- **Four kinds of pop-up:**
  1. **Place:** where a part sits on the breadboard and why (e.g. straddling the center gap so its pins aren't shorted together).
  2. **Wire:** from which pin to which pin, and what that connection does.
  3. **Concept:** shown the first time an idea appears (power rails, pull-up resistor, I²S, SPI), in 2–3 sentences.
  4. **Mistake:** when a wire is wrong, a pop-up explains what that wire would actually do (e.g. "this shorts 3.3 V to ground") and how to fix it.
- **One task at a time:** a correct wire snaps in with a green flash and the next pop-up appears; a wrong one buzzes and opens a Mistake pop-up.
- **Rewards:** XP for each task, a bonus for finishing a level with no mistakes, and hearts lost only on a failed level Check.
- **Level complete:** a summary screen shows XP earned and mistakes made, and offers **Save snapshot**, which saves the board to my lab notebook.

### The Perch build: 5 levels (seeded in `steps`, each split into tasks in `tasks`)

| Level | What I wire | Required connections (ESP32-S3 pin → part) |
|---|---|---|
| 1. Set up the board | Place two 400-hole breadboards side by side, seat the ESP32-S3 across them, power the rails | 3V3 → + rail, GND → − rail, and the rails bridged between the two breadboards |
| 2. Talk button + status light | Pushbutton, 220 Ω resistor, LED | GPIO 1 → button → GND (internal pull-up); GPIO 2 → 220 Ω → LED + leg, LED − leg → GND |
| 3. Ears | INMP441 I²S mic | VDD → 3V3, GND → GND, L/R → GND, WS → GPIO 4, SCK → GPIO 5, SD → GPIO 6 |
| 4. Voice | MAX98357A amp + speaker | Vin → 3V3, GND → GND, SD → Vin, DIN → GPIO 7, BCLK → GPIO 15, LRC → GPIO 16; speaker → amp +/− |
| 5. Face | ST7789 1.54" SPI screen | VCC → 3V3, GND → GND, SCL → GPIO 21, SDA → GPIO 47, RES → GPIO 45, DC → GPIO 40, CS → GPIO 41, BLK → GPIO 42 |

**Example tasks, Perch Level 3 (Ears).** Each one opens its own pop-up. The first also opens a Concept pop-up on I²S.
1. Place the INMP441 mic on breadboard B.
2. Connect VDD to the 3.3 V rail.
3. Connect GND to the GND rail.
4. Tie L/R to GND. (Lesson: this picks the left audio channel.)
5. Wire WS → GPIO 4.
6. Wire SCK → GPIO 5.
7. Wire SD → GPIO 6.
8. Press Check.

Levels 3–5 follow Keyestudio's published wiring for its ESP32-S3 breadboard AI chatbot kit. The checker compares **connections, not exact holes**, so any valid layout passes. Each step's rules are data in the `steps` table, so adding a step means adding data, not new code.

## 3. Database

| Table | Columns (type) | Keys and relationships |
|---|---|---|
| **users** | id (text, from auth), display_name (text), created_at (date) | PK id |
| **projects** | id (number), slug (text), title (text), tagline (text), board (text), status (text: available / coming_soon), position (number) | PK id. Shared content, readable by everyone |
| **steps** | id (number), project_id (number), position (number), title (text), goal (text), rules (text, JSON list of required and forbidden connections), xp (number) | PK id; FK project_id → projects. Shared content, readable by everyone |
| **tasks** | id (number), step_id (number), position (number), kind (text: place / wire), instruction (text), popup_why (text, the explanation shown in the pop-up), concept (text, blank unless this task introduces one), target (text, JSON: the part placement or connection this task checks), xp (number) | PK id; FK step_id → steps. Shared content, readable by everyone |
| **snapshots** (main item) | id (text), user_id (text), step_id (number), title (text), notes (text), wiring (text, JSON list of parts and wires), passed (true/false), mistake_count (number), created_at (date), updated_at (date) | PK id; FK user_id → users; FK step_id → steps |
| **sessions** | id (text), user_id (text), step_id (number), status (text: in_progress / completed / abandoned), started_at (date), ended_at (date), tasks_done (number), mistakes (number), xp_earned (number) | PK id; FK user_id → users; FK step_id → steps |
| **attempts** | id (text), user_id (text), session_id (text), step_id (number), passed (true/false), mistake_type (text, blank if passed), created_at (date) | PK id; FK user_id → users; FK session_id → sessions; FK step_id → steps |
| **stars** | user_id (text), snapshot_id (text), created_at (date) | PK (user_id, snapshot_id); FKs to users and snapshots |

Relationships:
- one project → many steps
- one step (level) → many tasks
- one user → many sessions, snapshots and attempts; one session → many attempts
- a session is **completed** when every task in the level is done and the level Check passes; one left before that is saved as abandoned
- one step → many snapshots, many attempts
- users ↔ snapshots many-to-many through **stars** (one table for everyone)

The board I'm currently wiring autosaves in the browser. **Save snapshot** is what writes it to the database.

```
projects 1──* steps 1──* tasks
users 1──* sessions *──1 steps
users 1──* snapshots *──1 steps
  │            │
  │            └──* stars *──1 users
  └──* attempts *──1 steps
```

## 4. Tests

1. **Data isolation:** Given User A has saved a snapshot titled "Ears wired", when User B logs in and opens their snapshot list or requests A's snapshot by its ID, then B's list is empty and the direct request returns "not found".
2. **Dashboard stat:** Given a user's first attempt passed on step 1, failed on step 2 (then passed on retry), and passed on step 3, when the dashboard calculates first-try pass rate, then it shows 67% (2 of 3 steps passed on the first attempt).

## 5. Technologies

| Choice | Why |
|---|---|
| **Claude Code** (Fable for big builds, Opus for planning and review) | Strong at multi-file work. I can keep a clean prompt log per feature branch. |
| **Next.js (React)** | One framework for pages and server routes, and deploys easily to Vercel. |
| **three.js via React Three Fiber** | The standard way to do 3D in React. The prototype already proved three.js handles the board, picking and highlighting. |
| **Supabase (Postgres)** | Real relational tables and foreign keys. Row-level security enforces "users see only their own data" inside the database itself. |
| **Supabase Auth, email + password** | Visitors create accounts inside the app, which the live Demo Day sign-up needs. |
| **Vercel** | Free hosting with a live URL that redeploys on every merge to main. |
| **Zustand** | A small store that both the 3D scene and the UI read for game state (current task, hearts, XP). |
| **Tailwind CSS** | Fast to write with an agent; design tokens keep light and dark themes consistent. |
| **Zod** | One schema validates forms and the wiring/rules JSON. |
| **Recharts** | Simple React charts for the dashboard. |
| **Vitest** | Runs the two required tests, plus unit tests for the checker logic. |
| **Browser Web Audio + Speech APIs** | Live mic meter and spoken voice for the simulation, with no extra services. |

## 6. Design

Electronics workbench look: a cool grey bench mat, a realistic white breadboard, PCB-green buttons for success and primary actions, and amber for highlights and "probe" hover. Chunky press-down buttons and hearts/XP borrowed from **Duolingo**. Wiring interaction inspired by **Wokwi** and **Tinkercad Circuits**. Perch's screen faces nod to **Apple HomeView**. Type is Bricolage Grotesque, with IBM Plex Mono for pin labels. Works on laptop and phone. On a phone, wiring uses touch: tap a hole to start a wire and tap another to finish, pinch to zoom, drag to rotate, and pop-ups dock to the bottom of the screen. 3D parts are built from code shapes for launch; detailed models (glTF, e.g. exported from Blender) may replace individual parts later.

## 7. Risks and cuts

**Least sure I can build:** module placement plus multi-pin checking (features 4–5). Modules like the screen have 8 pins, and the checker has to handle several required connections per step. I'll prototype this before feature 4.

**Other risks:**
- Teaching something wrong. Mitigation: each step's rules cite their source.
- Browser mic permission. Mitigation: fall back to an animated meter.
- 3D performance on older laptops and phones. Mitigation: render only on change, instanced holes, flat top-down fallback.
- Wiring on a small touch screen is fiddly. Mitigation: tap-to-select with auto-zoom, larger tap targets, pop-ups docked to the bottom.
- Writing the game content takes time: about 35 tasks across 5 levels, each with an instruction and a pop-up explanation. Since the pop-ups are the learning, they are not on the cut list. Mitigation: write Levels 1–3 first and use them to test the flow, and cite a source for every "why".

**Cut order if I run out of time:**
1. Live mic meter → replace with an animated meter.
2. Animated level map → a plain numbered list of levels.
3. Level 5 (Face) → ship 4 levels.
4. 3D camera → ship the flat top-down view (same data and checker).

## Plan vs. Reality

*(Added at the end. The original plan above stays unedited.)*

| Planned feature | Shipped / Changed / Cut | Status (Done / Backlogged) | Learning | What changed and why |
|---|---|---|---|---|
| **1. Sign up and login** (issue #9, PR #10) | Shipped, Changed | Done | | Email and password with Supabase Auth, as planned. Added: "Forgot password?" and a reset page, because Hanif forgot his password in the first test. |
| **2. Data model** (issue #11, PR #12) | Shipped, Changed | Done | | 8 tables with row-level security, and the seed for 6 projects and the Perch levels. `users` is `profiles`, and `steps` is `levels`. `schema.md` gives each difference and the reason. |
| **2a. Lobby** (issue #13, PR #14) | Shipped, Changed | Done | | Catalog cards, XP and the Continue button, as planned. Changed: a ToyCAD-style layout with a bottom dock, and one column of cards on a phone. |
| **3. 3D breadboard editor** (issue #15, PR #16) | Shipped, Changed | Done | | Shipped as planned. Added: a guide bar and a hole card in simple words (Hanif found the first text too technical), and portrait lock on phones. A touch stress test found and fixed 3 bugs. |
| **4. Module placement** (issue #17, PR #18) | Shipped, Changed | Done | | Button, mic, amplifier, screen and speaker. Hanif asked Claude to check the pin orders: 2 pin layouts were wrong and are fixed. |
| **5. Build mode with guided pop-ups** (issue #19, PR #21) | Shipped, Changed | Done | | Level map, one task at a time, pop-ups, glow, snap and buzz, XP and autosave. The amplifier got a screw terminal, and a new rule refuses a module pin in an ESP32-S3 line. |
| **5a. Level check** (issue #25, PR #26) | Shipped | Done | | Check with a reason, hearts and an attempt row for each Check. A Level complete pop-up (issue #20, PR #22) opens after a pass. CI (GitHub Actions) came in PR #22. |
| **6. Snapshots** (issue #23, PR #24) | Shipped | Done | | Save, list, view in 3D, edit notes and delete with confirm. |
| **7. Validation** (issue #27, PR #29) | Shipped | Done | | One Zod schema for the forms, a message under each field, and Check is off on an empty board. |
| **8. Stars** (issue #40, PR #41) | Shipped | Done | | Star button, and All and Starred tabs. No migration was necessary. |
| **9. Find** (issue #42, PR #43) | Shipped | Done | | Search, level filter, result filter and sort. The URL keeps all of them. |
| **10. Dashboard** (issue #28, PR #32) | Shipped | Done | | 4 stat cards and a mistakes chart. The required 67% test has a red and a green CI run in PR #32. |
| **11. "It's alive" simulation** | Not built | Backlogged | | The LED blink, the mic meter, the spoken voice and the screen face for Perch are not in the app. Arduino Foundations has a code step that runs on the 3D board (issue #58). |
| **12. Tests** | Shipped, Changed | Backlogged | | The dashboard stat test is done (PR #32). The Data isolation test (section 4, test 1) is not in the repository yet. It needs a Supabase test project in CI. |
| **13. Docs** | Shipped | Done | | `schema.md` is up to date. README shows the live URL and the 2 projects that can be played (issue #71). |
| **14. Home page before sign in** (issue #46, PR #47) (added Oct 18). User story: As a new visitor, before I sign in I want to see a home page that tells me what Jumper is, shows the 3D breadboard and Perch, and has "Sign up" and "Log in" buttons, so that I know why I should make an account. | Added | Done | | Not in the original plan. Before, a visitor who was not signed in went directly to `/login`. A home page gives the app a front door for Demo Day. |
| **15. Walkthrough video** (issues #48 and #49, PRs #50 and #54) (added Oct 18). User story: As a new visitor or learner, I want to watch a short video in the app that shows how build mode works (place a wire, read the pop-up, press Check) and, at the start of each level, a short clip that shows what I build in that level, so that I know how to play and what comes next. | Added | Done | | Not in the original plan. The videos are in the app, not a demo video for the course: one intro video (on the home page and at the first log-in) and one short clip for each level (5 clips for Perch). |
| **16. Mascot creation** (issue #44, PR #45) (added Oct 18). User story: As a learner, I want a Jumper mascot that guides me (on the home page, the level map and the pop-ups) and reacts when I pass or fail a task, so that the app feels like a game and not a manual. | Added | Done | | Not in the original plan. One fixed mascot for Jumper, like the Duolingo owl. Learners do not make their own mascot. |
| **17. Profile** (issues #34 and #36, PRs #35 and #37) (added Oct 19). User story: As a learner, I want a profile page where I can see my email, my XP and the date I joined, change my display name, choose one of 5 robot characters as my profile picture, change my password and log out, so that my account is mine and I can control it. | Added | Done | | Not in the original plan. Today the Profile button in the dock opens a "Coming soon" page; it will open the profile page. The page uses the columns that `profiles` already has (`display_name`, `xp`, `created_at`), so there is no new table. The 5 characters (Volt, Diode, Pixel, Servo and Chip) are images in `public/avatars/`, and their names are in `content/ui/avatars.json`. The saved choice needs one more column in `profiles` when the page is built. Deleting the account and changing the email are not decided yet. |
| **18. Beginner guidance** (issue #38, PR #39) (added Oct 21). User story: As a learner who has never built a circuit, I want each step in very simple words, a cue that shows where to click or tap, and a short note after each step about what I just did, so that I can finish a level without knowing technical words. | Added | Done | | Not in the original plan. Hanif tried level 1 and could not pass the first step: the text used technical words, and the screen did not show where to click. The Perch text and the build-mode words use very simple words now. A "Nice! Here is what happened" pop-up shows after each Place or Wire task. A bouncing arrow shows the next hole to tap, and a blinking line goes around a part that is already on the table. |
| **19. Continue card fix** (PR #53) (added Oct 22, issue #51). User story (row 2a): As a learner, after I log in I want to land in a lobby that shows the project catalog as cards, my XP, and a "Continue Perch" button that takes me back to the level I was on. | Changed | Done | | Not in the original plan. Hanif found that the Perch picture on the Continue card covers the level line, so a long level name ("Level 2 · Talk button and status light") does not show in full. The text will go above the picture and wrap before it, and the picture will be smaller on a laptop. |
| **20. Task checklist in build mode** (issue #52, PRs #55 and #56) (added Oct 22). User story (row 5): As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. Added: I want to see all the tasks of the level as a list that I can track (done, now, to do). | Added | Done | | Not in the original plan. Hanif found a level with no to-do list: after the last task, build mode shows only the Check button, and when parts are removed it says "Place a part on the board first" with no steps. The plan is a "Tasks 3 of 8" panel on the board. A tick shows each task that the board does now. |
| **21. Arduino Foundations: Uno bench and 4 wiring levels** (PR #59) (added Oct 23, issue #57). User story: As a learner, I want to open the Arduino Foundations project and wire an Arduino Uno to a breadboard in 4 levels, so that I learn breadboard basics, Ohm's law, LEDs and buttons before I build Perch. | Changed | Done | | In the original plan, Arduino Foundations is a "Coming soon" card. Its status changes to available. The bench now comes from a file in `content/benches/`, so Perch keeps its ESP32-S3 bench and Arduino Foundations gets the Uno beside one breadboard. The 4 levels are data: power the breadboard, light an LED, read a button, and the button and the LED together. The sketch editor and the walkthrough videos for these levels are not in this issue. |
| **22. Arduino Foundations: write the sketch and run it on the 3D board** (PR #60) (added Oct 23, issue #58). User story: As a learner, after I wire a level of Arduino Foundations, I want to write the Arduino sketch for it in a code editor, press Run, and see the 3D board do what my code says, with a clear message about the line that is wrong, so that I learn how code and wiring work together. | Changed | Done | | In the original plan, Jumper checks connections only and does not run code (PRD 2.3). Levels 2, 3 and 4 of Arduino Foundations now have a code step after the wiring tasks. `lib/sketch` reads a small part of Arduino C and runs it on a clock that the app controls, on the nets of the board. The starter code, the goal and the hints are data in `content/sketches/`. A failed sketch does not cost a heart. The sketch is saved in the browser with the board, not in a new column. |
| **23. Build page crash in Chrome 153** (PR #66) (added Oct 24, issue #61). User story (row 5): As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. | Changed | Done | | Not in the original plan. A QA audit found that build mode stops in Chrome 153 when an effect gives back the Promise of `scrollIntoView()`. The two effects in the audit already had braces (#57). A lint rule now stops an effect with an expression body, and 5 more effects have braces. |
| **24. Check after a replay** (added Oct 24, issue #62, PR #68). User story (row 5a): As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt. | Changed | Done | | Not in the original plan. A QA audit found that a failed Check on a level that passed before opened Level complete. Now a replay gets a new session, and only the first pass of a level gives XP. |
| **25. Undo and remove in build mode** (added Oct 24, issue #63, PR #67). User story (row 5): as in row 5. | Changed | Done | | Not in the original plan. A QA audit found that a part put back after Undo or Remove gave a false Mistake. The task engine now reads the board as it is. |
| **26. Second user on the same tab** (added Oct 24, issue #64, PR #69). User story (row 1): As a new visitor, I want to create an account, log in and log out, so that my builds are mine. | Changed | Done | | Not in the original plan. A QA audit found that a second user on the same tab saw the board of the first user. The saved board key now has the user, and Log out empties the board. |
| **27. Check includes earlier levels** (added Oct 24, issue #65, PR #70). User story (row 5a): as in row 5a. | Changed | Done | | Not in the original plan. A QA audit found that level 2 passed without the 3V3 wire of level 1. Check now joins the rules of the levels that the board starts with. |
| **28. Change email and delete account** (added Oct 27, issue #78). User story (row 17): as in row 17. Added: I want to change my email and delete my account. | Added | In progress | | Not in the original plan. Row 17 says that deleting the account and changing the email were not decided. Hanif decided: a confirmation link for a new email; a confirm dialog where the learner types `DELETE`; one SQL function `delete_my_account()` that deletes the user in `auth.users`, and the cascade removes the rest. No new table. |
