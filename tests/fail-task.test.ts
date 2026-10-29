import { describe, expect, it } from "vitest";
import { loadProjects } from "@/lib/content/load";
import type { PlanTask } from "@/lib/game/engine";
import { taskOfFailure } from "@/lib/game/fail-task";

const perch = loadProjects().find((p) => p.slug === "perch")!;
const level = (position: number) => perch.levels.find((l) => l.position === position)!;
const tasksOf = (position: number): PlanTask[] => level(position).tasks.map((t) => ({ target: t.target, xp: t.xp }));

describe("taskOfFailure: the task of a failed Check (issue #91)", () => {
  it("finds the wire task whose two ends are the failed connection", () => {
    expect(taskOfFailure(tasksOf(1), { code: "missing_ground", connection: { a: "esp.GND", b: "bbA.-" } })).toBe(4);
  });

  it("finds the task in either order", () => {
    expect(taskOfFailure(tasksOf(1), { code: "missing_ground", connection: { a: "bbA.-", b: "esp.GND" } })).toBe(4);
  });

  it("finds the task when the other side of a button is used", () => {
    // Task 3 of level 2 is "btn1.2 to esp.GND". The learner used side 1 of the button, so the failed connection says btn1.1.
    expect(taskOfFailure(tasksOf(2), { code: "wrong_pin", connection: { a: "btn1.1", b: "esp.GND" } })).toBe(2);
  });

  it("finds the task when the other side of a resistor is used", () => {
    // Task 6 of level 2 is "esp.GPIO2 to r1.1". The failed connection says r1.2.
    expect(taskOfFailure(tasksOf(2), { code: "wrong_pin", connection: { a: "r1.2", b: "esp.GPIO2" } })).toBe(5);
  });

  it("finds the place task of a part whose lead is a rule, such as the speaker", () => {
    // Task 8 of level 4 places the speaker with its leads in amp1.OUT+ and amp1.OUT−.
    expect(taskOfFailure(tasksOf(4), { code: "wrong_pin", connection: { a: "spk1.+", b: "amp1.OUT+" } })).toBe(7);
  });

  it("gives no task for a forbid rule, even when its ends match a task", () => {
    expect(taskOfFailure(tasksOf(2), { code: "button_bypassed", connection: { a: "esp.GPIO1", b: "btn1.1" } })).toBeNull();
  });

  it("gives no task for a connection that no task of this level makes, such as a rule of an earlier level", () => {
    expect(taskOfFailure(tasksOf(2), { code: "wrong_pin", connection: { a: "esp.3V3", b: "bbA.+" } })).toBeNull();
  });

  it("finds a task for every require connection of each Perch level", () => {
    for (const l of perch.levels) {
      for (const connection of l.rules.require) {
        expect(taskOfFailure(tasksOf(l.position), { code: "wrong_pin", connection }), `level ${l.position}: ${connection.a} ${connection.b}`).not.toBeNull();
      }
    }
  });
});
