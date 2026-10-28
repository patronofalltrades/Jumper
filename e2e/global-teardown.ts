import { adminClient, e2eAccounts } from "./admin";

// After the run: no temporary account may stay. If one stays, delete it and fail the run.
export default async function globalTeardown() {
  const left = await e2eAccounts();
  const admin = adminClient();
  for (const { id } of left) await admin.auth.admin.deleteUser(id);
  if (left.length) throw new Error(`${left.length} temporary account(s) stayed after the run: ${left.map((a) => a.email).join(", ")}. They are deleted now.`);
  console.log("Clean-up: 0 temporary accounts left.");
}
