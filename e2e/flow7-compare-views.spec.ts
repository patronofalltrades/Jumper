import sharp from "sharp";
import ui from "@/content/ui/journey.json";
import sketchText from "@/content/ui/sketch.json";
import { saveKey } from "@/lib/game/level-key";
import { expect, test } from "./fixtures";
import { shot } from "./helpers";
import { arduinoLevelReady, BLINK } from "./levels";
import type { Page } from "@playwright/test";

// Flow 7 (issue #222): Compare views on Arduino Foundations level 2 gives the answer first. The answer for a board that
// matches, and for a board where the pin 13 wire goes to row 18; the drawing and the real kit side by side; the
// numbered notes of the photo; "Write the sketch" as large as Clear and Check while the panel is open; the off wire in
// magenta on the 3D board. At the end, the real Check passes the level, as before.

const text = ui.compare;
const DIFFERENCES = [
  "330 Ω resistor here, 220 Ω in the lesson",
  "the black wire goes straight to GND, not the − line",
  "the LED legs sit close together",
  "this is a RedBoard, with the same pins as the Uno",
];

/** The number of magenta pixels (the off wire, #ff1fce, with the light of the scene) in the 3D board. */
async function magentaPixels(page: Page) {
  // Only the 3D drawing: the pop-ups and labels on top of the board are hidden for this picture.
  const png = await page.locator("canvas").first().screenshot({ style: "body *:not(canvas) { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 190 && g < 120 && b > 140 && r - g > 110) n++;
  }
  return n;
}

/** The end-of-tasks card of a level with a code step covers the button row: "Fix the board" closes it. */
async function toBoard(page: Page) {
  const card = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Now write the sketch" }) });
  await expect(card.or(page.getByRole("button", { name: "Clear", exact: true }))).toBeVisible();
  if (await card.isVisible()) await card.getByRole("button", { name: "Fix the board" }).click();
  await expect(page.getByRole("button", { name: "Clear", exact: true })).toBeVisible();
}

/** Changes the saved board of the level, then loads the page again. */
async function editBoard(page: Page, key: string, edit: string) {
  await page.evaluate(
    ({ key, edit }) => {
      const saved = JSON.parse(localStorage.getItem(key)!);
      new Function("saved", edit)(saved);
      localStorage.setItem(key, JSON.stringify(saved));
    },
    { key, edit },
  );
  await page.reload();
  await expect(page.getByRole("button", { name: text.button, exact: true })).toBeVisible();
}

test("Compare views gives the answer first, with linked views and marked photo notes", async ({ learner: page, account }, testInfo) => {
  const name = `flow7-compare-${testInfo.project.name}`;
  const laptop = testInfo.project.name === "laptop";
  const key = saveKey(account.id, "arduino-foundations", 2);
  await arduinoLevelReady(page, account.id, 2);
  await toBoard(page);

  const open = page.getByRole("button", { name: text.button, exact: true });
  const panel = page.getByTestId("compare-views");
  const verdict = page.getByTestId("verdict");
  const clear = page.getByRole("button", { name: "Clear", exact: true });
  const write = page.getByRole("button", { name: sketchText.panel.open, exact: true }).last();
  const style = (l: typeof clear) =>
    l.evaluate((e) => {
      const s = getComputedStyle(e);
      return { height: Math.round(e.getBoundingClientRect().height), weight: s.fontWeight, size: s.fontSize, background: s.backgroundColor };
    });

  // Before the panel: "Write the sketch" is the green button above the row.
  const before = await style(write);
  expect(before.background, "Write the sketch is green before the panel opens").not.toBe((await style(clear)).background);

  // 1. A board that matches: the answer is first, and it is the largest text of the panel.
  await open.click();
  await expect(panel).toBeVisible();
  await expect(verdict).toHaveAttribute("data-verdict", "match");
  await expect(verdict).toHaveText(text.verdict.match);
  const first = await panel.locator("section, figure, p, h3").first().getAttribute("data-testid");
  expect(first, "the answer is the first element of the panel").toBe("verdict");
  const sizes = await panel.evaluate((root) => {
    const answer = root.querySelector("[data-testid=verdict] p")!;
    const px = (e: Element) => parseFloat(getComputedStyle(e).fontSize);
    const others = [...root.querySelectorAll("p, h2, h3, h4, span, button, li, figcaption")].filter((e) => !answer.contains(e) && e.textContent?.trim());
    return { answer: px(answer), largest: Math.max(...others.map(px)), weight: getComputedStyle(answer).fontWeight };
  });
  expect(sizes.answer, "the answer is larger than every other text").toBeGreaterThan(sizes.largest);
  expect(Number(sizes.weight)).toBeGreaterThanOrEqual(800);
  await expect(page.getByTestId("your-board-label")).toHaveText(text.views.board);

  // 2. Drawing and Real kit, side by side, at the same size. The panel opens on the first connection.
  const drawing = page.getByTestId("view-drawing");
  const kit = page.getByTestId("view-kit");
  await expect(drawing.locator("figcaption")).toHaveText(text.views.drawing);
  await expect(kit.locator("figcaption")).toHaveText(text.views.kit);
  const [d, k] = [(await drawing.boundingBox())!, (await kit.boundingBox())!];
  expect(Math.abs(d.width - k.width), "the same width").toBeLessThanOrEqual(1);
  expect(Math.abs(d.height - k.height), "the same height").toBeLessThanOrEqual(1);
  expect(Math.abs(d.y - k.y), "side by side").toBeLessThanOrEqual(1);
  await expect(page.getByTestId("selected-label")).toHaveText("5V pin of the Uno → + line on the left of breadboard A");

  // 3. The notes of the photo: 4 numbered markers and the list, the credit, and no "About this photo" paragraph.
  await expect(kit.getByTestId("photo-difference")).toHaveCount(4);
  const list = page.getByTestId("photo-differences");
  await expect(list.getByRole("heading")).toHaveText(text.photo.differences);
  // Each line starts with the number of its marker.
  await expect(list.getByRole("listitem")).toHaveText(DIFFERENCES.map((t, i) => `${i + 1}${t}`));
  await expect(page.getByTestId("photo-credit")).toContainText("SparkFun Electronics");
  await expect(page.getByTestId("photo-note")).toHaveCount(0);

  // "Write the sketch" has the size and weight of Clear while the panel is open.
  const [c, w] = [await style(clear), await style(write)];
  expect(w, "Write the sketch looks like Clear").toEqual(c);
  await shot(page, `${name}-1-match`);

  // "A different layout" is a link under the views; it changes the real kit photo, and comes back.
  const other = panel.getByRole("button", { name: text.views.otherLayout });
  await other.click();
  await expect(panel.getByRole("button", { name: text.views.lessonKit })).toBeVisible();
  await expect(kit.getByTestId("photo-difference")).toHaveCount(0);
  await panel.getByRole("button", { name: text.views.lessonKit }).click();
  await expect(kit.getByTestId("photo-difference")).toHaveCount(4);

  // A selection in the list shows in the drawing too.
  await panel.getByRole("region", { name: text.connections }).getByRole("button", { name: /^Select the connection: Pin 13 of the Uno/ }).click();
  await expect(page.getByTestId("selected-label")).toHaveText("Pin 13 of the Uno → Resistor, first leg");
  await expect(drawing.locator('[data-sid="n-d13-r1"]')).toHaveAttribute("aria-pressed", "true");
  if (laptop) expect(await magentaPixels(page), "no magenta wire on a board that matches").toBeLessThan(20);

  // The panel closes: "Write the sketch" is green again.
  await panel.getByRole("button", { name: text.close }).click();
  await expect(panel).toBeHidden();
  expect((await style(write)).background).toBe(before.background);

  // 4. The pin 13 wire goes to row 18: the answer names the wire and the rows, and the panel opens on that connection.
  await editBoard(page, key, `saved.parts.find((p) => p.id === "w3").b = "A-a18";`);
  await toBoard(page);
  await open.click();
  await expect(verdict).toHaveAttribute("data-verdict", "wire");
  await expect(verdict.locator("p").first()).toHaveText("Pin 13's wire goes to row 18. The reference uses row 22.");
  await expect(verdict).toContainText(text.verdict.mark);
  await expect(page.getByTestId("selected-label")).toHaveText("Pin 13 of the Uno → Resistor, first leg");
  if (laptop) {
    await expect.poll(() => magentaPixels(page), { message: "the off wire is magenta on the 3D board" }).toBeGreaterThan(80);
  }
  await shot(page, `${name}-2-wire-off`);
  await panel.getByRole("button", { name: text.close }).click();
  if (laptop) await expect.poll(() => magentaPixels(page), { message: "no magenta when the panel is closed" }).toBeLessThan(20);

  // 5. The Check flow is as before: the board back as the reference, a sketch that passed, and the real Check.
  await editBoard(page, key, `saved.parts.find((p) => p.id === "w3").b = "A-a22"; saved.sketch = { code: ${JSON.stringify(BLINK)}, passed: true };`);
  const check = page.getByRole("button", { name: "Check", exact: true });
  await expect(check).toBeEnabled();
  await check.click();
  await page.waitForURL(/\/p\/arduino-foundations\/2\/complete/);
});
