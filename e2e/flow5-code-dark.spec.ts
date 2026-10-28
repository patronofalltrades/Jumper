import text from "@/content/ui/sketch.json";
import { expect, test } from "./fixtures";
import { backgroundLuminance, lowContrast, shot } from "./helpers";
import { arduinoLevelReady, BLINK } from "./levels";
import { openPanel, panelOf, run, setSketch } from "./sketch";

// Flow 5 (issue #58): the code step in dark mode (and in light mode, to compare). The code panel of Arduino Foundations
// level 2: the editor, the hints, the buttons, the message of a mistake, of a goal that fails, and of a pass. Each text
// of the panel must have a contrast of 4.5 or more with its background (WCAG AA); the colored words of the code and the
// line numbers, 3 or more. In dark mode the editor must be dark. The lowest contrast in the editor goes in the report.

for (const scheme of ["dark", "light"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test("The code panel is readable: editor, hints, buttons and the messages of a mistake, a fail and a pass", async ({ learner: page, account }, testInfo) => {
      const name = `flow5-code-${testInfo.project.name}-${scheme}`;
      await arduinoLevelReady(page, account.id, 2);
      await openPanel(page);
      const panel = panelOf(page);
      const readable = async (what: string) => {
        expect(await lowContrast(page, "section[aria-label='Sketch']"), `${what}: texts with a low contrast`).toEqual([]);
        // The lowest contrast in the editor, for the report (the "texts" under 99 are all of them).
        const lowest = (await lowContrast(page, ".cm-editor", 99, 99)).sort((a, b) => a.ratio - b.ratio)[0];
        testInfo.annotations.push({ type: `lowest editor contrast, ${what}`, description: `${lowest.ratio} (${lowest.text})` });
      };

      // The first code, and the panel at rest.
      const editor = await backgroundLuminance(page, ".cm-editor");
      if (scheme === "dark") expect(editor, "the editor is dark").toBeLessThan(0.2);
      else expect(editor, "the editor is light").toBeGreaterThan(0.5);
      await panel.getByText(text.panel.hints).click();
      await readable("the panel at rest");
      await shot(page, `${name}-1-starter`);

      // A mistake in the code: the message, and the red line.
      await setSketch(page, BLINK.replace("pinMode(ledPin, OUTPUT);", "pinMode(ledPin, OUTPUT)"));
      await run(page);
      await expect(panel.getByRole("alert")).toContainText("Put a ; at the end of this line.");
      await expect(panel.locator(".cm-sketch-error")).toBeVisible();
      await readable("a mistake in the code");
      await shot(page, `${name}-2-mistake`);

      // A sketch that runs, but does not do the goal.
      await setSketch(page, BLINK.replace("delay(500);\n  digitalWrite(ledPin, LOW);", "delay(1000);\n  digitalWrite(ledPin, LOW);"));
      await run(page);
      await expect(panel.getByRole("alert")).toContainText(text.panel.failTitle);
      await readable("a goal that fails");
      await shot(page, `${name}-3-goal-fails`);
      await panel.getByRole("button", { name: text.panel.stop, exact: true }).click();

      // A sketch that does the goal.
      await setSketch(page, BLINK);
      await run(page);
      await expect(panel.getByText(text.goal.pass)).toBeVisible();
      await readable("a pass");
      await shot(page, `${name}-4-pass`);
    });
  });
}
