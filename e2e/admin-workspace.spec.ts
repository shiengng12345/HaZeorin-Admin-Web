import { expect, test } from "@playwright/test";

test("login, switch tenant, create an approval flow, and review tenant reporting", async ({
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

  await page.getByRole("link", { name: "Open approval flows" }).click();

  await expect(page).toHaveURL(/\/approval-flows$/);
  await expect(page.getByRole("heading", { name: "Approval flow library" })).toBeVisible();
  await expect(page.getByText("ops_claim_review")).toBeVisible();

  await page.getByRole("link", { name: "Create flow", exact: true }).click();

  await expect(page).toHaveURL(/\/approval-flows\/new$/);
  await page.getByLabel("Flow code").fill("ops_overtime_escalation");
  await page.getByLabel("Flow name").fill("Ops Overtime Escalation");
  await page.getByLabel("Target type").selectOption("APPROVAL_FLOW_TARGET_TYPE_OVERTIME");
  await page
    .getByLabel("Description")
    .fill("Escalation path for overtime requests in Malaysia operations.");
  await page.getByRole("button", { name: "Create approval flow" }).click();

  await expect(page).toHaveURL(/\/approval-flows\/flow_fixture_\d+\?/);
  await expect(page.getByText("Approval flow created.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ops Overtime Escalation" })).toBeVisible();
  await expect(
    page.locator(".record-mini-card").filter({ hasText: "Target" }).getByText("Overtime", {
      exact: true
    })
  ).toBeVisible();

  await page.getByLabel("Flow name").fill("Ops Overtime Escalation Final");
  await page.getByRole("button", { name: "Save draft changes" }).click();

  await expect(page.getByText("Draft updated.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ops Overtime Escalation Final" })
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish current draft" }).click();

  await expect(page.getByText("Approval flow published.")).toBeVisible();
  await expect(page.locator(".record-chip-row").getByText("Published")).toBeVisible();

  await page.getByLabel("Binding name").fill("Ops Overtime Default");
  await page.getByLabel("Priority").fill("5");
  await page.getByRole("button", { name: "Create binding" }).click();

  await expect(page.getByText("Binding created.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ops Overtime Default" })).toBeVisible();

  await page.getByRole("link", { name: "Reporting", exact: true }).click();

  await expect(page).toHaveURL(/\/reporting$/);
  await expect(page.getByRole("heading", { name: "Tenant reporting workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved views" })).toBeVisible();
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
