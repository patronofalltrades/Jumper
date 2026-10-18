import { describe, expect, it } from "vitest";
import text from "@/content/ui/snapshots.json";
import { fieldErrors, readSnapshotForm, snapshotEditSchema, snapshotFormSchema } from "@/lib/snapshots/form";

const errors = text.save.errors;
const good = { levelId: 3, title: "Ears wired", notes: "SD goes to GPIO 6." };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

describe("snapshot form", () => {
  it("accepts a level, a title and notes", () => {
    expect(fieldErrors(snapshotFormSchema, good)).toEqual({});
  });

  it("accepts empty notes", () => {
    expect(fieldErrors(snapshotFormSchema, { ...good, notes: "" })).toEqual({});
  });

  it("asks for a title when the title is empty or only spaces", () => {
    expect(fieldErrors(snapshotFormSchema, { ...good, title: "" })).toEqual({ title: errors.title_empty });
    expect(fieldErrors(snapshotFormSchema, { ...good, title: "   " })).toEqual({ title: errors.title_empty });
  });

  it("accepts a title of 80 characters and refuses 81", () => {
    expect(fieldErrors(snapshotFormSchema, { ...good, title: "a".repeat(80) })).toEqual({});
    expect(fieldErrors(snapshotFormSchema, { ...good, title: "a".repeat(81) })).toEqual({ title: errors.title_long });
  });

  it("refuses notes of more than 2000 characters", () => {
    expect(fieldErrors(snapshotFormSchema, { ...good, notes: "a".repeat(2000) })).toEqual({});
    expect(fieldErrors(snapshotFormSchema, { ...good, notes: "a".repeat(2001) })).toEqual({ notes: errors.notes_long });
  });

  it("asks for a level when the learner did not select one", () => {
    expect(fieldErrors(snapshotFormSchema, { ...good, levelId: undefined })).toEqual({ levelId: errors.level });
    expect(fieldErrors(snapshotFormSchema, { ...good, levelId: 0 })).toEqual({ levelId: errors.level });
  });

  it("gives one message for each wrong field at the same time", () => {
    expect(fieldErrors(snapshotFormSchema, { levelId: undefined, title: "", notes: "a".repeat(2001) })).toEqual({
      levelId: errors.level,
      title: errors.title_empty,
      notes: errors.notes_long,
    });
  });

  it("does not ask for a level in the edit form", () => {
    expect(fieldErrors(snapshotEditSchema, { title: "Ears wired", notes: "" })).toEqual({});
    expect(fieldErrors(snapshotEditSchema, { title: "", notes: "" })).toEqual({ title: errors.title_empty });
  });

  it("reads the level select: empty is no level, else the level id", () => {
    expect(readSnapshotForm(form({ level: "", title: "x", notes: "" })).levelId).toBeUndefined();
    expect(readSnapshotForm(form({ level: "7", title: "x", notes: "" }))).toEqual({ levelId: 7, title: "x", notes: "" });
    expect(readSnapshotForm(form({}))).toEqual({ levelId: undefined, title: "", notes: "" });
  });
});
