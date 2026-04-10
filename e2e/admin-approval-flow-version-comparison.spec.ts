import { expect, test } from "@playwright/test";

test("approval-flow detail version comparison shows draft and published snapshots", async ({
  page
}) => {
  await page.goto("/login");

  await page.getByLabel("Business email").fill("platform.admin@hazeorin.test");
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.getByLabel("Switch tenant").selectOption("tenant_malaysia_ops");
  await page.getByRole("button", { name: "Apply tenant" }).click();
  await expect(page.getByText("Tenant switched.")).toBeVisible();
  await page.goto("/approval-flows/flow_claim_ops");

  const comparisonPanel = page
    .locator("section.panel.catalog-panel")
    .filter({ has: page.getByRole("heading", { name: "Draft vs published comparison" }) });

  await expect(page.getByRole("heading", { name: "Draft vs published comparison" })).toBeVisible();
  await expect(
    comparisonPanel
      .locator(".operations-summary-card")
      .filter({ hasText: "Draft version" })
      .locator("strong")
      .filter({ hasText: /^v1$/ })
  ).toBeVisible();
  await expect(
    comparisonPanel
      .locator(".operations-summary-card")
      .filter({ hasText: "Published version" })
      .locator("strong")
      .filter({ hasText: /^v2$/ })
  ).toBeVisible();
  await expect(comparisonPanel.getByText("Draft and published graphs are structurally aligned.")).toBeVisible();
  await expect(comparisonPanel.getByRole("columnheader", { name: "Snapshot" })).toBeVisible();
  const rows = comparisonPanel.locator("tbody tr");
  await expect(rows.nth(0).locator("td").nth(0)).toContainText("Draft");
  await expect(rows.nth(1).locator("td").nth(0)).toContainText("Published");
});
