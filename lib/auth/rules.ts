import { z } from "zod";

// The landing page and the account forms: only for visitors who are not logged in.
// /start is the onboarding before sign-up (issue #152).
const VISITOR_PAGES = ["/", "/start", "/login", "/signup", "/forgot-password"];
const PUBLIC_PATHS = [...VISITOR_PAGES, "/auth/callback"];

/** True for the landing page and the account forms, where a logged-in user has nothing to do. It goes to the lobby. */
export function isVisitorPage(pathname: string): boolean {
  return VISITOR_PAGES.includes(pathname);
}

/** True when a visitor must log in before they open this path. A shared build (/s/<id>) needs a log-in too (issue #183). */
export function needsLogin(pathname: string): boolean {
  return !PUBLIC_PATHS.includes(pathname);
}

/** The log-in page. It keeps the path that the visitor asked for, so the log-in goes back to it (for example a share link). */
export function loginPath(next: string): string {
  return next === "/" || next === "/lobby" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}

/**
 * Where to go after an email link or the log-in. Only paths inside the app, so a link cannot send users to another site.
 * A browser deletes tab, LF and CR from a URL, so "/\t/evil.example" becomes "//evil.example". Thus control characters
 * and backslashes are not allowed anywhere in the path (issue #183).
 */
export function safeNextPath(next: string | null): string {
  return next && /^\/(?![/\\])/.test(next) && !/[\u0000-\u001f\u007f\\]/.test(next) ? next : "/lobby";
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
