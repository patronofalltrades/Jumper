import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { startBoard } from "@/lib/content/boards";
import { boardsSchema } from "@/lib/content/schema";
import { saveKey } from "@/lib/game/level-key";
import { expect } from "./fixtures";

// Helpers that put a learner on a level, with the real app. A level is passed with the real Check: the finished board of
// the level goes into the browser storage (as in the earlier checks, #57, #58 and #62), with a session that the app made
// when the test pressed Start. Then the test presses the real Check button, and the real SQL function saves the attempt.

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));

type Task = { xp: number };
const project = (slug: string) => read(`content/projects/${slug}.json`) as { levels: { position: number; tasks: Task[] }[] };

/** The first sketch of a level that passes its goal, for a level that is passed with no typing (Arduino level 2). */
export const BLINK = [
  "const int ledPin = 13;",
  "void setup() {",
  "  pinMode(ledPin, OUTPUT);",
  "}",
  "void loop() {",
  "  digitalWrite(ledPin, HIGH);",
  "  delay(500);",
  "  digitalWrite(ledPin, LOW);",
  "  delay(500);",
  "}",
].join("\n");

/** The sketch of Arduino Foundations level 3: the L light is on while the button is pressed. */
export const BUTTON = [
  "const int buttonPin = 2;",
  "const int ledPin = 13;",
  "void setup() {",
  "  pinMode(ledPin, OUTPUT);",
  "  pinMode(buttonPin, INPUT_PULLUP);",
  "}",
  "void loop() {",
  "  if (digitalRead(buttonPin) == LOW) {",
  "    digitalWrite(ledPin, HIGH);",
  "  } else {",
  "    digitalWrite(ledPin, LOW);",
  "  }",
  "  delay(10);",
  "}",
].join("\n");

/** The finished board of a level: the parts that it starts with, and the parts of the level. */
export function finishedBoard(slug: string, position: number) {
  const boards = boardsSchema.parse(read(`content/boards/${slug}.json`));
  const start = startBoard(boards, position);
  return { start, parts: [...start, ...(boards.levels[position] ?? [])] };
}

/** True when the level has a walkthrough clip (content/videos.json). Such a level opens its clip by itself at the start. */
const hasClip = (slug: string, position: number) => (read("content/videos.json").videos as { id: string }[]).some((v) => v.id === `${slug}-${position}`);

/** Opens a level page. A level clip opens by itself at the start of a level: closes it, so that the board is free. */
export async function openLevel(page: Page, slug: string, position: number) {
  await page.goto(`/p/${slug}/${position}`);
  if (hasClip(slug, position)) {
    const clip = page.getByRole("dialog", { name: new RegExp(`^Level ${position} ·`) });
    await expect(clip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(clip).toBeHidden();
  }
  await expect(page.getByRole("button", { name: "Start", exact: true }).or(page.getByRole("button", { name: "Check", exact: true }))).toBeVisible();
}

/**
 * Puts the finished board of a level on the page, ready for the Check: the learner pressed Start, the app made the
 * session row, and the finished board is in the browser storage. `sketch`: the saved sketch of a level with a code step.
 */
export async function finishBoard(page: Page, user: string, slug: string, position: number, sketch?: { code: string; passed: boolean }) {
  const key = saveKey(user, slug, position);
  await openLevel(page, slug, position);
  // Start makes the first change, so the app saves the board and makes the session row for the level.
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForFunction((k) => Boolean(JSON.parse(localStorage.getItem(k) ?? "null")?.session), key);

  const tasks = project(slug).levels.find((l) => l.position === position)!.tasks;
  const { start, parts } = finishedBoard(slug, position);
  await page.evaluate(
    ({ k, parts, base, count, xp, sketch }) => {
      const saved = JSON.parse(localStorage.getItem(k)!);
      saved.parts = parts;
      saved.base = base;
      saved.progress = { phase: "ready_to_check", index: count, reached: count, tasksDone: count, mistakes: 0, xp, mistake: null, swaps: [], fails: 0 };
      if (sketch) saved.sketch = sketch;
      localStorage.setItem(k, JSON.stringify(saved));
    },
    { k: key, parts, base: start, count: tasks.length, xp: tasks.reduce((n, t) => n + t.xp, 0), sketch },
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Check", exact: true }).or(page.getByRole("button", { name: "Write the sketch" })).first()).toBeVisible();
}

/** Passes a level with the real Check. A level with a code step gets a sketch that is marked as passed. */
export async function passLevel(page: Page, user: string, slug: string, position: number, sketch?: string) {
  await finishBoard(page, user, slug, position, sketch ? { code: sketch, passed: true } : undefined);
  const check = page.getByRole("button", { name: "Check", exact: true });
  await expect(check).toBeEnabled();
  await check.click();
  await page.waitForURL(new RegExp(`/p/${slug}/${position}/complete`));
}

/** The sketches that pass the levels of Arduino Foundations before the level that a test wants. */
const SKETCHES: Record<number, string> = { 2: BLINK, 3: BUTTON };

/** Passes the Arduino Foundations levels before `position` with the real Check, then has the finished board of `position` ready. */
export async function arduinoLevelReady(page: Page, user: string, position: number, sketch?: { code: string; passed: boolean }) {
  for (let level = 1; level < position; level++) await passLevel(page, user, "arduino-foundations", level, SKETCHES[level]);
  await finishBoard(page, user, "arduino-foundations", position, sketch);
}
