import type { Metadata } from "next";
import { updatePassword } from "@/app/actions/auth";
import { ResetPasswordForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "New password · Jumper" };

// The reset link logs the user in for this page (the proxy sends visitors without a session to /login).
export default function ResetPasswordPage() {
  return <ResetPasswordForm action={updatePassword} />;
}
