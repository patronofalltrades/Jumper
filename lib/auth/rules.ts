import { z } from "zod";

// The landing page and the account forms: only for visitors who are not logged in.
const VISITOR_PAGES = ["/", "/login", "/signup", "/forgot-password"];
const PUBLIC_PATHS = [...VISITOR_PAGES, "/auth/callback"];
// A shared build (/s/<id>) opens with no log-in (issue #87). The database decides if the build is shared.
const PUBLIC_PREFIXES = ["/s/"];

/** True for the landing page and the account forms, where a logged-in user has nothing to do. It goes to the lobby. */
export function isVisitorPage(pathname: string): boolean {
  return VISITOR_PAGES.includes(pathname);
}

/** True when a visitor must log in before they open this path. */
export function needsLogin(pathname: string): boolean {
  return !PUBLIC_PATHS.includes(pathname) && !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length);
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
