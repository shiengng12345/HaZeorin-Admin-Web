import { expect, test } from "@playwright/test";

test("login, create and update a plan, then launch, change, and cancel a subscription", async ({
  page
}) => {
  await page.goto("/login");

  await page.getByLabel("Business email").fill("platform.admin@hazeorin.test");
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.getByLabel("Switch tenant").selectOption("tenant_malaysia_ops");
  await page.getByRole("button", { name: "Apply tenant" }).click();

  await expect(page).toHaveURL(/\/\?message=Tenant\+switched\./);
  await expect(page.getByText("Tenant switched.")).toBeVisible();

  await page.getByRole("link", { name: "All plans", exact: true }).click();

  await expect(page).toHaveURL(/\/plans$/);
  await expect(page.getByRole("heading", { name: "Plan catalog" })).toBeVisible();

  await page
    .locator(".module-hero-actions")
    .getByRole("link", { name: "Create plan", exact: true })
    .click();

  await expect(page).toHaveURL(/\/plans\/new$/);
  await page.getByLabel("Plan code").fill("ops_scale_monthly");
  await page.getByLabel("Plan name").fill("Ops Scale Monthly");
  await page.getByLabel("Price").fill("299.00");
  await page.getByLabel("Currency").fill("MYR");
  await page.getByLabel("Interval").selectOption("PLAN_INTERVAL_MONTHLY");
  await page
    .getByLabel("Description")
    .fill("Scale package for Malaysia operations.");
  await page.getByRole("button", { name: "Create subscription plan" }).click();

  await expect(page).toHaveURL(/\/plans\/plan_fixture_\d+\?/);
  await expect(page.getByText("Subscription plan created.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ops Scale Monthly" })).toBeVisible();

  const planId = page.url().match(/\/plans\/([^?]+)/)?.[1];
  expect(planId).toBeTruthy();

  await page.getByLabel("Plan name").fill("Ops Scale Monthly Plus");
  await page.getByLabel("Price").fill("349.00");
  await page.getByRole("button", { name: "Save plan changes" }).click();

  await expect(page.getByText("Subscription plan updated.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ops Scale Monthly Plus" })).toBeVisible();

  await page.getByRole("link", { name: "Back to catalog" }).first().click();

  await expect(page).toHaveURL(/\/plans$/);
  await expect(page.getByText("ops_scale_monthly")).toBeVisible();
  await expect(page.getByText("Ops Scale Monthly Plus")).toBeVisible();

  await page.getByRole("link", { name: "Operations", exact: true }).click();

  await expect(page).toHaveURL(/\/subscriptions$/);
  await expect(page.getByRole("heading", { name: "Subscription operations" })).toBeVisible();

  await page.locator('#planId[name="planId"]').first().selectOption(planId!);
  await page.getByLabel("Seat count").fill("24");
  await page.getByRole("button", { name: "Launch subscription" }).click();

  await expect(page.getByText("Tenant subscription launched.")).toBeVisible();
  await expect(page.getByRole("table").getByText("Ops Scale Monthly Plus")).toBeVisible();

  const activeRow = page.locator("tr").filter({ hasText: "Ops Scale Monthly Plus" }).first();
  await activeRow.locator('select[name="newPlanId"]').selectOption("plan_growth_yearly");
  await activeRow.getByRole("button", { name: "Change plan" }).click();

  await expect(page.getByText("Subscription plan changed.")).toBeVisible();

  const changedRow = page.locator("tr").filter({ hasText: "Growth Annual" }).filter({ hasText: "24" }).first();
  await expect(changedRow).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await changedRow.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByText("Subscription cancelled.")).toBeVisible();
  await expect(changedRow.locator(".status-chip").getByText("Cancelled", { exact: true })).toBeVisible();
});
