"use client";

import Image from "next/image";
import { AlertDialog } from "radix-ui";
import { useState, useTransition, type FormEvent } from "react";
import { inviteCollaborator, removeCollaborator } from "@/app/actions/collaborate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, invalid } from "@/components/snapshots/field";
import text from "@/content/ui/collaborate.json";
import { fieldErrors, inviteSchema, type FieldErrors } from "@/lib/collaborate/invite";
import { avatarSrc } from "@/lib/profile/form";

export type Person = { id: string; email: string; status: "invited" | "joined"; name: string | null; avatar: string | null };

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** The project page: invite a friend by email, and see the list of collaborators with Remove. */
export function InvitePanel({ projectId, ownEmail, people }: { projectId: number; ownEmail: string; people: Person[] }) {
  const t = text.invite;
  const [fields, setFields] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // onSubmit, not a form action: React clears a form after its action, and the learner must keep what they wrote.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    const errors = fieldErrors(inviteSchema(ownEmail), { email });
    setFields(errors);
    setMessage(null);
    if (Object.keys(errors).length) return;
    start(async () => {
      const result = await inviteCollaborator({ projectId, email });
      setFields(result.fieldErrors ?? {});
      if (result.error) setMessage({ ok: false, text: result.error });
      else if (!result.fieldErrors) {
        setMessage({ ok: true, text: t.sent });
        form.reset();
      }
    });
  };

  return (
    <section aria-labelledby="collaborators-heading" className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 id="collaborators-heading" className="text-2xl font-extrabold tracking-tight">
        {t.heading}
      </h2>
      <p className="text-sm text-muted-foreground">{t.text}</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <Field id="invite-email" label={t.email} error={fields.email}>
          <Input id="invite-email" name="email" type="email" autoComplete="off" placeholder={t.email_hint} {...invalid("invite-email", fields.email)} />
        </Field>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-primary" : "text-sm font-medium text-destructive"}>
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={pending} className="min-h-11 self-start">
          {pending ? t.sending : t.submit}
        </Button>
      </form>
      {people.length ? (
        <ul className="flex flex-col gap-2">
          {people.map((person) => (
            <Row key={person.id} person={person} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{text.list.empty}</p>
      )}
    </section>
  );
}

function Row({ person }: { person: Person }) {
  const t = text.list;
  const joined = person.status === "joined";
  const name = (joined && person.name) || person.email;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border p-3">
      <Image src={avatarSrc(joined ? person.avatar : null)} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{name}</span>
        {joined && person.name && <span className="truncate text-xs text-muted-foreground">{person.email}</span>}
        <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{joined ? t.joined : t.invited}</span>
      </span>
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild>
          <Button variant="outline" className="min-h-11 shrink-0" aria-label={fill(t.remove_label, { name })}>
            {t.remove}
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-sm -translate-y-1/2 flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-foreground shadow-panel">
            <AlertDialog.Title className="text-xl font-extrabold tracking-tight">{t.remove_heading}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">{fill(t.remove_text, { name })}</AlertDialog.Description>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">{t.cancel}</Button>
              </AlertDialog.Cancel>
              <Button
                disabled={pending}
                className="border-[var(--danger-deep,#9a2f21)] bg-destructive text-white"
                onClick={() =>
                  start(async () => {
                    const result = await removeCollaborator(person.id);
                    setError(result.error ?? null);
                  })
                }
              >
                {t.remove_yes}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </li>
  );
}
