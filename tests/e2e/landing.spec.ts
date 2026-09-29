import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./support/a11y";

test("landing page introduces Framed", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Framed");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tap the label. Meet the artwork." }),
  ).toBeVisible();
});

test("landing page has no accessibility violations", async ({ page }) => {
  await page.goto("/");

  await expectNoA11yViolations(page);
});
