import { describe, expect, it } from "vitest";
import { CARDS, CARDS_LOOP, CARDS_STILL, INTRO, conveyor, taskDone, wireDrawn } from "@/components/landing/hero-timing";
import text from "@/content/ui/landing.json";

describe("hero wire under the headline", () => {
  it("is hidden at the start, draws during the intro, and then stays", () => {
    expect(wireDrawn(0)).toBe(0);
    expect(wireDrawn(24)).toBe(0.5);
    expect(wireDrawn(INTRO.duration)).toBe(1);
  });
});

describe("hero task cards", () => {
  it("moves the track one card in each step", () => {
    expect(conveyor(0).position).toBe(-1);
    expect(conveyor(CARDS.move).position).toBe(0);
    expect(conveyor(CARDS.step + CARDS.move).position).toBe(1);
  });

  it("is done for cards before the front card, and not done for cards after it", () => {
    const frame = CARDS.step * 2 + 10;
    expect(taskDone(1, frame)).toBe(1);
    expect(taskDone(2, frame)).toBe(0);
    expect(taskDone(3, frame)).toBe(0);
    expect(taskDone(2, CARDS_STILL)).toBe(1);
  });

  it("has one card text for each kind, so the loop shows each kind one time", () => {
    expect(text.hero.cards).toHaveLength(CARDS.kinds);
    expect(new Set(text.hero.cards.map((c) => c.kind)).size).toBe(CARDS.kinds);
    expect(CARDS_LOOP).toBe(CARDS.step * CARDS.kinds);
  });
});
