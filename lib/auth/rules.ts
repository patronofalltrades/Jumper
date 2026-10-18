import { z } from "zod";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];
const PUBLIC_PATHS = [...AUTH_PAGES, "/auth/callback"];

/** True for the account forms, where a logged-in user has nothing to do. */
export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

/** True when a visitor must log in before they open this path. */
export function needsLogin(pathname: string): boolean {
  return !PUBLIC_PATHS.includes(pathname);
}

/** Where to go after an email link. Only paths inside the app, so a link cannot send users to another site. */
export function safeNextPath(next: string | null): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/lobby";
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "Use 8 or more characters.");

export const credentialsSchema = z.object({ email, password });

export const emailSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: "The two passwords are not the same.",
    path: ["confirm"],
  });
