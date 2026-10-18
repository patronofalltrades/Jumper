# Jumper

Jumper is a web app. You use Jumper to learn hardware engineering. You connect real boards on a 3D breadboard, and the app guides you like a game.

You do not buy or carry parts. The parts in Jumper are the same as real parts, for example the ESP32-S3-DevKitC-1 board, the INMP441 mic, the MAX98357A amplifier and the ST7789 screen. Thus the skills that you learn are correct for real devices.

The first project that you can play is **Perch**. Perch is a desk device that gives an AI agent a home, with ears, a voice and a face. You connect Perch in 5 levels. In each level, a pop-up tells you what to do, where to do it, and why. You get XP for each task. Other projects show "Coming soon".

**Live app:** [jumper-inky-sigma.vercel.app](https://jumper-inky-sigma.vercel.app/). Each merge to `main` deploys a new version.

## About this project

Jumper is a class project for **Intro to Code (MBA 296C, UC Berkeley Haas, Fall 2026)**.

Jumper is also a passion project. Work on Jumper continues after the class.

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

You must have Node.js 22 or a later version, and a Supabase project.

1. Install the packages:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env.local`. Write the project URL and the publishable key from Supabase (**Project Settings > API Keys**) into `.env.local`. Do not commit `.env.local`.
3. Make the database. Run the SQL files in `supabase/migrations/` in the Supabase **SQL Editor**, in name order. Then add `SUPABASE_SECRET_KEY` to `.env.local` and load the projects, levels and tasks:

   ```
   npm run seed
   ```

   You can run the seed again. It updates the rows and does not make copies. [schema.md](schema.md) lists the tables.
4. Start the app:

   ```
   npm run dev
   ```

5. Open http://localhost:3000. The app sends you to the log-in page. Select **Create an account**.

### Checks

| Command | What it does |
| --- | --- |
| `npm test` | Runs the Vitest tests |
| `npm run typecheck` | Makes the route types, then runs the TypeScript check |
| `npm run lint` | Runs ESLint |
| `npm run build` | Makes the production build |
| `npm run seed` | Loads `content/projects/` into the database |
