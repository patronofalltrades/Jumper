import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { needsOnboarding, START_COOKIE } from "@/lib/game/onboarding";

export const metadata: Metadata = { title: "Sign up · Jumper" };

// Each new user does the onboarding (/start) before sign-up. A visitor who opens /signup with no start cookie goes there first.
export default async function SignUpPage() {
  if (needsOnboarding((await cookies()).get(START_COOKIE)?.value)) redirect("/start");
  return <AuthForm action={signUp} mode="signup" />;
}
