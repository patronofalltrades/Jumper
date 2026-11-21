import { describe, expect, it } from "vitest";
import { isLive, markSeen, news, NEWS_KEY, newsItem, readSeen, unseen, type NewsItem, type NewsStorage } from "@/lib/game/news";

const item = (over: Partial<NewsItem>): NewsItem => ({ id: "x", title: "T", text: "t", released: "2026-11-12", until: "2026-12-21", audience: "visitor", pr: 1, ...over });

function memory(): NewsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe("content/news.json", () => {
  it("has the 6 items of the sprint, each with a unique id", () => {
    const ids = news.items.map((i) => i.id);
    expect(ids).toEqual(["board-hero", "scroll-build", "landing-sections", "onboarding-board", "datasheet-cards", "share-login"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has 4 visitor items and 2 learner items", () => {
    expect(news.items.filter((i) => i.audience === "visitor")).toHaveLength(4);
    expect(news.items.filter((i) => i.audience === "learner")).toHaveLength(2);
  });
  it("starts each item before it stops", () => {
    for (const i of news.items) expect(i.until === undefined || i.released <= i.until).toBe(true);
  });
});

describe("isLive", () => {
  it("shows from released to until, both days included", () => {
    const i = item({});
    expect(isLive(i, "2026-11-11")).toBe(false);
    expect(isLive(i, "2026-11-12")).toBe(true);
    expect(isLive(i, "2026-12-21")).toBe(true);
    expect(isLive(i, "2026-12-22")).toBe(false);
  });
  it("has no end with no until", () => {
    expect(isLive(item({ until: undefined }), "2030-01-01")).toBe(true);
  });
});

describe("unseen", () => {
  const items = [item({ id: "a" }), item({ id: "b" }), item({ id: "c", audience: "learner" }), item({ id: "d", released: "2026-12-01" })];
  it("gives the live items of the audience that are not seen", () => {
    expect(unseen(items, ["a"], "visitor", "2026-11-21").map((i) => i.id)).toEqual(["b"]);
    expect(unseen(items, [], "learner", "2026-11-21").map((i) => i.id)).toEqual(["c"]);
    expect(unseen(items, [], "visitor", "2026-12-02").map((i) => i.id)).toEqual(["a", "b", "d"]);
  });
});

describe("newsItem", () => {
  it("finds an item by its id", () => {
    expect(newsItem("share-login")?.pr).toBe(187);
    expect(newsItem("nothing")).toBeUndefined();
  });
});

describe("the seen list of a visitor", () => {
  it("is empty at the start, and keeps each id one time", () => {
    const s = memory();
    expect(readSeen(s)).toEqual([]);
    markSeen(s, "board-hero");
    markSeen(s, "board-hero");
    markSeen(s, "scroll-build");
    expect(readSeen(s)).toEqual(["board-hero", "scroll-build"]);
    expect(JSON.parse(s.data.get(NEWS_KEY)!)).toEqual(["board-hero", "scroll-build"]);
  });
  it("gives null with no storage, so no spotlight shows", () => {
    expect(readSeen(null)).toBeNull();
    expect(() => markSeen(null, "a")).not.toThrow();
  });
  it("gives null when the storage throws or has bad JSON, and an empty list for JSON that is not a list", () => {
    const broken: NewsStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readSeen(broken)).toBeNull();
    expect(() => markSeen(broken, "a")).not.toThrow();
    const s = memory();
    s.data.set(NEWS_KEY, "{bad");
    expect(readSeen(s)).toBeNull();
    s.data.set(NEWS_KEY, JSON.stringify({ not: "a list" }));
    expect(readSeen(s)).toEqual([]);
  });
});
