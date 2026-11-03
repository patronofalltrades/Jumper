import { describe, expect, it } from "vitest";
import text from "@/content/ui/build.json";
import { createBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadLevelClips } from "@/lib/content/clips";
import { loadProjects } from "@/lib/content/load";
import { needsAck, startProgress, step, taskSpot, type Plan, type Progress } from "@/lib/game/engine";
import { hologramGhost } from "@/lib/game/hologram";
import { taskText } from "@/lib/game/task-text";

// Issue #148: the rules for the task text, for a learner who has never touched electronics.
// - Each task: one action, one sentence, 20 words or less, and it names the breadboard, the row and the column of the
//   holes that the arrow points at.
// - The words breadboard, rail, pin, GPIO, ground, resistor and I²S show only after the Concept card that explains them.
// - A label of a pin (GPIO 4, VDD, SCK…) shows only in brackets, after its plain name: "pin 4 (GPIO 4)".
// The test plays each level as a learner who puts each part where the arrow points, and reads the text of each task.

const PROJECTS = ["perch", "arduino-foundations"];

/** A word has a letter or a digit. "+" and "−" are signs, not words. */
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
const VERBS = ["put", "connect", "look"];
/** The listed words, and the Concept card title that explains each one. */
const LISTED: { word: RegExp; card: RegExp }[] = [
  { word: /\bbreadboards?\b/i, card: /breadboard/i },
  { word: /\brails?\b/i, card: /rail/i },
  { word: /\bpins?\b/i, card: /\bpin/i },
  { word: /\bGPIO\b/i, card: /gpio/i },
  { word: /\bground\b|\bGND\b/i, card: /ground/i },
  { word: /\bresistors?\b/i, card: /resistor/i },
  { word: /I²S|I2S/i, card: /i²s/i },
];
/** The labels of pins. Each one shows only in brackets, after a plain name. */
const LABELS = /\b(GPIO ?\d*|GND|3V3|5V|VDD|VCC|Vin|WS|SCK|SD|L\/R|DIN|BCLK|LRC|SCL|SDA|RES|DC|CS|BLK|D\d+)\b/;
const outsideBrackets = (s: string) => s.replace(/\([^)]*\)/g, "");
const cardTitle = (concept: string | null) => (concept ? concept.slice(0, concept.indexOf(":")) : null);

describe("the task text follows the first-timer rules", async () => {
  for (const project of loadProjects().filter((p) => PROJECTS.includes(p.slug))) {
    const bench = createBench(await loadBenchSpec(project.slug));
    const boards = await loadBoards(project.slug);
    const clips = await loadLevelClips(project.slug);
    const explained: string[] = [];

    for (const level of [...project.levels].sort((a, b) => a.position - b.position)) {
      // The cards that the learner saw before this level opens (the goal shows in the intro, before the first card).
      const before = [...explained];
      const cards = level.tasks.map((t) => cardTitle(t.concept));
      explained.push(...cards.filter((c): c is string => c !== null));

      describe(`${project.slug} level ${level.position}`, () => {
        it("the goal uses no listed word before its card", () => {
          for (const { word, card } of LISTED) {
            if (word.test(level.goal)) expect(before.some((c) => card.test(c)), `goal: "${level.goal}" uses ${word}`).toBe(true);
          }
        });

        // Play the level: copy the ghost of each task, and read the text of each task with the holes of the arrow.
        const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
        const finish = clips.get(level.position)?.order;
        let board: Part[] = startBoard(boards, level.position);
        let progress: Progress = startProgress();
        progress = step(bench, plan, progress, { type: "start" }).progress;
        const read: { n: number; filled: string; ack: boolean; taps: number; instruction: string; why: string }[] = [];
        for (let guard = 0; progress.phase === "task" && guard < 100; guard++) {
          const i = progress.index;
          const task = level.tasks[i];
          const spot = taskSpot(bench, board, task.target, progress.swaps, finish);
          read.push({ n: task.position, filled: taskText(bench, board, task.instruction, spot.taps), ack: needsAck(task.target), taps: spot.taps.length, instruction: task.instruction, why: task.popup_why });
          if (needsAck(task.target)) {
            progress = step(bench, plan, progress, { type: "ack", parts: board }).progress;
            continue;
          }
          const ghost = hologramGhost(bench, board, { kind: "task", index: i }, plan, progress.swaps, finish);
          const part = ghost!.parts[0];
          const after = [...board, part.type === "wire" ? { ...part, id: `g${guard}` } : part];
          progress = step(bench, plan, progress, { type: "change", before: board, after }).progress;
          board = after;
        }

        it("each task is 20 words or less, one sentence, with one action", () => {
          for (const r of read) {
            expect(words(r.filled).length, `task ${r.n}: "${r.filled}"`).toBeLessThanOrEqual(20);
            expect(r.filled.match(/[.!?](\s|$)/g)?.length, `task ${r.n}: one sentence: "${r.filled}"`).toBe(1);
            const verbs = words(r.filled).filter((w) => VERBS.includes(w.toLowerCase().replace(/[^a-z]/g, "")));
            expect(verbs.length, `task ${r.n}: one action verb: "${r.filled}"`).toBe(1);
          }
        });

        it("each task names the holes of the arrow: the breadboard, the row and the column", () => {
          for (const r of read) {
            if (r.ack) {
              expect(r.filled, `task ${r.n}`).toMatch(/breadboard/i);
              continue;
            }
            // The text takes its holes from the arrow, so the two always agree.
            expect(r.instruction, `task ${r.n}: "${r.instruction}" has no {from}`).toContain("{from}");
            if (r.taps > 1) expect(r.instruction, `task ${r.n}: "${r.instruction}" has no {to}`).toContain("{to}");
            expect(r.filled, `task ${r.n}`).not.toMatch(/\{/);
            if (!/screw/.test(r.filled)) expect(r.filled, `task ${r.n}: "${r.filled}"`).toMatch(/breadboard.*column \d+/);
          }
        });

        it("each listed word shows only after its Concept card", () => {
          read.forEach((r, i) => {
            const seen = [...before, ...cards.slice(0, i + 1).filter((c): c is string => c !== null)];
            for (const { word, card } of LISTED) {
              for (const [what, s] of [["task", r.filled], ["what happened", r.why]]) {
                if (word.test(s)) expect(seen.some((c) => card.test(c)), `task ${r.n} (${what}): "${s}" uses ${word}`).toBe(true);
              }
            }
          });
        });

        it("each pin label shows in brackets, after a plain name", () => {
          for (const r of read) expect(outsideBrackets(r.filled), `task ${r.n}: "${r.filled}"`).not.toMatch(LABELS);
        });
      });
    }
  }
});

describe("the build-mode text uses plain words", () => {
  const strings: [string, string][] = [];
  const walk = (o: unknown, path: string) => {
    if (typeof o === "string") strings.push([path, o]);
    else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (k !== "_note") walk(v, `${path}.${k}`);
  };
  walk(text, "build");

  it("says 'red + line' or 'blue − line', not 'rail'", () => {
    for (const [path, s] of strings) expect(s, path).not.toMatch(/\brails?\b/i);
  });

  it("does not say I²S", () => {
    for (const [path, s] of strings) expect(s, path).not.toMatch(/I²S|I2S/);
  });

  it("gives a GPIO pin its plain name first", () => {
    expect(text.pins.gpio).toBe("pin {n} (GPIO {n})");
  });
});
