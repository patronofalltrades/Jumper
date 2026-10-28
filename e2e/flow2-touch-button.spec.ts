import text from "@/content/ui/sketch.json";
import { expect, test } from "./fixtures";
import { shot } from "./helpers";
import { arduinoLevelReady, BUTTON } from "./levels";
import { findButton, finger, openPanel, panelOf, run, setSketch } from "./sketch";

// Flow 2 (issue #58): a real touch on the 3D button while a sketch runs. Arduino Foundations level 3: the L light of the
// Uno is on while the button is pressed. The test never uses the "Hold to press" button of the panel to press: it only
// reads it, because it shows what the app holds. On a phone the finger is a real touch from the browser; on a laptop
// it is the mouse.

test("A finger on the 3D button presses it while the sketch runs, and lifts it when the finger leaves", async ({ learner: page, account }, testInfo) => {
  const phone = testInfo.project.name === "phone";
  await arduinoLevelReady(page, account.id, 3);
  await openPanel(page);
  await setSketch(page, BUTTON);
  await run(page);
  await expect(panelOf(page).getByText(text.goal.pass)).toBeVisible();
  const held = panelOf(page).getByRole("button", { name: text.panel.press });
  await expect(held).toBeVisible();
  await expect(held).toHaveAttribute("aria-pressed", "false");

  const touch = await finger(page, phone);
  const canvas = page.locator("canvas").first();
  const spot = await findButton(page, touch, held);
  expect(spot, "the 3D button is on the canvas, and a touch on it presses it").not.toBeNull();
  const { x, y } = spot!;

  // The finger is down: the app holds the button, and the 3D board looks different (the cap and the L light).
  const before = await canvas.screenshot();
  await touch.down(x, y);
  await expect(held).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => Buffer.compare(before, await canvas.screenshot()), { message: "the 3D board changes while the button is down" }).not.toBe(0);
  await shot(page, `flow2-touch-button-${testInfo.project.name}-down`);

  // The finger leaves: the button is up, and the 3D board is as before.
  await touch.up();
  await expect(held).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => Buffer.compare(before, await canvas.screenshot()), { message: "the 3D board goes back" }).toBe(0);
  await shot(page, `flow2-touch-button-${testInfo.project.name}-up`);

  // A second press works too: the button does not stay stuck.
  await touch.down(x, y);
  await expect(held).toHaveAttribute("aria-pressed", "true");
  await touch.up();
  await expect(held).toHaveAttribute("aria-pressed", "false");
});
