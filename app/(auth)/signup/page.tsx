import type { Metadata } from "next";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign up · Jumper" };

export default function SignUpPage() {
  return <AuthForm action={signUp} mode="signup" />;
}
