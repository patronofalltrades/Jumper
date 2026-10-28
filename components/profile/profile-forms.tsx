"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type { ProfileState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import avatars from "@/content/ui/avatars.json";
import text from "@/content/ui/profile.json";
import { avatarSrc } from "@/lib/profile/form";
import { cn } from "@/lib/utils";

type Action = (prev: ProfileState, formData: FormData) => Promise<ProfileState>;

export function AccountForm({ action, name, avatar }: { action: Action; name: string; avatar: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [chosen, setChosen] = useState(avatar);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h2 className="text-xl font-extrabold tracking-tight">{text.account.heading}</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">{text.account.name}</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={name}
          placeholder={text.account.name_hint}
          autoComplete="nickname"
          aria-invalid={Boolean(state.fieldErrors?.display_name)}
          aria-describedby="display_name-error"
        />
        <FieldError id="display_name-error" messages={state.fieldErrors?.display_name} />
      </div>
      <fieldset className="flex flex-col gap-2" aria-describedby="avatar-error">
        <legend className="mb-2 text-sm font-semibold">{text.account.avatar}</legend>
        <div className="grid grid-cols-5 gap-2">
          {avatars.avatars.map((a) => (
            <label key={a.id} className="flex cursor-pointer flex-col items-center gap-1 text-xs font-semibold">
              <input
                type="radio"
                name="avatar"
                value={a.id}
                checked={chosen === a.id}
                onChange={() => setChosen(a.id)}
                className="peer sr-only"
              />
              <Image
                src={avatarSrc(a.id)}
                alt={a.text}
                width={64}
                height={64}
                className={cn(
                  "aspect-square w-full rounded-full ring-offset-2 ring-offset-card transition peer-focus-visible:ring-4 peer-focus-visible:ring-ring/60",
                  chosen === a.id ? "ring-4 ring-primary" : "opacity-80 hover:opacity-100",
                )}
              />
              {a.name}
            </label>
          ))}
        </div>
        <FieldError id="avatar-error" messages={state.fieldErrors?.avatar} />
      </fieldset>
      <Messages state={state} />
      <Button type="submit" disabled={pending} className="min-h-11 self-start">
        {pending ? text.account.saving : text.account.save}
      </Button>
    </form>
  );
}

export function EmailForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h2 className="text-xl font-extrabold tracking-tight">{text.change_email.heading}</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{text.change_email.new}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={state.fieldErrors?.email} />
      </div>
      <Messages state={state} />
      <Button type="submit" disabled={pending} className="min-h-11 self-start">
        {pending ? text.change_email.saving : text.change_email.save}
      </Button>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h2 className="text-xl font-extrabold tracking-tight">{text.password.heading}</h2>
      <PasswordField name="password" label={text.password.new} errors={state.fieldErrors?.password} />
      <PasswordField name="confirm" label={text.password.confirm} errors={state.fieldErrors?.confirm} />
      <Messages state={state} />
      <Button type="submit" disabled={pending} className="min-h-11 self-start">
        {pending ? text.password.saving : text.password.save}
      </Button>
    </form>
  );
}

function PasswordField({ name, label, errors }: { name: string; label: string; errors?: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="password"
        autoComplete="new-password"
        aria-invalid={Boolean(errors)}
        aria-describedby={`${name}-error`}
      />
      <FieldError id={`${name}-error`} messages={errors} />
    </div>
  );
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  return (
    <p id={id} className="text-sm text-destructive empty:hidden">
      {messages?.[0]}
    </p>
  );
}

function Messages({ state }: { state: ProfileState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          {state.notice}
        </p>
      )}
    </>
  );
}
