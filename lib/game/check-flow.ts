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
