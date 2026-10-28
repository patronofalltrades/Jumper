import type { Page } from "@playwright/test";
import walkthrough from "@/content/ui/walkthrough.json";
import videos from "@/content/videos.json";
import { expect, test } from "./fixtures";
import { backgroundLuminance, lowContrast, shot } from "./helpers";

// Flow 3 (issue #49): the walkthrough video in dark mode. A browser with no WebGL plays the recorded video in place of
// the 3D replay. The videos were recorded in light mode only, so the check is that the window around them is dark and
// readable, and that the video plays. Chromium starts with no WebGL (--disable-3d-apis), as in the check of #49.

test.use({ colorScheme: "dark", launchOptions: { args: ["--disable-3d-apis"], executablePath: process.env.CHROMIUM_PATH || undefined } });

const caption = (id: string) => videos.videos.find((v) => v.id === id)!.caption;

/** The open clip window plays `id` as a video: the right file for the screen, a real size, and a time that moves. */
async function expectVideoPlays(page: Page, id: string, size: string, name: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const video = dialog.locator("video");
  await expect(video).toHaveAttribute("src", new RegExp(`/${id}-${size}\\.webm$`));
  // The file loads (status 200, no redirect to the log-in page), has a picture, and plays.
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState >= 2 && v.videoWidth > 0 && v.currentTime > 0), { message: "the video plays" }).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.error?.code ?? null)).toBeNull();
  // The window is dark, and its texts are readable.
  expect(await backgroundLuminance(page, "[role=dialog]"), "the window is dark").toBeLessThan(0.2);
  await expect(dialog.getByText(caption(id), { exact: true })).toBeVisible();
  expect(await lowContrast(page, "[role=dialog]"), "low contrast texts in the window").toEqual([]);
  await shot(page, name);
}

test("A visitor with no WebGL plays the intro video in the dark window", async ({ page }, testInfo) => {
  const size = testInfo.project.name === "phone" ? "phone" : "laptop";
  await page.goto("/");
  const response = page.waitForResponse((r) => r.url().includes(`/videos/intro-${size}.webm`));
  await page.getByRole("button", { name: walkthrough.intro.title }).click();
  const loaded = await response;
  expect([200, 206], "the file loads (a video comes as 200, or 206 for a range)").toContain(loaded.status());
  expect(loaded.headers()["content-type"]).toContain("video/webm");
  await expectVideoPlays(page, "intro", size, `flow3-video-dark-${size}-intro`);

  // Esc closes the window, and the focus goes back to the button that opened it.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: walkthrough.intro.title })).toBeFocused();
});

test("A learner with no WebGL plays the level 1 video from the level map in the dark window", async ({ learner: page }, testInfo) => {
  const size = testInfo.project.name === "phone" ? "phone" : "laptop";
  await page.goto("/p/perch");
  const watch = page.getByRole("button", { name: walkthrough.watchLevelLabel.replace("{n}", "1") });
  await watch.click();
  await expectVideoPlays(page, "perch-1", size, `flow3-video-dark-${size}-perch-1`);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(watch).toBeFocused();
});
