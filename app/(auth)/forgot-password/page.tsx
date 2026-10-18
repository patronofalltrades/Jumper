import type { Metadata } from "next";
import { sendPasswordReset } from "@/app/actions/auth";
import { ForgotPasswordForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset password · Jumper" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm action={sendPasswordReset} />;
}
