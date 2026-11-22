import { describe, expect, it } from "vitest";
import { cardPlace } from "@/lib/game/popup-place";

// Issue #218 (quiet build mode): the task pop-up has more text, so it is taller. It must not cover the holes that the
// learner must click. A browser check found the pop-up on the end hole of a wire.

const view = { width: 1280, height: 580 };
const TOP = 72;
const EDGE = 8;
const inCard = (p: { x: number; y: number }, [x, y]: [number, number], card: { width: number; height: number }) =>
  Math.abs(p.x - x) < card.width / 2 && p.y > y - card.height && p.y < y;

describe("cardPlace", () => {
  it("goes beside the pin, on the right, when no hole is there", () => {
    expect(cardPlace({ x: 600, y: 400 }, { width: 320, height: 150 }, view, [], TOP, EDGE)).toEqual([600 + 160 + 24, 475]);
  });

  it("goes above the pin when each side covers a hole", () => {
    const avoid = [{ x: 700, y: 440 }, { x: 500, y: 440 }];
    expect(cardPlace({ x: 600, y: 400 }, { width: 320, height: 150 }, view, avoid, TOP, EDGE)).toEqual([600, 400]);
  });

  it("goes beside the pin when there is no space above, and does not cover the pin", () => {
    const anchor = { x: 445, y: 236 };
    const card = { width: 320, height: 330 };
    const place = cardPlace(anchor, card, view, [], TOP, EDGE);
    expect(place[0]).toBe(445 + 160 + 24);
    expect(inCard(anchor, place, card)).toBe(false);
  });

  it("goes to the left when the right side covers the end hole of the wire", () => {
    const anchor = { x: 445, y: 236 };
    const end = { x: 765, y: 250 };
    const card = { width: 320, height: 330 };
    const place = cardPlace(anchor, card, view, [end], TOP, EDGE);
    expect(place[0]).toBe(445 - 160 - 24);
    expect(inCard(end, place, card)).toBe(false);
    expect(inCard(anchor, place, card)).toBe(false);
  });

  it("stays inside the view", () => {
    const card = { width: 320, height: 330 };
    const [x, y] = cardPlace({ x: 20, y: 100 }, card, view, [], TOP, EDGE);
    expect(x).toBeGreaterThanOrEqual(card.width / 2 + EDGE);
    expect(x).toBeLessThanOrEqual(view.width - card.width / 2 - EDGE);
    expect(y - card.height).toBeGreaterThanOrEqual(TOP);
    expect(y).toBeLessThanOrEqual(view.height - EDGE);
  });

  it("takes the place that covers the fewest points when each place covers a point", () => {
    const anchor = { x: 640, y: 200 };
    const card = { width: 320, height: 330 };
    // Two points on the right, one on the left: the left side covers fewer.
    const avoid = [{ x: 820, y: 300 }, { x: 860, y: 320 }, { x: 460, y: 300 }];
    const [x] = cardPlace(anchor, card, view, avoid, TOP, EDGE);
    expect(x).toBeLessThan(anchor.x);
  });
});
