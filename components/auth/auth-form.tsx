"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "login" | "signup";
  initialError?: string;
};

const COPY = {
  login: {
    title: "Welcome back",
    submit: "Log in",
    pending: "Logging in…",
    switchText: "New to Jumper?",
    switchLink: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Have an account?",
    switchLink: "Log in",
    switchHref: "/login",
  },
};

export function AuthForm({ action, mode, initialError }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: initialError });
  const copy = COPY[mode];

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-panel">
        <div className="mb-6 flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M5 24 C5 6, 25 6, 25 24" fill="none" stroke="var(--pcb)" strokeWidth="3.2" strokeLinecap="round" />
            <rect x="2.5" y="22" width="5" height="6" rx="1" fill="var(--ink)" />
            <rect x="22.5" y="22" width="5" height="6" rx="1" fill="var(--ink)" />
          </svg>
          <span className="text-2xl font-extrabold tracking-tight">Jumper</span>
        </div>
        <h1 className="mb-5 text-xl font-bold tracking-tight">{copy.title}</h1>

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.email}
              aria-invalid={Boolean(state.fieldErrors?.email)}
              aria-describedby="email-error"
            />
            <FieldError id="email-error" messages={state.fieldErrors?.email} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              aria-invalid={Boolean(state.fieldErrors?.password)}
              aria-describedby="password-error"
            />
            <FieldError id="password-error" messages={state.fieldErrors?.password} />
          </div>

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

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? copy.pending : copy.submit}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {copy.switchText}{" "}
          <Link href={copy.switchHref} className="font-semibold text-primary underline underline-offset-4">
            {copy.switchLink}
          </Link>
        </p>
      </div>
    </main>
  );
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  return (
    <p id={id} className="min-h-0 text-sm text-destructive empty:hidden">
      {messages?.[0]}
    </p>
  );
}
