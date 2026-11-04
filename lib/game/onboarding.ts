// The onboarding flow before sign-up (/start, issue #152). Pure TypeScript: the questions to ask, and the project that
// the lobby opens first. The answers stay in the browser; only the start project goes to the lobby, in a cookie.
// The questions do not name projects: the "start" answer gives the project (its option names the slug in content).

export const QUESTION_IDS = ["make", "why", "level", "goal", "start"] as const;

export type QuestionId = (typeof QUESTION_IDS)[number];

export type Answers = Partial<Record<QuestionId, string>>;

/** An option of the "start" question: its value, and the project that it opens. */
export type StartOption = { value: string; project: string };

export const START_COOKIE = "jumper_start";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The project that the lobby's Continue card opens first, or null when the answers name no available project. */
export function startProject(answers: Answers, options: StartOption[], available: string[]): string | null {
  const slug = options.find((o) => o.value === answers.start)?.project;
  return slug && available.includes(slug) ? slug : null;
}

/** The "start" answer that opens a project, for a link such as /start?build=perch. Null when no option opens it. */
export function startAnswerFor(slug: string | null, options: StartOption[]): string | null {
  return options.find((o) => o.project === slug)?.value ?? null;
}

/** The cookie text that the browser sets after the questions. */
export const startCookie = (slug: string) => `${START_COOKIE}=${slug}; path=/; max-age=${ONE_YEAR}; samesite=lax`;

/** True when a visitor did not do the onboarding: the questions set the start cookie, so no cookie means no onboarding. */
export const needsOnboarding = (startCookieValue: string | undefined) => !startCookieValue;
