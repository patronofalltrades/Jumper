"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createSnapshot } from "@/app/actions/snapshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import text from "@/content/ui/snapshots.json";
import type { Part } from "@/lib/circuit/parts";
import { fieldErrors, readSnapshotForm, snapshotFormSchema, type FieldErrors } from "@/lib/snapshots/form";
import { toWiring } from "@/lib/snapshots/wiring";
import { boxClass, Field, invalid } from "./field";

export type BoardToSave = { parts: Part[]; session: string | null; mistakes: number };
/** A level that the learner can pick in the form. */
export type LevelOption = { id: number; position: number; title: string };

const t = text.save;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/**
 * The Save snapshot button and its form. `read` gives the board at the moment of the save, or null if there is none.
 * `levels` are the levels of the project; the learner must pick one. `children` is the button that opens the form.
 */
export function SaveSnapshot({ levels, read, children }: { levels: LevelOption[]; read: () => BoardToSave | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSaved(null);
      setFields({});
      setError(read() ? null : t.no_board);
    }
  };

  // onSubmit, not a form action: React clears a form after its action, and the learner must keep what they wrote.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const board = read();
    if (!board) return setError(t.no_board);
    const values = readSnapshotForm(form);
    // The same schema as the server: the learner sees the message at once, with no request.
    const errors = fieldErrors(snapshotFormSchema, values);
    setFields(errors);
    if (Object.keys(errors).length) return;
    start(async () => {
      const { levelId = 0, ...rest } = values;
      const result = await createSnapshot({ ...rest, levelId, sessionId: board.session, wiring: toWiring(board.parts), mistakes: board.mistakes });
      setError(result.error ?? null);
      setFields(result.fieldErrors ?? {});
      if (result.id) setSaved(result.id);
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-md -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-foreground shadow-panel outline-none">
          <Dialog.Title className="text-xl font-extrabold tracking-tight">{t.heading}</Dialog.Title>
          {saved ? (
            <>
              <Dialog.Description className="text-sm">{t.done}</Dialog.Description>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline">{t.cancel}</Button>
                </Dialog.Close>
                <Button asChild>
                  <Link href={`/snapshots/${saved}`}>{t.open}</Link>
                </Button>
              </div>
            </>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="flex flex-col gap-4"
              onChange={(e) => {
                if (error !== t.no_board) setError(null);
                // A change to a field removes its message. The others stay until the next Save.
                const name = (e.target as Element).getAttribute("name") ?? "";
                const field = name === "level" ? "levelId" : name;
                setFields((f) => ({ ...f, [field]: undefined }));
              }}
            >
              <Dialog.Description className="text-sm text-muted-foreground">{t.text}</Dialog.Description>
              <Field id="snapshot-level" label={t.level} error={fields.levelId}>
                <select id="snapshot-level" name="level" defaultValue="" className={`${boxClass} h-11`} {...invalid("snapshot-level", fields.levelId)}>
                  <option value="" disabled>
                    {t.level_hint}
                  </option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {fill(text.list.level, { level: l.position })} · {l.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="snapshot-title" label={t.title} error={fields.title}>
                <Input id="snapshot-title" name="title" placeholder={t.title_hint} autoComplete="off" {...invalid("snapshot-title", fields.title)} />
              </Field>
              <Field id="snapshot-notes" label={t.notes} error={fields.notes}>
                <textarea id="snapshot-notes" name="notes" rows={4} placeholder={t.notes_hint} className={boxClass} {...invalid("snapshot-notes", fields.notes)} />
              </Field>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    {t.cancel}
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={pending}>
                  {pending ? t.saving : t.submit}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
