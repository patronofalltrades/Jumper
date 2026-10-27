import { headers } from "next/headers";

/** Email links come back through /auth/callback, which swaps the code for a session. `next` is the page to open after it. */
export async function callbackUrl(next?: string) {
  const origin = (await headers()).get("origin");
  return `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
}
