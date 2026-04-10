import { expect, test } from "@playwright/test";

test("login, switch tenant, and inspect the diagnostics workspace", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Business email").fill("platform.admin@hazeorin.test");
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.getByLabel("Switch tenant").selectOption("tenant_malaysia_ops");
  await page.getByRole("button", { name: "Apply tenant" }).click();

  await expect(page.getByText("Tenant switched.")).toBeVisible();
  await page.getByRole("link", { name: "Open diagnostics" }).click();

  await expect(page).toHaveURL(/\/diagnostics$/);
  await expect(page.getByRole("heading", { name: "Tenant diagnostics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Capability coverage" })).toBeVisible();
  await expect(
    page.locator(".module-hero-kpis .metric-card").first().getByText("Malaysia Operations")
  ).toBeVisible();
  await expect(
    page.locator(".module-hero-kpis .metric-card").filter({ hasText: "Subscription state" }).getByText("Starter Monthly")
  ).toBeVisible();
  await expect(page.getByText("Last 30 days snapshot")).toBeVisible();
});
