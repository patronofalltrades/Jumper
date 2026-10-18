# Jumper

Jumper is a web app. You use Jumper to learn hardware engineering. You connect real boards on a 3D breadboard, and the app guides you like a game.

You do not buy or carry parts. The parts in Jumper are the same as real parts, for example the ESP32-S3-DevKitC-1 board, the INMP441 mic, the MAX98357A amplifier and the ST7789 screen. Thus the skills that you learn are correct for real devices.

The first project that you can play is **Perch**. Perch is a desk device that gives an AI agent a home, with ears, a voice and a face. You connect Perch in 5 levels. In each level, a pop-up tells you what to do, where to do it, and why. You get XP for each task. Other projects show "Coming soon".

**Live app:** not deployed yet.

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

Available after feature 1 (sign up and log in).
