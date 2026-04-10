import { expect, test } from "@playwright/test";

test("approval-flow detail simulation runs and renders runtime routing", async ({ page }) => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await page.context().addCookies([
    {
      name: "hz_admin_user_id",
      value: "admin_user_1",
      url: "http://127.0.0.1:3201"
    },
    {
      name: "hz_admin_access_token",
      value: "fixture-admin-access:admin_user_1:tenant_malaysia_ops",
      url: "http://127.0.0.1:3201"
    },
    {
      name: "hz_admin_refresh_token",
      value: "fixture-admin-refresh:admin_user_1:tenant_malaysia_ops",
      url: "http://127.0.0.1:3201"
    },
    {
      name: "hz_admin_tenant_id",
      value: "tenant_malaysia_ops",
      url: "http://127.0.0.1:3201"
    },
    {
      name: "hz_admin_access_expires_at",
      value: future,
      url: "http://127.0.0.1:3201"
    },
    {
      name: "hz_admin_refresh_expires_at",
      value: future,
      url: "http://127.0.0.1:3201"
    }
  ]);

  await page.goto("/approval-flows/flow_claim_ops");

  await expect(page.getByRole("heading", { name: "Operations Claim Review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Simulation workspace" })).toBeVisible();

  await page.getByLabel("Requester user ID").fill("admin_user_1");
  await page.getByLabel("Requester employee ID").fill("employee_ops_001");
  await page
    .getByLabel("Runtime fields JSON")
    .fill(
      JSON.stringify(
        {
          country: "MY",
          categoryCode: "travel",
          amountCents: 12500,
          managerId: "mgr_ops_1"
        },
        null,
        2
      )
    );

  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page).toHaveURL(/\/approval-flows\/flow_claim_ops\?.*simulate=true/);
  const simulationPanel = page
    .locator("section.panel.catalog-panel")
    .filter({ has: page.getByRole("heading", { name: "Simulation workspace" }) });
  await expect(page.getByRole("heading", { name: "Simulation workspace" })).toBeVisible();
  await expect(
    simulationPanel
      .locator(".operations-summary-card")
      .filter({ hasText: "Version" })
      .getByText("flow_claim_v1")
  ).toBeVisible();
  const stepRow = simulationPanel.locator("tbody tr").first();
  await expect(stepRow.locator("td").nth(1)).toContainText("manager_approval");
  await expect(stepRow.locator("td").nth(3)).toContainText("mgr_ops_1");
  await expect(simulationPanel.getByText("Visited node IDs")).toBeVisible();
});
