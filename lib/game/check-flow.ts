// Pure rules for the level Check when a session can be closed (issue #62). No React, no network.

/** A server answer that can say: this session is closed (completed or abandoned), start a new one. */
export type Closable = { closed?: boolean };

/** Level complete opens only when the browser check passed and the server completed the session. */
export const opensLevelComplete = (passed: boolean, completed: boolean | undefined) => passed && completed === true;

/**
 * Sends a request for a session. When the server says the session is closed, `restart` gives a new session id and
 * the request goes again, one time. Gives the last result and the session id that it used.
 */
export async function withFreshSession<R extends Closable>(
  session: string,
  send: (session: string) => Promise<R>,
  restart: () => Promise<string | undefined>,
): Promise<{ result: R; session: string }> {
  const first = await send(session);
  if (!first.closed) return { result: first, session };
  const fresh = await restart();
  if (!fresh) return { result: first, session };
  return { result: await send(fresh), session: fresh };
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * The time to give a replay session as its start: when the learner opened the level. Only a valid time that is not in the
 * future and not more than a day old. Else undefined, and the session starts now.
 */
export function replayStart(openedAt: string | undefined, now: number): string | undefined {
  const at = openedAt ? Date.parse(openedAt) : NaN;
  return Number.isFinite(at) && at <= now && at >= now - DAY ? openedAt : undefined;
}

/** A level that was passed gives no XP when it is played again, so its XP counter starts at 0. */
export const replayProgress = <P extends { xp: number }>(progress: P, passed: boolean | undefined): P => (passed ? { ...progress, xp: 0 } : progress);
