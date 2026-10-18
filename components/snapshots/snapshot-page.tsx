"use client";

import dynamic from "next/dynamic";
import { AlertDialog } from "radix-ui";
import { useLayoutEffect, useState, useTransition, type FormEvent } from "react";
import { deleteSnapshot, updateSnapshot } from "@/app/actions/snapshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import text from "@/content/ui/snapshots.json";
import type { Part } from "@/lib/circuit/parts";
import { boardStore } from "@/lib/game/board-store";
import { fieldErrors, readSnapshotForm, snapshotEditSchema, type FieldErrors } from "@/lib/snapshots/form";
import { boxClass, Field, invalid } from "./field";

// Only the build and snapshot pages load three.js (TRD 12.1).
const BuildScene = dynamic(() => import("@/components/scene/build-scene"), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-muted-foreground">Loading the board…</p>,
});

/** The saved board in 3D, view only: the camera turns and the nets glow, but taps do not change it. */
export function SnapshotBoard({ id, parts }: { id: string; parts: Part[] }) {
  // Before paint, and before the scene loads, so the scene never shows the board of another page.
  useLayoutEffect(() => boardStore.getState().open(`snapshot/${id}`, { parts, readOnly: true }), [id, parts]);
  return <BuildScene />;
}

/** The title and the notes, with Save changes. */
export function EditSnapshot({ id, title, notes }: { id: string; title: string; notes: string }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [pending, start] = useTransition();
  const t = text.save;

  // onSubmit, not a form action: React clears a form after its action, and the learner must keep what they wrote.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { title, notes } = readSnapshotForm(new FormData(e.currentTarget));
    // The same schema as the server: the learner sees the message at once, with no request.
    const errors = fieldErrors(snapshotEditSchema, { title, notes });
    setFields(errors);
    if (Object.keys(errors).length) return;
    start(async () => {
      const result = await updateSnapshot({ id, title, notes });
      setFields(result.fieldErrors ?? {});
      if (result.error) setMessage({ ok: false, text: result.error });
      else if (!result.fieldErrors) setMessage({ ok: true, text: text.page.saved });
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-3"
      onChange={(e) => {
        setMessage(null);
        // A change to a field removes its message. The others stay until the next Save.
        const name = (e.target as Element).getAttribute("name") ?? "";
        setFields((f) => ({ ...f, [name]: undefined }));
      }}
    >
      <Field id="title" label={t.title} error={fields.title}>
        <Input id="title" name="title" defaultValue={title} className="text-lg font-bold" {...invalid("title", fields.title)} />
      </Field>
      <Field id="notes" label={t.notes} error={fields.notes}>
        <textarea id="notes" name="notes" defaultValue={notes} rows={6} placeholder={t.notes_hint} className={boxClass} {...invalid("notes", fields.notes)} />
      </Field>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-primary" : "text-sm font-medium text-destructive"}>
          {message.text}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t.saving : text.page.edit}
      </Button>
    </form>
  );
}

/** Delete, after a confirm dialog. */
export function DeleteSnapshot({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = text.page;

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button variant="outline" className="mt-2 self-start border-destructive text-destructive">
          {t.delete}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-sm -translate-y-1/2 flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-foreground shadow-panel">
          <AlertDialog.Title className="text-xl font-extrabold tracking-tight">{t.delete_heading}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted-foreground">{t.delete_text}</AlertDialog.Description>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">{text.save.cancel}</Button>
            </AlertDialog.Cancel>
            <Button
              disabled={pending}
              className="border-[var(--danger-deep,#9a2f21)] bg-destructive text-white"
              onClick={() =>
                start(async () => {
                  // On success the action opens the list, so only an error comes back.
                  const result = await deleteSnapshot(id);
                  setError(result.error ?? null);
                })
              }
            >
              {t.delete_yes}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
