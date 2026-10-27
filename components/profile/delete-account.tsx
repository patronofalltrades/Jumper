"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import text from "@/content/ui/profile.json";
import { boardStore } from "@/lib/game/board-store";
import { canDelete, clearUserSaves } from "@/lib/profile/account";

const t = text.delete_account;

/** The danger part of the profile page (issue #78). The Delete button turns on only when the learner types the word. */
export function DeleteAccount({ action, user }: { action: typeof deleteAccount; user: string }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    setError(undefined);
    start(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      // The account is gone: empty the board in memory and the saves of this user, then show the landing page.
      boardStore.getState().reset();
      try {
        clearUserSaves(localStorage, user);
      } catch {
        // Blocked storage: there is nothing saved to remove.
      }
      router.replace("/?deleted=1");
    });
  }

  return (
    <section className="rounded-2xl border-2 border-destructive bg-card p-5 shadow-panel">
      <h2 className="text-xl font-extrabold tracking-tight text-destructive">{t.heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
      <Dialog onOpenChange={() => (setTyped(""), setError(undefined))}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4 min-h-11">
            {t.open}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="text-destructive">{t.title}</DialogTitle>
          <DialogDescription>{t.warning}</DialogDescription>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-delete">{t.confirm_label.replace("{word}", t.word)}</Label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="min-h-11" disabled={pending}>
                {t.cancel}
              </Button>
            </DialogClose>
            <Button variant="destructive" className="min-h-11" disabled={!canDelete(typed) || pending} onClick={remove}>
              {pending ? t.deleting : t.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
