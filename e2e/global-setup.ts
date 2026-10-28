import { e2eAccounts, adminClient } from "./admin";

// Before the run: delete the temporary accounts that an earlier run left (for example when the machine stopped).
export default async function globalSetup() {
  const admin = adminClient();
  for (const { id } of await e2eAccounts()) await admin.auth.admin.deleteUser(id);
}
