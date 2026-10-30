// Browser check for issue #126, as run. It needs a TEMPORARY route at /s/phone-check (not committed) that renders BuildView
// with the Perch level 1 data. Run with the dev server on port 3100: node measure-board.js before|after
// Browser check for issue #126. Usage: node shoot.js <prefix> [level]
const { chromium } = require("/home/user/Jumper/node_modules/playwright");
const [prefix, level = "1"] = process.argv.slice(2);
const out = "/home/user/Jumper/prompts/phone-layout-screens";
const views = [
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "1280x800", width: 1280, height: 800, mobile: false },
];
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }).catch(() => chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }));
  for (const v of views.filter((x) => !process.env.ONLY || x.name === process.env.ONLY)) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message)));
    page.on("crash", () => errors.push("CRASH"));
    await page.goto("http://localhost:3100/s/phone-check", { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForSelector("canvas", { timeout: 180000 });
    await page.waitForTimeout(3000);
    // Leave the intro pop-up: the first button that starts the level.
    // Hide the Next.js dev badge and the save banner of the placeholder backend (not part of the layout).
    await page.addStyleTag({ content: 'nextjs-portal, [data-nextjs-toast], [role="alert"] { display: none !important; }' });
    for (let i = 0; i < 10; i++) {
      const clicked = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /^(Start|Got it)$/.test(x.textContent.trim()));
        if (b) b.click();
        return !!b;
      });
      if (!clicked) break;
      await page.waitForTimeout(1200);
    }
    // The walkthrough clip opens by itself at the start of a level. Close it with its X button.
    for (let i = 0; i < 3; i++) {
      const closed = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /^(Close the clip|Skip)$/i.test(x.getAttribute("aria-label") || x.textContent.trim()));
        if (b) b.click();
        return !!b;
      });
      if (!closed) break;
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${prefix}-${v.name}.png` });
    const m = await page.evaluate(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height), width: Math.round(b.width) }; };
      const canvas = document.querySelector("canvas");
      const header = document.querySelector("header");
      const toolbar = document.querySelector('[role="toolbar"]')?.parentElement?.parentElement;
      const actions = [...document.querySelectorAll("button")].find((b) => /^check$/i.test(b.textContent.trim()))?.closest(".absolute");
      const row = [...document.querySelectorAll("button")].find((b) => /^check$/i.test(b.textContent.trim()))?.parentElement;
      const panels = [...document.querySelectorAll("section[aria-label]")].map((s) => ({ label: s.getAttribute("aria-label"), ...r(s) }));
      const rowButtons = row ? [...row.querySelectorAll("button")].map((b) => ({ text: b.textContent.trim(), ...r(b) })) : [];
      return { viewport: window.innerHeight, board: r(canvas), header: r(header), toolbar: r(toolbar), actionRow: r(row), actions: r(actions), panels, rowButtons, rowTop: row ? new Set(rowButtons.map((b) => b.top)).size : null };
    });
    console.log(v.name, JSON.stringify(m));
    console.log(v.name, "page errors:", JSON.stringify(errors));
    await ctx.close();
  }
  await browser.close();
})();
