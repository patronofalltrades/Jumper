"use client";

import { useState, useTransition } from "react";
import { setShared } from "@/app/actions/snapshot";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import text from "@/content/ui/snapshots.json";
import { shareUrl } from "@/lib/snapshots/share";

const t = text.share;

/** The Share button and its sheet: the switch for the public link, the link, Copy, and the phone share menu. */
export function ShareSheet({ id, title, shared: initial }: { id: string; title: string; shared: boolean }) {
  const [shared, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const toggle = () => {
    const next = !shared;
    setError(null);
    start(async () => {
      const result = await setShared({ id, shared: next });
      if (result.error) setError(result.error);
      else setOn(next);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11">
          {t.button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t.heading}</DialogTitle>
        <DialogDescription>{t.text}</DialogDescription>
        <button
          type="button"
          role="switch"
          aria-checked={shared}
          disabled={pending}
          onClick={toggle}
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3 text-left text-sm font-semibold disabled:opacity-60"
        >
          {t.switch}
          <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${shared ? "bg-primary" : "bg-muted"}`}>
            <span className={`size-5 rounded-full bg-white shadow transition-transform ${shared ? "translate-x-5" : ""}`} />
          </span>
        </button>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        {shared ? (
          <LinkRow id={id} title={title} copied={copied} setCopied={setCopied} />
        ) : (
          <p className="text-sm text-muted-foreground">{t.off}</p>
        )}
        <DialogClose asChild>
          <Button variant="outline" className="self-end">
            {t.done}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function LinkRow({ id, title, copied, setCopied }: { id: string; title: string; copied: boolean; setCopied: (v: boolean) => void }) {
  // The sheet opens in the browser only, so window is there.
  const url = shareUrl(window.location.origin, id);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Without clipboard access the learner can still select the link in the box.
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="share-link" className="text-xs font-semibold text-muted-foreground">
        {t.link}
      </label>
      <div className="flex gap-2">
        <input
          id="share-link"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 font-mono text-xs"
        />
        <Button onClick={copy}>{copied ? t.copied : t.copy}</Button>
      </div>
      {canShare && (
        <Button
          variant="outline"
          onClick={() => navigator.share({ title: t.native_title.replace("{title}", title), url }).catch(() => undefined)}
        >
          {t.native}
        </Button>
      )}
    </div>
  );
}
