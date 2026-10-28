import { describe, expect, it } from "vitest";
import text from "@/content/ui/profile.json";
import { canDelete, clearUserSaves, newEmailSchema } from "@/lib/profile/account";

const errors = text.change_email.errors;
const message = (input: unknown, current = "a@test.local") => {
  const parsed = newEmailSchema(current).safeParse({ email: input });
  return parsed.success ? undefined : parsed.error.issues[0].message;
};

describe("new email", () => {
  it("accepts an email, and trims it and makes it lower case", () => {
    expect(newEmailSchema("a@test.local").parse({ email: "  New@Test.local " })).toEqual({ email: "new@test.local" });
  });

  it("asks for an email when the field is empty or has only spaces", () => {
    expect(message("")).toBe(errors.empty);
    expect(message("   ")).toBe(errors.empty);
    expect(message(null)).toBe(errors.empty);
  });

  it("refuses an email that is not an email", () => {
    expect(message("not-an-email")).toBe(errors.invalid);
    expect(message("a@")).toBe(errors.invalid);
  });

  it("refuses the email that the learner has now, in any case", () => {
    expect(message("a@test.local")).toBe(errors.same);
    expect(message(" A@Test.Local ")).toBe(errors.same);
    expect(message("b@test.local")).toBeUndefined();
  });
});

describe("canDelete", () => {
  it("is true only for the word DELETE, with spaces around it allowed", () => {
    expect(canDelete("DELETE")).toBe(true);
    expect(canDelete("  DELETE ")).toBe(true);
  });

  it("is false for anything else", () => {
    for (const typed of ["", "delete", "Delete", "DELET", "DELETE x", "xDELETE", "DELETE DELETE"]) {
      expect(canDelete(typed)).toBe(false);
    }
  });
});

describe("clearUserSaves", () => {
  const store = (keys: string[]) => {
    const map = new Map(keys.map((k) => [k, "x"]));
    return {
      get length() {
        return map.size;
      },
      key: (i: number) => [...map.keys()][i] ?? null,
      removeItem: (k: string) => void map.delete(k),
      keys: () => [...map.keys()],
    };
  };

  it("removes the saves of this user and keeps the other keys", () => {
    const s = store(["jumper:u1:perch/1", "jumper:u1:perch/2", "jumper:u2:perch/1", "theme", "jumper:u10:perch/1"]);
    clearUserSaves(s, "u1");
    expect(s.keys()).toEqual(["jumper:u2:perch/1", "theme", "jumper:u10:perch/1"]);
  });

  it("does nothing when the user has no saves", () => {
    const s = store(["theme"]);
    clearUserSaves(s, "u1");
    expect(s.keys()).toEqual(["theme"]);
  });
});
