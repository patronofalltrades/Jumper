import mascot from "@/content/ui/mascot.json";
import { expect, test } from "./fixtures";
import { fitsWidth, shot } from "./helpers";
import { passLevel } from "./levels";

// Flow 1 (issue #44, PLAN.md row 16): Volt, the mascot, on the level map of Perch. He stands on the first level that is
// open, or on the last level when all the levels passed. Levels are passed with the real Check of the app.

const LEVELS = 5;

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test("Volt stands on the first open level, and on the last level when all levels passed", async ({ learner: page, account }, testInfo) => {
      const size = testInfo.project.name;
      const name = `flow1-volt-${size}-${scheme}`;
      const rows = page.getByRole("listitem");
      const volt = page.getByTitle(mascot.map.here);

      /** Volt is on exactly one level (`level`), he is inside the screen, and the page has no sideways scroll. */
      const expectVoltOn = async (level: number) => {
        await page.goto("/p/perch");
        await expect(rows).toHaveCount(LEVELS);
        await expect(volt).toHaveCount(1);
        const there = rows.nth(level - 1).getByTitle(mascot.map.here);
        await expect(there).toBeVisible();
        // A learner scrolls to Volt on a phone (to the middle of the screen, or to the end of the page); the bottom bar does not cover him.
        await there.evaluate((el) => el.scrollIntoView({ block: "center" }));
        await expect(there).toBeInViewport({ ratio: 1 });
        const [at, nav] = [await there.boundingBox(), await page.getByRole("navigation", { name: "Main" }).boundingBox()];
        expect(at!.y + at!.height, "the bottom bar does not cover Volt").toBeLessThanOrEqual(nav!.y);
        expect(await fitsWidth(page), "no sideways scroll").toBe(true);
      };

      // A new account: no level passed, Volt on Level 1.
      await expectVoltOn(1);
      await expect(rows.nth(0)).toContainText("Open");
      await shot(page, `${name}-1-new-account`);

      // Level 1 passes: Volt moves to Level 2.
      await passLevel(page, account.id, "perch", 1);
      await expectVoltOn(2);
      await expect(rows.nth(0)).toContainText("Passed");
      await expect(rows.nth(1)).toContainText("Open");
      await shot(page, `${name}-2-level-1-passed`);

      // Levels 2 to 5 pass: Volt stays on the last level, and no level is locked.
      for (let level = 2; level <= LEVELS; level++) await passLevel(page, account.id, "perch", level);
      await expectVoltOn(LEVELS);
      for (let i = 0; i < LEVELS; i++) await expect(rows.nth(i)).toContainText("Passed");
      await shot(page, `${name}-3-all-passed`);
    });
  });
}
