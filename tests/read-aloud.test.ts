import { describe, expect, it } from "vitest";
import arduino from "@/content/projects/arduino-foundations.json";
import perch from "@/content/projects/perch.json";
import { spokenText } from "@/lib/game/read-aloud";

// The voice says the symbols of the task text as words (issue #135). Plus and minus are read only where they
// mean a rail or a polarity (a "+" or "−" with spaces or brackets around it), so that "C++" is not changed.

type Project = { levels: { tasks: { instruction: string }[] }[] };
const instructions = [perch as Project, arduino as Project].flatMap((p) => p.levels.flatMap((l) => l.tasks.map((t) => t.instruction)));

describe("spokenText: symbols as words", () => {
  it("reads the ohm sign as ohm", () => {
    expect(spokenText("Put the 220 Ω resistor on breadboard A.")).toBe("Put the 220 ohm resistor on breadboard A.");
    expect(spokenText("Ω")).toBe("ohm");
  });

  it("reads a plus sign that marks a rail or a leg as plus", () => {
    expect(spokenText("Connect the 3V3 pin to the red + line on the left side of breadboard A.")).toBe(
      "Connect the 3.3 volts pin to the red plus line on the left side of breadboard A.",
    );
    expect(spokenText("Put its long leg (+) in the same column.")).toBe("Put its long leg (plus) in the same column.");
  });

  it("reads the minus sign (U+2212) as minus", () => {
    expect(spokenText("Connect the blue − line on the left side.")).toBe("Connect the blue minus line on the left side.");
    expect(spokenText("the short leg (−) of the light")).toBe("the short leg (minus) of the light");
  });

  it("reads the arrow as to", () => {
    expect(spokenText("red + line → red + line")).toBe("red plus line to red plus line");
  });

  it("reads 3V3 as 3.3 volts and GND as ground", () => {
    expect(spokenText("Connect the 3V3 pin")).toBe("Connect the 3.3 volts pin");
    expect(spokenText("Connect a GND pin of the Uno")).toBe("Connect a ground pin of the Uno");
  });

  it("does not change a plus or minus inside a word, or the text around it", () => {
    expect(spokenText("Write the C++ code.")).toBe("Write the C++ code.");
    expect(spokenText("A short-circuit is not a pin.")).toBe("A short-circuit is not a pin.");
    expect(spokenText("Connect pin 1 (GPIO 1) of the board.")).toBe("Connect pin 1 (GPIO 1) of the board.");
  });

  it("reads the speaker terminals as plus and minus", () => {
    expect(spokenText("Put the speaker wires into the screw holder of the amp: + into +, then − into −.")).toBe(
      "Put the speaker wires into the screw holder of the amp: plus into plus, then minus into minus.",
    );
  });
});

describe("spokenText on the real task text of the projects", () => {
  it("finds the tasks of both projects", () => {
    expect(instructions.length).toBeGreaterThan(50);
  });

  it("leaves no symbol that the voice would read badly", () => {
    for (const line of instructions) {
      const said = spokenText(line);
      expect(said, line).not.toMatch(/Ω|→|−|3V3|GND/);
      expect(said, line).not.toMatch(/(^|[\s(])\+($|[\s).,;:])/);
    }
  });

  it("reads a real task of Perch in full", () => {
    expect(spokenText("Connect the red + line on the left side of breadboard A to the red + line on the right side of breadboard B.")).toBe(
      "Connect the red plus line on the left side of breadboard A to the red plus line on the right side of breadboard B.",
    );
  });
});
