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
    expect(holePhrase(perch, [], "A-L+1")).toBe(`the left red + line of breadboard A next to column ${railNumber(1)}`);
    expect(holePhrase(perch, [], "B-R-6", "B")).toBe(`the right blue − line next to column ${railNumber(6)}`);
  });

  it("gives the nearest printed column for each hole of a line", () => {
    expect([1, 5, 6, 25].map(railNumber)).toEqual([2, 6, 8, 30]);
  });

  it("says 'the breadboard' on a bench with one breadboard, and left or right when two lines of a color are free", () => {
    expect(holePhrase(uno, [], "A-a3")).toBe("the breadboard, row a, column 3");
    expect(holePhrase(uno, [], "A-L+1")).toBe(`the left red + line next to column ${railNumber(1)}`);
  });

  it("names a pin socket of the Uno with its plain name", () => {
    expect(holePhrase(uno, [], "uno-D13")).toBe("pin 13 (D13) of the Uno");
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
    expect(pinName("GND")).toBe("GND (ground)");
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
