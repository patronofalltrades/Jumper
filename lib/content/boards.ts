import { boardsSchema, type Boards } from "./schema";

// The finished board of each level, from content/boards/<project>.json. A project without the file has no boards.
export async function loadBoards(slug: string): Promise<Boards> {
  if (!/^[a-z0-9-]+$/.test(slug)) return { levels: {} };
  const file = await import(`../../content/boards/${slug}.json`).catch(() => null);
  return file ? boardsSchema.parse(file.default) : { levels: {} };
}

/**
 * The levels whose parts a level starts with: all the levels before it, or the list in `start`. In Arduino Foundations,
 * level 3 starts with the board of level 1 only, so that level 4 can put the button and the LED together.
 */
export const startLevels = (boards: Boards, position: number) =>
  boards.start?.[position] ??
  Object.keys(boards.levels)
    .map(Number)
    .filter((level) => level < position);

/** The ready-made board at the start of a level: the parts of its start levels, in level order. */
export const startBoard = (boards: Boards, position: number) => {
  const levels = new Set(startLevels(boards, position));
  return Object.entries(boards.levels)
    .filter(([level]) => levels.has(Number(level)))
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([, parts]) => parts);
};

/** True when a level starts with the board of the level before it. Then the browser can give the learner's own board. */
export const carriesBoard = (boards: Boards, position: number) => position > 1 && startLevels(boards, position).includes(position - 1);
