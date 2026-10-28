import type { Page } from "@playwright/test";

/** Saves a screenshot of a flow in prompts/browser-checks-screens/. */
export const shot = (page: Page, name: string) => page.screenshot({ path: `prompts/browser-checks-screens/${name}.png` });

/** True when the page has no sideways scroll. */
export const fitsWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

type Low = { text: string; ratio: number };

/**
 * The texts inside `root` whose contrast with their background is under `min` (WCAG AA: 4.5 for normal text). The
 * colored words of the code in the editor (and its line numbers) are marks, not the instruction text: they need
 * `quiet` (default 3, the WCAG AA level for graphics). The background of a text is the first opaque background above it.
 */
export function lowContrast(page: Page, root: string, min = 4.5, quiet = 3): Promise<Low[]> {
  return page.evaluate(
    ({ root, min, quiet }) => {
      type Rgba = [number, number, number, number];
      const probe = document.createElement("canvas").getContext("2d")!;
      // The canvas turns any CSS color (rgb, color-mix, oklch, color(srgb …)) into plain sRGB.
      const parse = (css: string): Rgba => {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#000";
        probe.fillStyle = css;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };
      const over = (top: Rgba, below: Rgba): Rgba => {
        const a = top[3] + below[3] * (1 - top[3]);
        const mix = (i: number) => (top[i] * top[3] + below[i] * below[3] * (1 - top[3])) / (a || 1);
        return [mix(0), mix(1), mix(2), a];
      };
      const lum = ([r, g, b]: Rgba) => {
        const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: Rgba, b: Rgba) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const background = (el: Element): Rgba => {
        let color: Rgba = [0, 0, 0, 0];
        for (let node: Element | null = el; node; node = node.parentElement) {
          color = over(color, parse(getComputedStyle(node).backgroundColor));
          if (color[3] >= 0.99) break;
        }
        return over(color, [255, 255, 255, 1]);
      };
      const out: { text: string; ratio: number }[] = [];
      const seen = new Set<string>();
      for (const el of document.querySelectorAll(`${root}, ${root} *`)) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent?.trim()).map((n) => n.textContent!.trim()).join(" ");
        if (!own) continue;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none" || (el as HTMLElement).offsetParent === null) continue;
        const bg = background(el);
        const fg = over(parse(style.color), bg);
        const r = ratio(fg, bg);
        const key = `${own}|${r.toFixed(2)}`;
        const need = el.closest(".cm-editor") ? quiet : min;
        if (r < need && !seen.has(key)) {
          seen.add(key);
          out.push({ text: own.slice(0, 60), ratio: Math.round(r * 100) / 100 });
        }
      }
      return out;
    },
    { root, min, quiet },
  );
}

/** The luminance (0 to 1) of the first opaque background above an element: under 0.2 is a dark color. */
export function backgroundLuminance(page: Page, selector: string): Promise<number> {
  return page.evaluate((selector) => {
    const probe = document.createElement("canvas").getContext("2d")!;
    for (let node: Element | null = document.querySelector(selector); node; node = node.parentElement) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = getComputedStyle(node).backgroundColor;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      if (a < 250) continue;
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }
    return 1;
  }, selector);
}
