import { describe, expect, it } from "vitest";
import text from "@/content/ui/collaborate.json";
import { fieldErrors, inviteSchema, noteSchema } from "@/lib/collaborate/invite";

const errors = text.invite.errors;
const me = "hanif@example.com";

describe("invite form", () => {
  it("accepts the email of a friend", () => {
    expect(fieldErrors(inviteSchema(me), { email: "friend@example.com" })).toEqual({});
  });

  it("asks for an email when the field is empty or only spaces", () => {
    expect(fieldErrors(inviteSchema(me), { email: "" })).toEqual({ email: errors.empty });
    expect(fieldErrors(inviteSchema(me), { email: "   " })).toEqual({ email: errors.empty });
  });

  it("refuses text that is not an email", () => {
    expect(fieldErrors(inviteSchema(me), { email: "friend" })).toEqual({ email: errors.invalid });
    expect(fieldErrors(inviteSchema(me), { email: "friend@" })).toEqual({ email: errors.invalid });
  });

  it("refuses your own email, also with other capital letters and spaces", () => {
    expect(fieldErrors(inviteSchema(me), { email: me })).toEqual({ email: errors.own });
    expect(fieldErrors(inviteSchema(me), { email: "  Hanif@Example.com " })).toEqual({ email: errors.own });
  });

  it("gives the email with no spaces and in small letters", () => {
    const parsed = inviteSchema(me).parse({ email: "  Friend@Example.COM " });
    expect(parsed.email).toBe("friend@example.com");
  });
});

describe("note form", () => {
  it("accepts a note and removes the spaces around it", () => {
    expect(noteSchema.parse({ body: "  Check the GND wire.  " }).body).toBe("Check the GND wire.");
  });

  it("asks for a note when the note is empty or only spaces", () => {
    expect(fieldErrors(noteSchema, { body: "" })).toEqual({ body: text.notes.errors.empty });
    expect(fieldErrors(noteSchema, { body: "  " })).toEqual({ body: text.notes.errors.empty });
  });

  it("accepts a note of 1000 characters and refuses 1001", () => {
    expect(fieldErrors(noteSchema, { body: "a".repeat(1000) })).toEqual({});
    expect(fieldErrors(noteSchema, { body: "a".repeat(1001) })).toEqual({ body: text.notes.errors.long });
  });
});
