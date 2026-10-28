import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { adminClient, leftRows, PREFIX } from "./admin";

export { expect };

export type Account = { id: string; email: string; password: string };

/**
 * Logs in through the log-in form, as a learner does. A click that comes before the page is ready does nothing, so the
 * whole log-in tries again (up to 3 times) when the lobby does not open.
 */
export async function logIn(page: Page, account: Pick<Account, "email" | "password">) {
  await expect(async () => {
    await page.goto("/login");
    // The log-in page has a loading copy of the form in its HTML; the visible one is the real form.
    const form = page.locator("form:visible:has(#email)");
    await form.locator("#email").fill(account.email);
    await form.locator("#password").fill(account.password);
    await form.locator("button[type=submit]").click();
    await page.waitForURL(/\/lobby/, { timeout: 20_000 });
  }).toPass({ intervals: [0], timeout: 70_000 });
}

/**
 * `account`: a temporary account on the Supabase project. It is deleted when the test ends, also when the test fails,
 * and the test fails when a row of the account is left. `learner`: the page, already logged in as that account.
 */
export const test = base.extend<{ account: Account; learner: Page }>({
  account: async ({}, provide) => {
    const admin = adminClient();
    const email = `${PREFIX}${randomUUID()}@example.com`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`Test account: ${error.message}`);
    const id = data.user.id;
    try {
      await provide({ id, email, password });
    } finally {
      const { data: sessions } = await admin.from("sessions").select("id").eq("user_id", id);
      const { error: deleted } = await admin.auth.admin.deleteUser(id);
      if (deleted) throw new Error(`Delete test account ${email}: ${deleted.message}`);
      const left = await leftRows([id], (sessions ?? []).map((s) => s.id));
      expect(left, `rows left of ${email}`).toBe(0);
    }
  },
  learner: async ({ page, account }, provide) => {
    await logIn(page, account);
    await provide(page);
  },
});
