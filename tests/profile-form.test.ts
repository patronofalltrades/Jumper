import { describe, expect, it } from "vitest";
import text from "@/content/ui/profile.json";
import { avatarSrc, DEFAULT_AVATAR, profileSchema } from "@/lib/profile/form";

const errors = text.errors;
const message = (input: unknown) => {
  const parsed = profileSchema.safeParse(input);
  return parsed.success ? undefined : parsed.error.issues[0].message;
};

describe("profile form", () => {
  it("accepts a name and a character, and trims the name", () => {
    expect(profileSchema.parse({ display_name: "  Hanif ", avatar: "chip" })).toEqual({ display_name: "Hanif", avatar: "chip" });
  });

  it("asks for a name when the name is empty or only spaces", () => {
    expect(message({ display_name: "   ", avatar: "chip" })).toBe(errors.name_empty);
  });

  it("accepts a name of 40 characters and refuses 41", () => {
    expect(message({ display_name: "a".repeat(40), avatar: "chip" })).toBeUndefined();
    expect(message({ display_name: "a".repeat(41), avatar: "chip" })).toBe(errors.name_long);
  });

  it("refuses a character that is not in the list", () => {
    expect(message({ display_name: "Hanif", avatar: "r2d2" })).toBe(errors.avatar);
  });
});

describe("avatarSrc", () => {
  it("gives the image of a known character, and the default for an unknown one", () => {
    expect(avatarSrc("servo")).toBe("/avatars/servo.svg");
    expect(avatarSrc("r2d2")).toBe(`/avatars/${DEFAULT_AVATAR}.svg`);
    expect(avatarSrc(null)).toBe("/avatars/volt.svg");
  });
});
