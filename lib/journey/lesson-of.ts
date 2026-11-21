import arduinoBoards from "../../content/boards/arduino-foundations.json";
import afLed from "../../content/lessons/af-led.json";
import type { Part } from "../circuit/parts.ts";
import { boardsSchema, lessonSchema, type Lesson } from "../content/schema.ts";

// The lesson of a level, for the browser (TRD addendum 6.5): a level has Compare views only when it has a lesson file.
// The files are listed here, so the browser gets them with the page and needs no request.

const LESSONS = [{ lesson: lessonSchema.parse(afLed), boards: boardsSchema.parse(arduinoBoards) }];

export type LevelLesson = {
  lesson: Lesson;
  /** The reference board: the parts of the baseline levels. */
  reference: Part[];
};

/** The lesson of a level with its reference board, or null when the level has no lesson file. */
export function lessonOf(project: string, level: number): LevelLesson | null {
  const found = LESSONS.find((l) => l.lesson.project === project && l.lesson.level === level);
  if (!found) return null;
  return { lesson: found.lesson, reference: found.lesson.baseline.levels.flatMap((n) => (found.boards.levels[n] ?? []) as Part[]) };
}
