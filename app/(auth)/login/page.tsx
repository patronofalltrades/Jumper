import type { Metadata } from "next";
import { Suspense } from "react";
import { logIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in · Jumper" };

export default function LogInPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<AuthForm action={logIn} mode="login" />}>
      <LogInForm searchParams={searchParams} />
    </Suspense>
  );
}

async function LogInForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  const initialError = error === "confirm" ? "That confirmation link did not work. Log in, or sign up again." : undefined;
  return <AuthForm action={logIn} mode="login" initialError={initialError} />;
}
