"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, useTransition, type ReactNode } from "react";
import { createSnapshot } from "@/app/actions/snapshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import text from "@/content/ui/snapshots.json";
import type { Part } from "@/lib/circuit/parts";
import { toWiring } from "@/lib/snapshots/wiring";

export type BoardToSave = { parts: Part[]; session: string | null; mistakes: number };

const t = text.save;

/**
 * The Save snapshot button and its form. `read` gives the board at the moment of the save, or null if there is none.
 * `children` is the button that opens the form.
 */
export function SaveSnapshot({ levelId, read, children }: { levelId: number; read: () => BoardToSave | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSaved(null);
      setError(read() ? null : t.no_board);
    }
  };

  const submit = (form: FormData) => {
    const board = read();
    if (!board) return setError(t.no_board);
    start(async () => {
      const result = await createSnapshot({
        levelId,
        sessionId: board.session,
        title: String(form.get("title") ?? ""),
        notes: String(form.get("notes") ?? ""),
        wiring: toWiring(board.parts),
        mistakes: board.mistakes,
      });
      setError(result.error ?? null);
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
            <form action={submit} className="flex flex-col gap-4" onChange={() => error !== t.no_board && setError(null)}>
              <Dialog.Description className="text-sm text-muted-foreground">{t.text}</Dialog.Description>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="snapshot-title">{t.title}</Label>
                <Input id="snapshot-title" name="title" maxLength={80} placeholder={t.title_hint} autoComplete="off" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="snapshot-notes">{t.notes}</Label>
                <textarea
                  id="snapshot-notes"
                  name="notes"
                  rows={4}
                  maxLength={2000}
                  placeholder={t.notes_hint}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
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
