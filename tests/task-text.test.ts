import { describe, expect, it } from "vitest";
import { createBench, perchBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { holePhrase, pinName, railNumber, taskText } from "@/lib/game/task-text";

// Issue #148: the text of a task names the breadboard, the row and the column of the holes that the arrow points at.

const perch = perchBench();
const uno = createBench(await loadBenchSpec("arduino-foundations"));

describe("holePhrase", () => {
  it("names the breadboard, the row and the column of a middle hole", () => {
    expect(holePhrase(perch, [], "A-b5")).toBe("breadboard A, row b, column 5");
  });

  it("does not name the breadboard again when the sentence already named it", () => {
    expect(holePhrase(perch, [], "A-c14", "A")).toBe("row c, column 14");
    expect(holePhrase(perch, [], "B-c14", "A")).toBe("breadboard B, row c, column 14");
  });

  it("names a red or blue line with the column printed beside it, and its side when two lines of a color are free", () => {
    expect(holePhrase(perch, [], "A-L+1")).toBe(`breadboard A's left red + line next to column ${railNumber(1)}`);
    expect(holePhrase(perch, [], "B-R-6", "B")).toBe(`the right blue − line next to column ${railNumber(6)}`);
  });

  it("gives the nearest printed column for each hole of a line", () => {
    expect([1, 5, 6, 25].map(railNumber)).toEqual([2, 6, 8, 30]);
  });

  it("says 'the breadboard' on a bench with one breadboard, and left or right when two lines of a color are free", () => {
    expect(holePhrase(uno, [], "A-a3")).toBe("the breadboard, row a, column 3");
    expect(holePhrase(uno, [], "A-L+1")).toBe(`the breadboard's left red + line next to column ${railNumber(1)}`);
    expect(holePhrase(uno, [], "A-a4", "A")).toBe("row a, column 4");
  });

  it("names a pin socket of the Uno with its plain name", () => {
    expect(holePhrase(uno, [], "uno-D13")).toBe("pin 13 (D13) on the Uno");
  });

  it("names a screw of the amplifier", () => {
    const amp: Part = { id: "amp1", type: "max98357a", at: "A-a14" } as Part;
    expect(holePhrase(perch, [amp], "amp1.OUT+")).toBe("the + screw of the amp");
    expect(holePhrase(perch, [amp], "amp1.OUT-")).toBe("the − screw of the amp");
  });
});

describe("pinName", () => {
  it("puts the plain name first: pin 4 (GPIO 4)", () => {
    expect(pinName("GPIO4")).toBe("pin 4 (GPIO 4)");
    expect(pinName("GND")).toBe("ground (GND)");
  });
});

describe("taskText", () => {
  it("fills {from} and {to} from the taps", () => {
    expect(taskText(perch, [], "Connect {from} to {to}.", ["A-a3", "A-L+1"])).toBe(
      `Connect breadboard A, row a, column 3 to the left red + line next to column ${railNumber(1)}.`,
    );
  });

  it("keeps a text with no holes as it is", () => {
    expect(taskText(perch, [], "Look at your bench.", [])).toBe("Look at your bench.");
  });
});

describe("filledTask: every row of the task list (issue #148)", async () => {
  const { loadProjects } = await import("@/lib/content/load");
  const { loadBoards, startBoard } = await import("@/lib/content/boards");
  const { loadLevelClips } = await import("@/lib/content/clips");
  const { filledTask } = await import("@/lib/game/task-text");
  for (const slug of ["perch", "arduino-foundations"]) {
    const project = loadProjects().find((p) => p.slug === slug)!;
    const bench = slug === "perch" ? perch : uno;
    const boards = await loadBoards(slug);
    const clips = await loadLevelClips(slug);
    for (const level of project.levels) {
      it(`${slug} level ${level.position}: on the start board, a task whose part is not on the board yet still names its holes`, () => {
        const parts = startBoard(boards, level.position);
        for (const t of level.tasks) {
          const text = filledTask(bench, parts, t.instruction, t.target, [], clips.get(level.position)?.order);
          expect(text, `task ${t.position}`).not.toMatch(/\{/);
        }
      });
    }
  }
});

describe("taskTexts: the task list follows the guide (issue #148)", async () => {
  const { loadProjects } = await import("@/lib/content/load");
  const { loadBoards, startBoard } = await import("@/lib/content/boards");
  const { loadLevelClips } = await import("@/lib/content/clips");
  const { startProgress } = await import("@/lib/game/engine");
  const { taskTexts } = await import("@/lib/game/task-text");
  const project = loadProjects().find((p) => p.slug === "perch")!;
  const boards = await loadBoards("perch");
  const clips = await loadLevelClips("perch");
  const level = project.levels.find((l) => l.position === 2)!;
  const plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
  const texts = taskTexts(perch, startBoard(boards, 2), plan, level.tasks.map((t) => t.instruction), { ...startProgress(), phase: "task" }, clips.get(2)?.order);

  it("names the button hole of the guide in the next task too", () => {
    const column = /column (\d+), across/.exec(texts[0])![1];
    expect(texts[1]).toMatch(new RegExp(`button at row [a-j], column ${column}\\.`));
  });

  it("says that the resistor and the light are already joined when the guide puts them in one line", () => {
    expect(texts[6]).toMatch(/^Resistor to light: already joined in breadboard A, row [a-j], column \d+\.$/);
  });

  it("names holes in every task", () => {
    for (const t of texts) expect(t).not.toMatch(/\{/);
  });
});
