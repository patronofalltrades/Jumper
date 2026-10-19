# Jumper

Welcome to **Jumper**, the friendliest way to learn hardware engineering! Jumper is a web app where you build real circuits on a 3D breadboard, and the whole thing guides you forward like a game. No tools, no messy wires on your desk — just you, a screen, and the satisfaction of building something real.

Here is the best part: the parts are the real deal. The ESP32-S3-DevKitC-1 board, the INMP441 mic, the MAX98357A amplifier, the ST7789 screen — they are exactly the components you would hold in your hand. So every skill you learn in Jumper is a skill you can carry straight onto a real bench.

The first project you can play is **Perch**: a cute desk device that gives an AI agent a home, complete with ears, a voice and a face. You bring Perch to life across 5 levels. In every level, a friendly pop-up tells you exactly what to do, where to do it, and why it matters. Every task you finish earns you XP. The other projects are waiting in the wings with a cheerful "Coming soon" badge.

**Live app:** not deployed yet — but it is on the way!

## About this project

Jumper started as a class project for **Intro to Code (MBA 296C, UC Berkeley Haas, Fall 2026)**.

But Jumper is more than homework. It is a passion project, and it keeps growing long after the class ends.

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

5. Open http://localhost:3000. The app sends you to the log-in page. Select **Create an account** and you are in.

### Checks

| Command | What it does |
| --- | --- |
| `npm test` | Runs the Vitest tests |
| `npm run typecheck` | Makes the route types, then runs the TypeScript check |
| `npm run lint` | Runs ESLint |
| `npm run build` | Makes the production build |
| `npm run seed` | Loads `content/projects/` into the database |
