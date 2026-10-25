import { describe, expect, it, vi } from "vitest";
import { opensLevelComplete, replayProgress, replayStart, withFreshSession } from "@/lib/game/check-flow";

describe("Level complete opens", () => {
  it("only when the browser check passed and the server completed the session", () => {
    expect(opensLevelComplete(true, true)).toBe(true);
    expect(opensLevelComplete(true, false)).toBe(false);
    expect(opensLevelComplete(true, undefined)).toBe(false);
  });

  it("never for a failed browser check, also when the server says completed (the replay bug of issue #62)", () => {
    expect(opensLevelComplete(false, true)).toBe(false);
    expect(opensLevelComplete(false, false)).toBe(false);
  });
});

describe("withFreshSession", () => {
  it("sends once when the session is open", async () => {
    const send = vi.fn(async (session: string) => ({ completed: true, closed: false, session }));
    const restart = vi.fn(async () => "new");
    const out = await withFreshSession("old", send, restart);
    expect(send).toHaveBeenCalledTimes(1);
    expect(restart).not.toHaveBeenCalled();
    expect(out).toEqual({ result: { completed: true, closed: false, session: "old" }, session: "old" });
  });

  it("starts a new session and sends again, one time, when the session is closed", async () => {
    const send = vi.fn(async (session: string) => (session === "old" ? { closed: true, fails: undefined } : { closed: false, fails: 1 }));
    const out = await withFreshSession("old", send, async () => "new");
    expect(send.mock.calls.map(([s]) => s)).toEqual(["old", "new"]);
    expect(out).toEqual({ result: { closed: false, fails: 1 }, session: "new" });
  });

  it("does not send a third time when the new session is closed too", async () => {
    const send = vi.fn(async () => ({ closed: true }));
    const out = await withFreshSession("old", send, async () => "new");
    expect(send).toHaveBeenCalledTimes(2);
    expect(out.result).toEqual({ closed: true });
  });

  it("gives the closed result when no new session can start", async () => {
    const send = vi.fn(async () => ({ closed: true }));
    const out = await withFreshSession("old", send, async () => undefined);
    expect(send).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ result: { closed: true }, session: "old" });
  });
});

describe("replayStart", () => {
  const now = Date.parse("2026-10-25T12:00:00.000Z");
  it("keeps the time when the level was opened", () => {
    expect(replayStart("2026-10-25T11:58:00.000Z", now)).toBe("2026-10-25T11:58:00.000Z");
  });
  it("drops a time that is not valid, in the future, or more than a day old", () => {
    expect(replayStart(undefined, now)).toBeUndefined();
    expect(replayStart("yesterday", now)).toBeUndefined();
    expect(replayStart("2026-10-25T12:05:00.000Z", now)).toBeUndefined();
    expect(replayStart("2026-10-24T11:59:00.000Z", now)).toBeUndefined();
  });
});

describe("replayProgress", () => {
  const progress = { xp: 70, tasksDone: 7 };
  it("gives a passed level 0 XP, because a replay gives no XP", () => {
    expect(replayProgress(progress, true)).toEqual({ xp: 0, tasksDone: 7 });
  });
  it("does not change a level that was not passed", () => {
    expect(replayProgress(progress, false)).toBe(progress);
    expect(replayProgress(progress, undefined)).toBe(progress);
  });
});
