# Jumper

Welcome to **Jumper**, the friendliest way to learn hardware engineering! Jumper is a web app where you build real circuits on a 3D breadboard, and the whole thing guides you forward like a game. No tools, no messy wires on your desk — just you, a screen, and the satisfaction of building something real.

Here is the best part: the parts are the real deal. The ESP32-S3-DevKitC-1 board, the INMP441 mic, the MAX98357A amplifier, the ST7789 screen — they are exactly the components you would hold in your hand. So every skill you learn in Jumper is a skill you can carry straight onto a real bench.

Two projects are ready to play: **Perch** and **Arduino Foundations**. **Perch** is a cute desk device that gives an AI agent a home, complete with ears, a voice and a face. You bring Perch to life across 5 levels. In Arduino Foundations, you wire an Arduino Uno to a breadboard in 4 levels, and then you write the code for it. In every level, a friendly pop-up tells you exactly what to do, where to do it, and why it matters. Every task you finish earns you XP. The other projects are waiting in the wings with a cheerful "Coming soon" badge.

**Live app:** https://jumper-inky-sigma.vercel.app/

## About this project

Jumper started as a class project for **Intro to Code (MBA 296C, UC Berkeley Haas, Fall 2026)**.

But Jumper is more than homework. It is a passion project, and it keeps growing long after the class ends.

## Walkthrough videos

Short videos show how to play Jumper and what you build in each Perch and Arduino Foundations level. Each video is a recording of the 3D replay in the app. On a slow phone, or in a browser with no 3D (WebGL), the app plays the video in place of the 3D replay.

| Video | Laptop | Phone |
| --- | --- | --- |
| How to play Jumper | [intro-laptop.webm](public/videos/intro-laptop.webm) | [intro-phone.webm](public/videos/intro-phone.webm) |
| Perch level 1 · Set up the board | [perch-1-laptop.webm](public/videos/perch-1-laptop.webm) | [perch-1-phone.webm](public/videos/perch-1-phone.webm) |
| Perch level 2 · Talk button and status light | [perch-2-laptop.webm](public/videos/perch-2-laptop.webm) | [perch-2-phone.webm](public/videos/perch-2-phone.webm) |
| Perch level 3 · Ears | [perch-3-laptop.webm](public/videos/perch-3-laptop.webm) | [perch-3-phone.webm](public/videos/perch-3-phone.webm) |
| Perch level 4 · Voice | [perch-4-laptop.webm](public/videos/perch-4-laptop.webm) | [perch-4-phone.webm](public/videos/perch-4-phone.webm) |
| Perch level 5 · Face | [perch-5-laptop.webm](public/videos/perch-5-laptop.webm) | [perch-5-phone.webm](public/videos/perch-5-phone.webm) |
| Arduino Foundations level 1 · Power the breadboard | [arduino-foundations-1-laptop.webm](public/videos/arduino-foundations-1-laptop.webm) | [arduino-foundations-1-phone.webm](public/videos/arduino-foundations-1-phone.webm) |
| Arduino Foundations level 2 · Light an LED | [arduino-foundations-2-laptop.webm](public/videos/arduino-foundations-2-laptop.webm) | [arduino-foundations-2-phone.webm](public/videos/arduino-foundations-2-phone.webm) |
| Arduino Foundations level 3 · Read a button | [arduino-foundations-3-laptop.webm](public/videos/arduino-foundations-3-laptop.webm) | [arduino-foundations-3-phone.webm](public/videos/arduino-foundations-3-phone.webm) |
| Arduino Foundations level 4 · Button and LED together | [arduino-foundations-4-laptop.webm](public/videos/arduino-foundations-4-laptop.webm) | [arduino-foundations-4-phone.webm](public/videos/arduino-foundations-4-phone.webm) |

The live app also has the files, for example https://jumper-inky-sigma.vercel.app/videos/intro-laptop.webm.

## Documents

- [Plan](PLAN.md): the pitch, the features and the build sequence
- [Product requirements (PRD)](docs/PRD.md): what Jumper does, and for whom
- [Technical requirements (TRD)](docs/TRD.md): how we build Jumper
- [Breadboard prototype](reference/breadboard-prototype.html): the look and the interaction

## Tools used

- **Claude Code:** the coding agent
- **Next.js and TypeScript:** the app framework
- **React Three Fiber, drei and three.js:** the 3D breadboard
- **Zustand:** the game state
- **Tailwind CSS:** the styles
- **shadcn/ui:** the UI components (forms, dialogs, sheets and toasts)
- **Recharts:** the dashboard charts
- **Zod:** the validation of forms and data
- **Supabase:** log-in and the Postgres database
- **Vercel:** hosting
- **Vitest and Playwright:** tests
- **GitHub Actions:** CI

## Run the app

You need Node.js 22 (or newer) and a Supabase project. That is it — let's go!

1. Install the packages:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env.local`. Add the project URL and the publishable key from Supabase (**Project Settings > API Keys**). Do not commit `.env.local`.
3. Make the database. Run the SQL files in `supabase/migrations/` in the Supabase **SQL Editor**, in name order. Then add `SUPABASE_SECRET_KEY` to `.env.local` and load the projects, levels and tasks:

   ```
   npm run seed
   ```

   You can run the seed again any time you like. It updates the rows and never makes copies. [schema.md](schema.md) lists the tables.
4. Start the app:

   ```
   npm run dev
   ```

5. Open http://localhost:3000. The landing page shows what Jumper is. Select **Sign up** and you are in. When you are logged in, the app sends you to the lobby.

### Checks

| Command | What it does |
| --- | --- |
| `npm test` | Runs the Vitest tests |
| `npm run typecheck` | Makes the route types, then runs the TypeScript check |
| `npm run lint` | Runs ESLint |
| `npm run build` | Makes the production build |
| `npm run seed` | Loads `content/projects/` into the database |
| `npm run videos` | Records the walkthrough videos again (see below) |
| `npm run e2e` | Runs the browser checks on a production build (see below). Not in CI |

### Record the walkthrough videos again

When the text or the wiring of a level changes, record the videos again. The names, sizes and captions of the videos are in `content/videos.json`.

1. On a new computer, get the Playwright browser one time: `npx playwright install chromium`.
2. Make sure that `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`. The level clips need a log-in, so the script makes a temporary account and deletes it at the end.
3. Start the app: `npm run build`, then `npm start`.
4. In a second terminal, run `npm run videos`. To record only some videos, give their names, for example `npm run videos -- intro perch-3`. If Playwright has no browser on the machine, set `CHROMIUM_PATH` to a Chromium that is already there.
5. Run `npm test`. The tests make sure that each level has its videos and that all the files together are less than 10 MB.

### Browser checks

`npm run e2e` runs 5 flows in a real browser (Playwright) on a production build: the level map with Volt, a touch on the 3D button while a sketch runs, the walkthrough video in dark mode, the Log out button of the profile page, and dark mode in the code step. Each flow runs at 390 × 844 (a phone, touch on) and at 1280 × 800 (a laptop), and in light and dark mode where it applies. The tests are in `e2e/`. Each test says in plain words what it checks. The scenarios are in `prompts/browser-checks.md`, and the screenshots are in `prompts/browser-checks-screens/`.

The checks need a log-in, so each test makes a temporary account on your Supabase project and deletes it at the end, also when the test fails. This is why the checks are not in CI: they need `SUPABASE_SECRET_KEY`. After each run, the suite checks that no temporary account (`jumper-e2e-…@example.com`) and no row of such an account is left.

1. On a new computer, get the Playwright browser one time: `npx playwright install chromium`. If you have a Chromium already, set `CHROMIUM_PATH` to its file.
2. Make sure that `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. The projects and levels must be in the database (`npm run seed`).
3. Run `npm run e2e`. It builds the app (`npm run build`), starts it on port 3100 (`npm start`), runs the tests, and stops the app. To run one flow, give a part of its file name, for example `npm run e2e -- flow2`. To use an app that already runs, set `BASE_URL`.
