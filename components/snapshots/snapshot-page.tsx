"use client";

import dynamic from "next/dynamic";
import { AlertDialog } from "radix-ui";
import { useLayoutEffect, useState, useTransition } from "react";
import { deleteSnapshot, updateSnapshot } from "@/app/actions/snapshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import text from "@/content/ui/snapshots.json";
import type { Part } from "@/lib/circuit/parts";
import { boardStore } from "@/lib/game/board-store";

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
  const [pending, start] = useTransition();
  const t = text.save;

  const submit = (form: FormData) =>
    start(async () => {
      const result = await updateSnapshot({ id, title: String(form.get("title") ?? ""), notes: String(form.get("notes") ?? "") });
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: text.page.saved });
    });

  return (
    <form action={submit} className="flex flex-col gap-3" onChange={() => setMessage(null)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">{t.title}</Label>
        <Input id="title" name="title" defaultValue={title} maxLength={80} className="text-lg font-bold" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t.notes}</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={notes}
          rows={6}
          maxLength={2000}
          placeholder={t.notes_hint}
          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
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
