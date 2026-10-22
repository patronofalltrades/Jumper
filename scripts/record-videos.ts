// Records the walkthrough clips (issue #48) to the video files in public/videos/ (issue #49).
// Run the app first (npm run build, then npm start), then: npm run videos. To record only some videos: npm run videos -- intro perch-3
// The level clips need a log-in. The script makes a temporary account with SUPABASE_SECRET_KEY, and deletes it at the end.
// The video names, the sizes and the captions are in content/videos.json.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type Size = { width: number; height: number };
type Video = { id: string; project?: string; level?: number };

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const { sizes, videos } = read("content/videos.json") as { sizes: Record<string, Size>; videos: Video[] };
const text = read("content/ui/walkthrough.json");

const base = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const only = process.argv.slice(2);
const todo = videos.filter((v) => !only.length || only.includes(v.id));
const out = join("public", "videos");
const tmp = mkdtempSync(join(tmpdir(), "jumper-videos-"));

// Playwright has its own ffmpeg (it records with it). Use it, so that no other program is necessary.
const ffmpeg = (() => {
  const registry = createRequire(import.meta.url)("playwright-core/lib/server/registry/index").registry;
  return (registry.findExecutable("ffmpeg")?.executablePath() as string | undefined) ?? "ffmpeg";
})();

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));
const even = (n: number) => Math.floor(n / 2) * 2;

/** Opens the clip of a video: the intro clip on the landing page, or a level clip on the level map. */
async function openClip(page: Page, video: Video) {
  if (!video.level) {
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: text.intro.title }).click();
  } else {
    await page.goto(`${base}/p/${video.project}`);
    await page.getByRole("button", { name: fill(text.watchLevelLabel, { n: video.level }) }).click();
  }
}

/**
 * Records one clip from the start to the end board, and keeps only the board and the caption: the header and the
 * buttons of the clip window are not in the video.
 */
async function record(browser: Browser, video: Video, size: string, state: BrowserContextOptions["storageState"]) {
  const viewport = sizes[size];
  const dir = join(tmp, `${video.id}-${size}`);
  const context = await browser.newContext({ viewport, recordVideo: { dir, size: viewport }, storageState: video.level ? state : undefined });
  const page = await context.newPage();
  const start = Date.now();
  await openClip(page, video);

  const dialog = page.getByRole("dialog");
  await dialog.locator("canvas").waitFor();
  await page.waitForTimeout(1500); // The 3D scene draws its first frame.
  const replay = dialog.getByRole("button", { name: text.controls.replay });
  await replay.click(); // Start again from step 1, now that the scene shows.
  const from = (Date.now() - start) / 1000;

  const box = (await dialog.boundingBox())!;
  const top = (await dialog.locator("header").boundingBox())!;
  const buttons = (await replay.locator("..").boundingBox())!;
  const y = top.y + top.height;
  const crop = { x: even(box.x), y: even(y), w: even(box.width), h: even(buttons.y - 8 - y) };

  // "Step 1 of 9": the number of steps of the clip.
  const first = new RegExp(`^${fill(text.step, { n: 1, total: "(\\d+)" })}$`);
  const total = Number((await dialog.getByText(first).textContent())?.match(first)?.[1]);
  await dialog.getByText(fill(text.step, { n: total, total })).waitFor({ timeout: 120_000 });
  await page.waitForTimeout(3000); // The end board, with Volt.
  const to = (Date.now() - start) / 1000;
  await context.close();

  const target = join(out, `${video.id}-${size}.webm`);
  // prettier-ignore
  execFileSync(ffmpeg, [
    "-y", "-loglevel", "error", "-ss", from.toFixed(2), "-to", to.toFixed(2), "-i", await page.video()!.path(),
    "-vf", `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`, "-an", "-c:v", "libvpx", "-b:v", "0", "-crf", "40", "-qmax", "50", "-r", "15", target,
  ]);
  console.log(`${target}: ${(to - from).toFixed(1)} s, ${Math.round(statSync(target).size / 1024)} KB`);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });
const email = `jumper-videos-${randomUUID()}@example.com`;
const password = randomUUID();
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw new Error(`Test account: ${error.message}`);

const browser = await chromium.launch();
try {
  mkdirSync(out, { recursive: true });
  const login = await browser.newContext();
  const page = await login.newPage();
  await page.goto(`${base}/login`);
  const form = page.locator("form:visible:has(#email)");
  await form.locator("#email").fill(email);
  await form.locator("#password").fill(password);
  await form.locator("button[type=submit]").click();
  await page.waitForURL(/\/lobby/);
  const state = await login.storageState();
  await login.close();

  for (const video of todo) for (const size of Object.keys(sizes)) await record(browser, video, size, state);
} finally {
  await browser.close();
  // Deleting the account deletes its profile and all its rows (cascade).
  await admin.auth.admin.deleteUser(data.user.id);
  rmSync(tmp, { recursive: true, force: true });
}
