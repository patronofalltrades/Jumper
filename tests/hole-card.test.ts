import { describe, expect, it } from "vitest";
import { holeLines } from "@/components/build/guide";
import uno from "@/content/benches/arduino-foundations.json";
import { createBench, perchBench, type BenchSpec } from "@/lib/circuit/bench";
import { buildNets } from "@/lib/circuit/nets";

// The hole card names the breadboard (issue #100): the Perch tasks say "breadboard A" and "breadboard B".

const title = (bench: ReturnType<typeof perchBench>, hole: string) => holeLines(bench, [], buildNets(bench, []), hole)[0];

describe("hole card title", () => {
  it("names breadboard A", () => {
    expect(title(perchBench(), "A-f15")).toBe("Breadboard A · row f, column 15");
  });

  it("names breadboard B", () => {
    expect(title(perchBench(), "B-c22")).toBe("Breadboard B · row c, column 22");
  });

  it("names breadboard A on the Arduino Foundations bench too, which has one breadboard", () => {
    const bench = createBench(uno as unknown as BenchSpec);
    expect(title(bench, "A-f15")).toBe("Breadboard A · row f, column 15");
  });
});
