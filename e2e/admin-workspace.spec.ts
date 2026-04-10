import { expect, test } from "@playwright/test";

test("login, switch tenant, and review tenant reporting", async ({
  page
}) => {
  await page.goto("/login");

  await page.getByLabel("Business email").fill("platform.admin@hazeorin.test");
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Platform control hub" })).toBeVisible();

  await page.getByLabel("Switch tenant").selectOption("tenant_malaysia_ops");
  await page.getByRole("button", { name: "Apply tenant" }).click();

  await expect(page).toHaveURL(/\/\?message=Tenant\+switched\./);
  await expect(page.getByText("Tenant switched.")).toBeVisible();
  await expect(page.locator(".tenant-card").getByText("Malaysia Operations")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current tenant diagnostics" })).toBeVisible();
  await expect(
    page.getByText(/leave requests are still pending in the current snapshot/i)
  ).toBeVisible();
  await expect(
    page.getByText(/claim requests are still pending in the current snapshot/i)
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current subscription posture" })).toBeVisible();
  await expect(page.getByText("Starter Monthly is the latest historical contract for this tenant.")).toBeVisible();
  await expect(
    page
      .locator("section.panel.command-panel")
      .filter({ has: page.getByRole("heading", { name: "Current subscription posture" }) })
      .getByText("Cancelled", { exact: true })
  ).toBeVisible();
  await page.getByRole("link", { name: "Open reporting" }).click();

  await expect(page).toHaveURL(/\/reporting$/);
  await expect(page.getByRole("heading", { name: "Tenant reporting workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved views" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Target mix" })).toBeVisible();
  const targetMixRow = page
    .locator("section.panel.catalog-panel")
    .filter({ has: page.getByRole("heading", { name: "Target mix" }) })
    .locator("tbody tr")
    .first();
  await expect(targetMixRow.locator("td").nth(0)).toContainText("Claim");
  await expect(targetMixRow.locator("td").nth(1)).toContainText("6");
  await expect(targetMixRow.locator("td").nth(2)).toContainText("3");
  await expect(targetMixRow.locator("td").nth(3)).toContainText("2");
  await expect(targetMixRow.locator("td").nth(4)).toContainText("1");
  await page.getByRole("button", { name: "Save current view" }).click();
  await expect(page).toHaveURL(/\/reporting\?.*message=Reporting\+view\+saved\./);
  await expect(page.getByText("Reporting view saved.")).toBeVisible();
  await expect(page.getByText("All time view")).toBeVisible();

  const savedViews = page.getByRole("region", { name: "Saved reporting views" });
  await savedViews.locator(".screen-saved-view-inline-input").fill("Ops tenant watch");
  await savedViews.getByRole("button", { name: "Rename" }).click();

  await expect(page).toHaveURL(/\/reporting\?.*message=Saved\+view\+renamed\./);
  await expect(page.getByText("Saved view renamed.")).toBeVisible();
  await expect(page.getByText("Ops tenant watch")).toBeVisible();
  await expect(page.getByText("All time view")).not.toBeVisible();

  await savedViews.getByRole("button", { name: "Remove" }).click();

  await expect(page).toHaveURL(/\/reporting\?.*message=Saved\+view\+removed\./);
  await expect(page.getByText("Saved view removed.")).toBeVisible();
  await expect(page.getByText("Ops tenant watch")).not.toBeVisible();
  await expect(page.getByText("KL Operations")).toBeVisible();
  await expect(page.getByText("8 active in snapshot.")).toBeVisible();
});
