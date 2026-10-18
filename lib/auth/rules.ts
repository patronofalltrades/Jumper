import { z } from "zod";

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PATHS = [...AUTH_PAGES, "/auth/callback"];

/** True for the account forms, where a logged-in user has nothing to do. */
export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

/** True when a visitor must log in before they open this path. */
export function needsLogin(pathname: string): boolean {
  return !PUBLIC_PATHS.includes(pathname);
}

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use 8 or more characters."),
});
