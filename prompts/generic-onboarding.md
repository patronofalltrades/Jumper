# Prompt log: generic onboarding questions (issue #164)

1. Hanif's prompt (his words): "this still exists and I don't want it there. I want it to be more generic and the onboarding questions should be more generic" (with a screenshot of the first onboarding question, "What do you want to build?", which listed Perch, My first circuits, A desk weather station and A focus timer with a buzzer).

   Claude notes: Claude asked two questions. Hanif's answers: replace the project list with a generic interest question ("What do you want to make?"), and choose the start project with a generic "Where do you want to start?" question that names no project.

2. Claude's steps

   - `content/ui/onboarding.json`: the `build` question is now `make`, with 4 kinds of things. The `start` question has 2 generic options. Each start option has a `project` field: the slug of the project that it opens.
   - `lib/game/onboarding.ts`: the questions are the same for each visitor (`QUESTION_IDS`). `startProject` reads the project from the start option. `startAnswerFor` turns a link such as `/start?build=perch` (the landing buttons and course tabs) into the start answer that opens that project.
   - `components/onboarding/onboarding-flow.tsx` and `app/start/page.tsx` use these.
   - `tests/onboarding.test.ts`: tests for the new functions, and a test that the questions name no project and no board.
   - Checks: `npm run typecheck`, `npx eslint .` and `npm test` (64 files, 851 tests) pass. In a browser, `/start` shows the 5 questions; "Learn the basics first" sets the cookie to `arduino-foundations`; `/start?build=perch` selects "Build a real device".

3. Decisions made by Claude (minimal choices)

   - The answer to "What do you want to make?" stays in the browser and does not change the start project, as for "Why" and the daily goal.
   - The save screen still says "Next, you start {project}", with the name of the project that the start answer opens. That is the result of the questions, not a question.
   - The "I write code for boards" option still says "Arduino or ESP-IDF". These are names of tools, not of Jumper projects.
