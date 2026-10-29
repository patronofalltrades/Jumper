"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addNote, deleteNote, leaveProject } from "@/app/actions/collaborate";
import { Button } from "@/components/ui/button";
import { boxClass, Field, invalid } from "@/components/snapshots/field";
import text from "@/content/ui/collaborate.json";
import { fieldErrors, noteSchema, type FieldErrors } from "@/lib/collaborate/invite";

export type Note = { id: string; body: string; created_at: string; author: string; mine: boolean };

const t = text.notes;

/** The notes under a snapshot, and the form to add one. Each person deletes only their own notes. */
export function Notes({ snapshotId, notes }: { snapshotId: string; notes: Note[] }) {
  const [fields, setFields] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    const errors = fieldErrors(noteSchema, { body });
    setFields(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    start(async () => {
      const result = await addNote({ snapshotId, body });
      setFields(result.fieldErrors ?? {});
      setError(result.error ?? null);
      if (!result.error && !result.fieldErrors) form.reset();
    });
  };

  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
      <h2 id="notes-heading" className="text-xl font-extrabold tracking-tight">
        {t.heading}
      </h2>
      {notes.length ? (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <Field id="note-body" label={t.add} error={fields.body}>
          <textarea id="note-body" name="body" rows={3} placeholder={t.add_hint} className={boxClass} {...invalid("note-body", fields.body)} />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="min-h-11 self-start">
          {pending ? t.sending : t.submit}
        </Button>
      </form>
    </section>
  );
}

function NoteItem({ note }: { note: Note }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const date = new Date(note.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <li className="flex flex-col gap-1 rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {note.mine ? t.you : note.author} · {date}
        </span>
        {note.mine && (
          <Button
            variant="outline"
            disabled={pending}
            aria-label={t.delete_label}
            className="min-h-11 px-3"
            onClick={() =>
              start(async () => {
                const result = await deleteNote(note.id);
                setError(result.error ?? null);
              })
            }
          >
            {t.delete}
          </Button>
        )}
      </div>
      <p className="text-sm break-words whitespace-pre-wrap">{note.body}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

/** A collaborator leaves the project. The action opens the lobby. */
export function LeaveButton({ id, label }: { id: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={pending}
        className="min-h-11 self-start"
        onClick={() =>
          start(async () => {
            const result = await leaveProject(id);
            setError(result?.error ?? null);
          })
        }
      >
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
