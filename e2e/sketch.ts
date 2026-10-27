import type { Locator, Page } from "@playwright/test";
import text from "@/content/ui/sketch.json";
import { expect } from "./fixtures";

// Helpers for the code step of a level (issue #58).

/** The code panel. */
export const panelOf = (page: Page) => page.getByRole("region", { name: text.panel.title });

/** Opens the code panel with the "Write the sketch" button of the Check card, which is the first card that a learner sees. */
export async function openPanel(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: text.panel.open }).click();
  await expect(panelOf(page)).toBeVisible();
  await expect(panelOf(page).locator(".cm-content")).toBeVisible();
}

/**
 * Replaces the sketch in the editor: select all, then one insert of the whole text with the keyboard. Typing key by key
 * would give extra brackets (CodeMirror closes a bracket by itself), so the text goes in at once. Then the editor must
 * show exactly this text.
 */
export async function setSketch(page: Page, code: string) {
  const content = panelOf(page).locator(".cm-content");
  await content.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
  await expect.poll(async () => (await content.innerText()).replace(/\u00a0/g, " ").replace(/\n+/g, "\n").trim()).toBe(code.replace(/\n+/g, "\n").trim());
}

export const run = (page: Page) => panelOf(page).getByRole("button", { name: text.panel.run, exact: true }).click();

export type Finger = { down: (x: number, y: number) => Promise<void>; up: () => Promise<void>; kind: "touch" | "mouse" };

/** A finger on a phone: real touch events from the browser (Input.dispatchTouchEvent). On a laptop: the mouse. */
export async function finger(page: Page, touch: boolean): Promise<Finger> {
  if (!touch) return { kind: "mouse", down: async (x, y) => (await page.mouse.move(x, y), await page.mouse.down()), up: () => page.mouse.up() };
  const cdp = await page.context().newCDPSession(page);
  return {
    kind: "touch",
    down: async (x, y) => void (await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })),
    up: async () => void (await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })),
  };
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * The places on the canvas where the picture has the orange ring that the 3D scene draws around a button that a touch
 * can press (a flat color, so the light does not change it). Each place is the box of a group of orange pixels, in CSS px.
 */
async function ringBoxes(page: Page): Promise<Box[]> {
  const canvas = (await page.locator("canvas").first().boundingBox())!;
  const png = (await page.screenshot({ clip: canvas })).toString("base64");
  return page.evaluate(
    async ({ png, canvas }) => {
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const surface = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      surface.drawImage(bitmap, 0, 0);
      const { data, width, height } = surface.getImageData(0, 0, bitmap.width, bitmap.height);
      const orange = (i: number) => Math.abs(data[i] - 227) < 30 && Math.abs(data[i + 1] - 160) < 30 && Math.abs(data[i + 2] - 8) < 45;
      // Groups of orange pixels that touch (the 8 pixels around), found with a stack.
      const seen = new Uint8Array(width * height);
      const out: { x: number; y: number; w: number; h: number; n: number }[] = [];
      for (let start = 0; start < width * height; start++) {
        if (seen[start] || !orange(start * 4)) continue;
        const stack = [start];
        seen[start] = 1;
        let [x0, y0, x1, y1, n] = [width, height, 0, 0, 0];
        while (stack.length) {
          const p = stack.pop()!;
          const [x, y] = [p % width, Math.floor(p / width)];
          [x0, y0, x1, y1, n] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y), n + 1];
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const [nx, ny] = [x + dx, y + dy];
              const q = ny * width + nx;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[q] || !orange(q * 4)) continue;
              seen[q] = 1;
              stack.push(q);
            }
        }
        if (n >= 20) out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
      }
      const k = width / canvas.width;
      return out.sort((a, b) => b.n - a.n).slice(0, 12).map((b) => ({ x: canvas.x + b.x / k, y: canvas.y + b.y / k, w: b.w / k, h: b.h / k }));
    },
    { png, canvas },
  );
}

/**
 * Finds the 3D button on the canvas: the point where a touch makes the app hold a button down. The test does not know
 * where the camera is. It looks for the orange ring, and touches the board inside each orange group, until the app
 * holds a button. It reads the "Hold to press" button of the panel, which shows what the app holds, and never touches it.
 */
export async function findButton(page: Page, finger: Finger, held: Locator) {
  for (const box of await ringBoxes(page)) {
    // The middle of the ring first: the cap is there, so a touch on the board elsewhere (a hole) is rare.
    const [cx, cy] = [box.x + box.w / 2, box.y + box.h / 2];
    const points: { x: number; y: number }[] = [];
    for (let y = box.y; y <= box.y + box.h; y += 3) for (let x = box.x; x <= box.x + box.w; x += 3) points.push({ x, y });
    points.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    for (const { x, y } of points) {
      await finger.down(x, y);
      const pressed = (await held.getAttribute("aria-pressed")) === "true";
      await finger.up();
      if (pressed) return { x, y };
    }
  }
  return null;
}
