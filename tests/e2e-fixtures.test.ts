import assert from "node:assert/strict";
import test from "node:test";

import {
  fixtureArchiveApprovalFlow,
  fixtureCreateApprovalFlow,
  fixtureCreatePlan,
  fixtureCreateSubscription,
  fixtureDeleteReportingSavedPreset,
  fixtureGetApprovalFlow,
  fixtureGetPlan,
  fixtureListApprovalFlowBindings,
  fixtureListApprovalFlows,
  fixtureListPlans,
  fixtureListReportingSavedPresets,
  fixtureListSubscriptions,
  fixtureLogin,
  fixturePublishApprovalFlow,
  fixtureChangeSubscriptionPlan,
  fixtureCancelSubscription,
  fixtureGetApprovalAnalytics,
  fixtureUpdateApprovalFlowDraft,
  fixtureUpdatePlan,
  fixtureSimulateApprovalFlow,
  fixtureUpsertReportingSavedPreset,
  fixtureUpsertApprovalFlowBinding
} from "../lib/e2e-fixtures";
import { DEFAULT_APPROVAL_FLOW_GRAPH_JSON } from "../lib/approval-flows";

test("approval-flow fixtures paginate beyond the first page", async () => {
  const session = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_malaysia_ops"
  });

  for (let index = 0; index < 11; index += 1) {
    await fixtureCreateApprovalFlow(session, {
      code: `ops_fixture_${index}`,
      name: `Ops Fixture ${index}`,
      description: `Fixture approval flow ${index}`,
      targetType: "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
      graphJson: DEFAULT_APPROVAL_FLOW_GRAPH_JSON
    });
  }

  const pageOne = await fixtureListApprovalFlows(session, {
    page: 1,
    limit: 10,
    includeArchived: false
  });
  const pageTwo = await fixtureListApprovalFlows(session, {
    page: 2,
    limit: 10,
    includeArchived: false
  });

  assert.equal(pageOne.pagination.total, 12);
  assert.equal(pageOne.list.length, 10);
  assert.equal(pageTwo.list.length, 2);
  assert.notEqual(pageOne.list.at(-1)?.id, pageTwo.list[0]?.id);
  assert.equal(pageTwo.list[0]?.code, "ops_fixture_0");
});

test("approval-flow fixtures support draft update, publish, binding save, and archive", async () => {
  const session = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_malaysia_ops"
  });

  const created = await fixtureCreateApprovalFlow(session, {
    code: "ops_overtime_detail_test",
    name: "Ops Overtime Detail Test",
    description: "Initial detail flow.",
    targetType: "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
    graphJson: DEFAULT_APPROVAL_FLOW_GRAPH_JSON
  });

  const updated = await fixtureUpdateApprovalFlowDraft(session, {
    templateId: created.template.id,
    name: "Ops Overtime Detail Final",
    description: "Updated draft.",
    graphJson: DEFAULT_APPROVAL_FLOW_GRAPH_JSON
  });

  assert.equal(updated.template.name, "Ops Overtime Detail Final");
  assert.equal(updated.draftVersion?.graphJson, DEFAULT_APPROVAL_FLOW_GRAPH_JSON);

  const published = await fixturePublishApprovalFlow(session, {
    templateId: created.template.id
  });

  assert.equal(published.template.status, "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED");
  assert.ok(published.publishedVersion);
  assert.equal(published.issues.length, 0);

  const createdBinding = await fixtureUpsertApprovalFlowBinding(session, {
    name: "Ops Overtime Default",
    targetType: "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
    templateId: created.template.id,
    priority: 5,
    isDefault: true,
    isActive: true,
    conditionsJson: "{\"country\":\"MY\"}"
  });

  assert.equal(createdBinding.versionId, published.template.publishedVersionId);

  const updatedBinding = await fixtureUpsertApprovalFlowBinding(session, {
    bindingId: createdBinding.id,
    name: "Ops Overtime Default Updated",
    targetType: "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
    templateId: created.template.id,
    priority: 7,
    isDefault: true,
    isActive: false,
    conditionsJson: "{\"country\":\"MY\",\"site\":\"KL\"}"
  });

  assert.equal(updatedBinding.name, "Ops Overtime Default Updated");
  assert.equal(updatedBinding.priority, 7);
  assert.equal(updatedBinding.isActive, false);

  const bindingPage = await fixtureListApprovalFlowBindings(session, {
    page: 1,
    limit: 10,
    search: "Updated",
    targetType: "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
    includeInactive: true
  });

  assert.equal(bindingPage.list.length, 1);
  assert.equal(bindingPage.list[0]?.id, updatedBinding.id);

  const archived = await fixtureArchiveApprovalFlow(session, {
    templateId: created.template.id
  });
  const record = await fixtureGetApprovalFlow(session, created.template.id);

  assert.equal(archived.status, "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED");
  assert.equal(record?.template.status, "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED");
});

test("approval-flow fixtures can simulate runtime routing for a saved template", async () => {
  const session = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_platform_hq"
  });

  const result = await fixtureSimulateApprovalFlow(session, {
    tenantId: "tenant_platform_hq",
    templateId: "flow_leave_default",
    requesterId: "admin_user_1",
    requesterEmployeeId: "employee_fixture_1",
    fieldsJson: JSON.stringify({
      country: "MY",
      leaveTypeCode: "annual",
      durationDays: 2
    })
  });

  assert.equal(result.templateId, "flow_leave_default");
  assert.equal(result.versionId, "flow_leave_v1");
  assert.deepEqual(result.visitedNodeIds, ["start", "manager_approval", "end"]);
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0]?.nodeId, "manager_approval");
  assert.equal(
    result.steps[0]?.executionMode,
    "APPROVAL_NODE_EXECUTION_MODE_ALL_APPROVE"
  );
  assert.deepEqual(result.steps[0]?.approverIds, ["mgr_hq_1"]);
});

test("plan and subscription fixtures support create, update, launch, change, and cancel", async () => {
  const session = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_malaysia_ops"
  });

  const createdPlan = await fixtureCreatePlan({
    code: "ops_scale_monthly",
    name: "Ops Scale Monthly",
    description: "Scale package for Malaysia operations.",
    priceCents: 29900,
    currency: "MYR",
    interval: "PLAN_INTERVAL_MONTHLY"
  });

  const updatedPlan = await fixtureUpdatePlan({
    planId: createdPlan.id,
    name: "Ops Scale Monthly Plus",
    description: "Updated scale package.",
    priceCents: 34900,
    currency: "MYR",
    interval: "PLAN_INTERVAL_MONTHLY",
    isActive: true
  });

  assert.equal(updatedPlan.name, "Ops Scale Monthly Plus");
  assert.equal((await fixtureGetPlan(createdPlan.id)).priceCents, 34900);

  const filteredPlans = await fixtureListPlans({
    page: 1,
    limit: 10,
    search: "Scale Monthly Plus",
    sortBy: "price_cents",
    sortType: "SORT_TYPE_ASC",
    isActive: true
  });

  assert.equal(filteredPlans.list.length, 1);
  assert.equal(filteredPlans.list[0]?.id, createdPlan.id);

  const launchedSubscription = await fixtureCreateSubscription(session, {
    tenantId: "tenant_malaysia_ops",
    planId: createdPlan.id,
    seatCount: 24
  });

  assert.equal(launchedSubscription.status, "SUBSCRIPTION_STATUS_ACTIVE");

  const changedSubscription = await fixtureChangeSubscriptionPlan(session, {
    subscriptionId: launchedSubscription.id,
    newPlanId: "plan_growth_yearly"
  });

  assert.equal(changedSubscription.planId, "plan_growth_yearly");

  const cancelledSubscription = await fixtureCancelSubscription(
    session,
    launchedSubscription.id
  );

  assert.equal(cancelledSubscription.status, "SUBSCRIPTION_STATUS_CANCELLED");

  const filteredSubscriptions = await fixtureListSubscriptions(session, {
    page: 1,
    limit: 10,
    search: "Growth Annual",
    sortBy: "ts.started_at",
    sortType: "SORT_TYPE_DESC",
    status: "SUBSCRIPTION_STATUS_CANCELLED"
  });

  assert.equal(filteredSubscriptions.list.length, 1);
  assert.equal(filteredSubscriptions.list[0]?.id, launchedSubscription.id);
});

test("reporting preset fixtures support save, replace, list, and delete", async () => {
  const session = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_malaysia_ops"
  });

  const first = await fixtureUpsertReportingSavedPreset(session, {
    name: "  All time   view ",
    scopeSummary: " All time tenant snapshot ",
    window: "REPORTING_WINDOW_ALL_TIME"
  });

  const updated = await fixtureUpsertReportingSavedPreset(session, {
    name: "all time view",
    scopeSummary: "Last 7 days tenant snapshot",
    window: "REPORTING_WINDOW_LAST_7_DAYS"
  });

  assert.equal(updated.id, first.id);
  assert.equal(updated.window, "REPORTING_WINDOW_LAST_7_DAYS");
  assert.equal(updated.scopeSummary, "Last 7 days tenant snapshot");

  const listed = await fixtureListReportingSavedPresets(session);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.name, "all time view");

  const deleted = await fixtureDeleteReportingSavedPreset(session, updated.id);
  assert.equal(deleted, true);
  assert.deepEqual(await fixtureListReportingSavedPresets(session), []);
});

test("reporting analytics fixtures expose approved and rejected counts", async () => {
  const opsSession = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_malaysia_ops"
  });
  const hqSession = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_platform_hq"
  });

  const opsAnalytics = await fixtureGetApprovalAnalytics(opsSession);
  assert.equal(opsAnalytics.approvedRequests, 2);
  assert.equal(opsAnalytics.rejectedRequests, 1);
  assert.equal(opsAnalytics.approvalFunnelRate, 66.66666666666666);
  assert.equal(opsAnalytics.targets[0]?.approvedRequests, 2);
  assert.equal(opsAnalytics.targets[0]?.rejectedRequests, 1);

  const hqAnalytics = await fixtureGetApprovalAnalytics(hqSession);
  assert.equal(hqAnalytics.approvedRequests, 4);
  assert.equal(hqAnalytics.rejectedRequests, 1);
  assert.equal(hqAnalytics.approvalFunnelRate, 80);
  assert.equal(hqAnalytics.targets[0]?.approvedRequests, 4);
  assert.equal(hqAnalytics.targets[0]?.rejectedRequests, 1);
});
