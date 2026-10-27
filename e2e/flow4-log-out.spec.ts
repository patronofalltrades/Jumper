import { expect, test } from "./fixtures";
import { fitsWidth, shot } from "./helpers";

// Flow 4 (issue #64): the Log out button of the profile page. At phone size, the bottom bar must not cover it, and a
// finger must be able to tap it. After it, the learner is logged out: a page that needs a log-in goes to /login.

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test("The Log out button of the profile page is in reach, and it logs the learner out", async ({ learner: page }, testInfo) => {
      const size = testInfo.project.name;
      const name = `flow4-log-out-${size}-${scheme}`;
      await page.goto("/profile");
      const logOut = page.getByRole("button", { name: "Log out", exact: true });
      await expect(logOut).toBeVisible();

      // The page can scroll to the button, and the bottom bar does not cover it: the point in its middle is the button.
      await logOut.scrollIntoViewIfNeeded();
      await shot(page, name);
      const box = (await logOut.boundingBox())!;
      const nav = (await page.getByRole("navigation", { name: "Main" }).boundingBox())!;
      expect(box.y + box.height, "the button ends above the bottom bar").toBeLessThanOrEqual(nav.y);
      expect(box.height, "a finger can hit the button (44 px)").toBeGreaterThanOrEqual(44);
      const onTop = await logOut.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return top === el || el.contains(top);
      });
      expect(onTop, "nothing covers the button").toBe(true);
      expect(await fitsWidth(page), "no sideways scroll").toBe(true);

      // A real touch tap on a phone, a mouse click on a laptop.
      if (testInfo.project.name === "phone") await logOut.tap();
      else await logOut.click();
      await page.waitForURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await page.goto("/lobby");
      await page.waitForURL(/\/login/);
    });
  });
}
