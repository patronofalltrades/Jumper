import { expect, test, type Page } from "@playwright/test";
import { fitsWidth, shot } from "./helpers";

// Flow 6 (issue #180): the onboarding before sign-up (/start), from the first question to the sign-up screen. It needs
// no account. The level answer selects the start answer first, the practice wire is on the board of the start project,
// and each answer button has a name and a description for a screen reader (issue #178).

/** Picks an answer and presses Continue. The answer button must have a name and a description. */
async function answer(page: Page, label: string) {
  const option = page.getByRole("radio", { name: label, exact: true });
  await expect(option, `"${label}" has a description`).toHaveAccessibleDescription(/\S/);
  await option.click();
  await expect(option).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

/** The intro and the first three questions, up to the level question. */
async function toLevel(page: Page) {
  await page.goto("/start");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await answer(page, "A gadget for my desk");
  await answer(page, "Build my own device");
  await expect(page.getByRole("radiogroup", { name: "How much do you know about circuits?" })).toBeVisible();
}

/** Taps the glowing hole, checks the "done" text, and goes to the sign-up screen. */
async function makeWire(page: Page, title: string, name: string) {
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await shot(page, `${name}-wire`);
  expect(await fitsWidth(page), "no sideways scroll on the wire screen").toBe(true);
  await page.getByRole("button", { name: "The glowing hole on the + line" }).click();
  await expect(page.getByRole("status")).toContainText("Nice! You made a wire.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make a free account to keep going" })).toBeVisible();
}

const startCookie = async (page: Page) => (await page.context().cookies()).find((c) => c.name === "jumper_start")?.value;

test("A new visitor gets the basics selected, wires 5V on the Uno, and starts Arduino Foundations", async ({ page }, testInfo) => {
  const name = `flow6-onboarding-${testInfo.project.name}-new`;
  await toLevel(page);
  await answer(page, "I am new to circuits");
  await answer(page, "Casual");

  // The start question opens with the answer that fits a new visitor.
  await expect(page.getByRole("radio", { name: "Learn the basics first" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Build a real device" })).toHaveAttribute("aria-checked", "false");
  await shot(page, `${name}-start`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByText("5V is already selected.")).toBeVisible();
  await makeWire(page, "Connect 5V to the + line", name);
  await expect(page.getByText("Next, you start Arduino Foundations.")).toBeVisible();
  expect(await startCookie(page), "the lobby opens Arduino Foundations").toBe("arduino-foundations");
  expect(await fitsWidth(page), "no sideways scroll on the sign-up screen").toBe(true);
  await page.getByRole("link", { name: "Create my account" }).click();
  await page.waitForURL(/\/signup/);
});

test("A visitor who writes code gets a real device selected, wires 3V3 on the ESP32-S3, and starts Perch", async ({ page }, testInfo) => {
  const name = `flow6-onboarding-${testInfo.project.name}-code`;
  await toLevel(page);
  await answer(page, "I write code for boards");
  await answer(page, "Regular");

  await expect(page.getByRole("radio", { name: "Build a real device" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByText("3V3 is already selected.")).toBeVisible();
  await makeWire(page, "Connect 3V3 to the + line", name);
  await expect(page.getByText("Next, you start Perch.")).toBeVisible();
  expect(await startCookie(page), "the lobby opens Perch").toBe("perch");
});

test("A visitor can change the selected start answer, and the wire follows the new answer", async ({ page }, testInfo) => {
  const name = `flow6-onboarding-${testInfo.project.name}-change`;
  await toLevel(page);
  await answer(page, "I am new to circuits");
  await answer(page, "Serious");

  await expect(page.getByRole("radio", { name: "Learn the basics first" })).toHaveAttribute("aria-checked", "true");
  await answer(page, "Build a real device");

  await makeWire(page, "Connect 3V3 to the + line", name);
  await expect(page.getByText("Next, you start Perch.")).toBeVisible();
  expect(await startCookie(page)).toBe("perch");
});
