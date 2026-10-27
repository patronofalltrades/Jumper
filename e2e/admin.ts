import { createClient } from "@supabase/supabase-js";

// The temporary accounts of the browser checks (issue #80). They are made and deleted with the secret key, as in
// scripts/record-videos.ts. The key stays in this process: it never goes to the browser or to a file.

export const PREFIX = "jumper-e2e-";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (in .env.local or in the environment).");
  return createClient(url, secret, { auth: { persistSession: false } });
}

/** The rows that a temporary account can leave: its profile, sessions, attempts, snapshots and stars. */
export async function leftRows(ids: string[], sessions: string[]) {
  if (!ids.length) return 0;
  const admin = adminClient();
  const count = async (table: string, column: string, values: string[]) => {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).in(column, values);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };
  // Attempts have no user column: they go by the sessions of the account, which must be read before the account goes.
  return (
    (sessions.length ? await count("attempts", "session_id", sessions) : 0) +
    (await count("profiles", "id", ids)) +
    (await count("sessions", "user_id", ids)) +
    (await count("snapshots", "user_id", ids)) +
    (await count("stars", "user_id", ids))
  );
}

/** The ids of all temporary accounts of the browser checks that exist now. */
export async function e2eAccounts() {
  const admin = adminClient();
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    found.push(...data.users.filter((u) => u.email?.startsWith(PREFIX)).map((u) => ({ id: u.id, email: u.email! })));
    if (data.users.length < 200) return found;
  }
}
