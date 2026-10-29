"use client";

import { useState, useTransition } from "react";
import { answerInvite } from "@/app/actions/collaborate";
import { Button } from "@/components/ui/button";
import text from "@/content/ui/collaborate.json";

/** Accept and Decline, on the invite card in the lobby. The lobby reads the invites again after the answer. */
export function InviteActions({ id }: { id: string }) {
  const t = text.lobby;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const answer = (accept: boolean) =>
    start(async () => {
      const result = await answerInvite({ id, accept });
      setError(result.error ?? null);
    });

  return (
    <div className="mt-auto flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-sm font-medium text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => answer(true)} className="min-h-11 flex-1">
          {t.accept}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => answer(false)} className="min-h-11 flex-1">
          {t.decline}
        </Button>
      </div>
    </div>
  );
}
