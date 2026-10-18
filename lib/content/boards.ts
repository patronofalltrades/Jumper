import { boardsSchema, type Boards } from "./schema";

// The finished board of each level, from content/boards/<project>.json. A project without the file has no boards.
export async function loadBoards(slug: string): Promise<Boards> {
  if (!/^[a-z0-9-]+$/.test(slug)) return { levels: {} };
  const file = await import(`../../content/boards/${slug}.json`).catch(() => null);
  return file ? boardsSchema.parse(file.default) : { levels: {} };
}

/** The ready-made board at the start of a level: the parts of all the levels before it. */
export const startBoard = (boards: Boards, position: number) =>
  Object.entries(boards.levels)
    .filter(([level]) => Number(level) < position)
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([, parts]) => parts);
