import { describe, expect, it } from "vitest";
import text from "@/content/ui/snapshots.json";
import { loginPath, needsLogin, safeNextPath } from "@/lib/auth/rules";
import { readShared, shareUrl, sharePath } from "@/lib/snapshots/share";

const id = "8f14e45f-ceea-4f6a-9b1e-2c2d4e6f8a10";

describe("share link", () => {
  it("is /s/<snapshot id>", () => {
    expect(sharePath(id)).toBe(`/s/${id}`);
  });

  it("is the full address when the page origin is known", () => {
    expect(shareUrl("https://jumper.example", id)).toBe(`https://jumper.example/s/${id}`);
    expect(shareUrl("https://jumper.example/", id)).toBe(`https://jumper.example/s/${id}`);
  });

  it("needs a log-in (issue #183)", () => {
    expect(needsLogin(sharePath(id))).toBe(true);
    expect(needsLogin("/s")).toBe(true);
    expect(needsLogin("/snapshots")).toBe(true);
  });

  it("goes back to the shared build after the log-in", () => {
    expect(loginPath(sharePath(id))).toBe(`/login?next=${encodeURIComponent(`/s/${id}`)}`);
    expect(safeNextPath(new URLSearchParams(loginPath(sharePath(id)).split("?")[1]).get("next"))).toBe(`/s/${id}`);
    expect(loginPath("/lobby")).toBe("/login");
    expect(loginPath("/")).toBe("/login");
  });
});

describe("share text", () => {
  it("comes from content/ui/snapshots.json", () => {
    expect(text.share.switch).toBe("Anyone with the link who logs in to Jumper can see this build");
    for (const key of ["button", "heading", "text", "copy", "copied", "off", "native", "failed"] as const) {
      expect(text.share[key].length).toBeGreaterThan(0);
    }
    expect(text.shared.not_shared).toBe("This build is not shared");
    expect(text.shared.make_your_own).toBe("Make your own on Jumper");
  });
});

describe("readShared", () => {
  const row = {
    id,
    title: "Ears wired",
    notes: "It works",
    wiring: { version: 1, parts: [] },
    passed: true,
    mistake_count: 2,
    created_at: "2026-10-28T10:00:00Z",
    level_position: 2,
    level_title: "Ears",
    project_slug: "perch",
    owner_name: "Hanif",
  };

  it("reads the row that get_shared_snapshot gives", () => {
    expect(readShared([row])?.title).toBe("Ears wired");
    expect(readShared([row])?.owner_name).toBe("Hanif");
  });

  it("gives null when the function gives no row (not shared, deleted or unknown)", () => {
    expect(readShared([])).toBeNull();
    expect(readShared(null)).toBeNull();
  });

  it("allows an owner with no display name", () => {
    expect(readShared([{ ...row, owner_name: null }])?.owner_name).toBeNull();
  });
});
