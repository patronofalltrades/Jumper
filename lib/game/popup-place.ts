// Where the task pop-up goes on a laptop (TRD 5.3). Pure rules: no React, no 3D code.
// The pop-up hangs over the target pin. In quiet build mode (issue #218) it also has the how-to line, the note of the
// task before and a new word, so it is taller. It must not cover the holes that the learner must click.

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/**
 * The point of the bottom center of the card, in pixels of the board view.
 * `anchor`: the target pin. `avoid`: the points that the learner must click (the holes of the yellow arrow).
 * `top`: the card stays below this line. `edge`: the space between the card and the edges of the view.
 * The card goes beside the pin, on the right or on the left: the first side that covers no point wins.
 * If each side covers a point, the place that covers the fewest points wins: above the pin (this covers the pin
 * only), then the right, then the left.
 */
export function cardPlace(anchor: Point, card: Size, view: Size, avoid: readonly Point[], top: number, edge: number): [number, number] {
  const half = card.width / 2 + edge;
  const side = card.width / 2 + 3 * edge;
  const clamp = (x: number, y: number): [number, number] => [
    Math.min(Math.max(x, half), view.width - half),
    Math.min(Math.max(y, card.height + top), view.height - edge),
  ];
  const beside = anchor.y + card.height / 2;
  const places = [
    ...(anchor.y - card.height >= top ? [clamp(anchor.x, anchor.y)] : []),
    clamp(anchor.x + side, beside),
    clamp(anchor.x - side, beside),
  ];
  // A point is covered when it is in the card, or less than `edge` from it.
  const covered = ([x, y]: [number, number]) =>
    [anchor, ...avoid].filter((p) => Math.abs(p.x - x) < card.width / 2 + edge && p.y > y - card.height - edge && p.y < y + edge).length;
  let best = places[0];
  for (const place of places) if (covered(place) < covered(best)) best = place;
  return best;
}
