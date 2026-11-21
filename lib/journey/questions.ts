import { z } from "zod";

// The questions of Compare views (TRD addendum 6.5): the first-check question after the fault clip (F1-R5) and the
// transfer question on the photo of a different layout (F1-R6). The answer key names an option, and an option can name
// a connection of the map, so a different position with the same connection is correct (F1-AC4). Pure: no React.

const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);

export const questionSchema = z
  .object({
    id: slug,
    kind: z.enum(["first-check", "transfer"]),
    /** The key of the photo in `media.photos` that the question shows. */
    photo: z.string().min(1).optional(),
    prompt: z.string().min(1),
    options: z
      .array(
        z.object({
          id: slug,
          text: z.string().min(1),
          correct: z.boolean(),
          feedback: z.string().min(1),
          /** The connection of the map that this option names. */
          connection: slug.optional(),
        }),
      )
      .min(2),
    /** Hints in steps. The learner opens them one at a time. */
    hints: z.array(z.string().min(1)).default([]),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, { message: "A question has one correct option." })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, { message: "Each option id occurs one time." });
export type Question = z.infer<typeof questionSchema>;

/** The questions of a lesson file. A lesson with no questions gives an empty list. */
export const readQuestions = (questions: unknown[] | undefined): Question[] => z.array(questionSchema).parse(questions ?? []);

/** The answers to one question. The first answer never changes (F1-R6). */
export type Answers = {
  first: string | null;
  firstCorrect: boolean | null;
  /** The last answer. The question is done when it is the correct option. */
  last: string | null;
  hints: number;
  done: boolean;
};

export const noAnswers: Answers = { first: null, firstCorrect: null, last: null, hints: 0, done: false };

export type AnswerEvent = { type: "answer"; option: string } | { type: "hint" };

/** The next state. An unknown option, an answer after the end and a hint that does not exist change nothing. */
export function answerQuestion(question: Question, state: Answers, event: AnswerEvent): Answers {
  if (state.done) return state;
  if (event.type === "hint") return state.hints < question.hints.length ? { ...state, hints: state.hints + 1 } : state;
  const option = question.options.find((o) => o.id === event.option);
  if (!option) return state;
  const first = state.first === null;
  return {
    ...state,
    first: first ? option.id : state.first,
    firstCorrect: first ? option.correct : state.firstCorrect,
    last: option.id,
    done: option.correct,
  };
}

/** The record of a question: the first answer, the final answer and the help, as separate values (F1-R6, F1-AC3). */
export function answerRecord(state: Answers) {
  return { first: state.first, firstCorrect: state.firstCorrect, final: state.last, finalCorrect: state.done, hintsUsed: state.hints, helped: state.hints > 0 };
}

/** The feedback of the last answer, or null before the first answer. */
export const lastFeedback = (question: Question, state: Answers) => question.options.find((o) => o.id === state.last)?.feedback ?? null;
