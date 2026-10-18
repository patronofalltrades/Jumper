"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import type { AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

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

export function AuthForm({ action, mode, initialError }: { action: Action; mode: "login" | "signup"; initialError?: string }) {
  const [state, formAction, pending] = useActionState(action, { error: initialError });
  const copy = COPY[mode];

  return (
    <AuthCard title={copy.title} footer={<SwitchLink text={copy.switchText} href={copy.switchHref} link={copy.switchLink} />}>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <EmailField state={state} />
        <PasswordField
          name="password"
          label="Password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          errors={state.fieldErrors?.password}
        />
        {mode === "login" && (
          <Link href="/forgot-password" className="-mt-2 self-end text-sm font-semibold text-primary underline underline-offset-4">
            Forgot password?
          </Link>
        )}
        <Messages state={state} />
        <Submit pending={pending} label={copy.submit} pendingLabel={copy.pending} />
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <AuthCard
      title="Reset your password"
      footer={<SwitchLink text="Remember it?" href="/login" link="Log in" />}
    >
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">Enter the email of your account. We will send you a link to set a new password.</p>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <EmailField state={state} />
        <Messages state={state} />
        <Submit pending={pending} label="Send reset link" pendingLabel="Sending…" />
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <AuthCard title="Set a new password">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <PasswordField name="password" label="New password" autoComplete="new-password" errors={state.fieldErrors?.password} />
        <PasswordField name="confirm" label="Type it again" autoComplete="new-password" errors={state.fieldErrors?.confirm} />
        <Messages state={state} />
        <Submit pending={pending} label="Save password" pendingLabel="Saving…" />
      </form>
    </AuthCard>
  );
}

function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
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
        <h1 className="mb-5 text-xl font-bold tracking-tight">{title}</h1>
        {children}
        {footer && <p className="mt-5 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </main>
  );
}

function SwitchLink({ text, href, link }: { text: string; href: string; link: string }) {
  return (
    <>
      {text}{" "}
      <Link href={href} className="font-semibold text-primary underline underline-offset-4">
        {link}
      </Link>
    </>
  );
}

function EmailField({ state }: { state: AuthState }) {
  return (
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
  );
}

function PasswordField({ name, label, autoComplete, errors }: { name: string; label: string; autoComplete: string; errors?: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={8}
        aria-invalid={Boolean(errors)}
        aria-describedby={`${name}-error`}
      />
      <FieldError id={`${name}-error`} messages={errors} />
    </div>
  );
}

function Messages({ state }: { state: AuthState }) {
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

function Submit({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <Button type="submit" disabled={pending} className="mt-1 w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  return (
    <p id={id} className="text-sm text-destructive empty:hidden">
      {messages?.[0]}
    </p>
  );
}
