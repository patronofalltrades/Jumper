**Base:** `main`
**Head:** `Features/GenericQuestions`

**Issue title:** Onboarding: generic questions, with no project list

**Issue body:**

User story (PLAN.md rows 2a and 14, as in row 53): As a new visitor, before I sign in I want to see a home page that tells me what Jumper is, shows the 3D breadboard and Perch, and has "Sign up" and "Log in" buttons, so that I know why I should make an account. Added: I want the home page to feel like a game that I want to play, like the Duolingo home page.

- The first onboarding question lists projects by name (Perch, My first circuits, and two "Coming soon" projects). Replace it with a generic question: "What do you want to make?"
- The last question names Arduino Foundations and Perch. Make it generic: "Learn the basics first" or "Build a real device". The answer chooses the start project.
- The questions name no project and no board.

---

**PR title:** Onboarding: generic questions, with no project list

**PR body:**

closes #164

## What this does

- The first question is now "What do you want to make?", with 4 kinds of things: a gadget for my desk, a robot, a smart home device, something to wear. The project list is gone.
- The last question, "Where do you want to start?", is asked of each visitor. "Learn the basics first" opens Arduino Foundations. "Build a real device" opens Perch. Each option names its project slug in `content/ui/onboarding.json`, so the screen names no project.
- The landing links `/start?build=<slug>` still work: they select the start answer that opens that project.

## Tests

- `tests/onboarding.test.ts`: the same 5 questions for each visitor; the start answer gives the project; a project link gives the start answer; each start option opens an available project; the questions name no project and no board.
- One real change that makes a test fail: put "Perch" back in a question label.
- `npm run typecheck`, `npx eslint .` and `npm test` (64 files, 851 tests) pass.
- Browser check on `/start`: 5 questions; "Learn the basics first" sets the cookie to `arduino-foundations`; `/start?build=perch` selects "Build a real device".

## Screens

- `prompts/generic-onboarding-screens/1-make.png`
- `prompts/generic-onboarding-screens/5-start.png`

## Not checked

- Light theme of `/start`, and Safari and Firefox.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnQFZZXYVYiNTukEjmr
