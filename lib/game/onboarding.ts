// The onboarding flow before sign-up (/start, issue #152). Pure TypeScript: the questions to ask, and the project that
// the lobby opens first. The answers stay in the browser; only the start project goes to the lobby, in a cookie.

export type QuestionId = "build" | "why" | "level" | "goal" | "start";

export type Answers = Partial<Record<QuestionId, string>>;

export const START_COOKIE = "jumper_start";
const ONE_YEAR = 60 * 60 * 24 * 365;
const BASICS = "arduino-foundations";

/** The questions in order. "Where to start" is only for Perch: Arduino Foundations is already the basics. */
export function questionIds(answers: Answers): QuestionId[] {
  const ids: QuestionId[] = ["build", "why", "level", "goal"];
  return answers.build === "perch" ? [...ids, "start"] : ids;
}

/** The project that the lobby's Continue card opens first, or null when the answers name no available project. */
export function startProject(answers: Answers, available: string[]): string | null {
  const slug = answers.build === "perch" && answers.start === "basics" ? BASICS : answers.build;
  return slug && available.includes(slug) ? slug : null;
}

/** The cookie text that the browser sets after the questions. */
export const startCookie = (slug: string) => `${START_COOKIE}=${slug}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
