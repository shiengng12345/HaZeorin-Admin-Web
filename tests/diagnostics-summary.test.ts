import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminCapabilitySummary,
  buildApprovalFlowDiagnostics,
  buildSubscriptionDiagnostics
} from "../lib/diagnostics";

test("subscription diagnostics prefer the active plan and seat count", () => {
  const summary = buildSubscriptionDiagnostics(
    [
      {
        id: "subscription_1",
        tenantId: "tenant_1",
        planId: "plan_growth",
        status: "SUBSCRIPTION_STATUS_ACTIVE",
        seatCount: 24,
        startedAt: "2026-04-01T00:00:00Z",
        cancelledAt: ""
      },
      {
        id: "subscription_2",
        tenantId: "tenant_1",
        planId: "plan_legacy",
        status: "SUBSCRIPTION_STATUS_CANCELLED",
        seatCount: 10,
        startedAt: "2025-01-01T00:00:00Z",
        cancelledAt: "2025-12-31T00:00:00Z"
      }
    ],
    [
      {
        id: "plan_growth",
        code: "growth",
        name: "Growth Annual",
        description: "Growth",
        priceCents: 100,
        currency: "MYR",
        interval: "PLAN_INTERVAL_YEARLY",
        isActive: true
      },
      {
        id: "plan_legacy",
        code: "legacy",
        name: "Legacy Monthly",
        description: "Legacy",
        priceCents: 100,
        currency: "MYR",
        interval: "PLAN_INTERVAL_MONTHLY",
        isActive: false
      }
    ]
  );

  assert.equal(summary.activePlanLabel, "Growth Annual");
  assert.equal(summary.activeSeatCount, 24);
  assert.equal(summary.activeCount, 1);
  assert.equal(summary.cancelledCount, 1);
});

test("approval flow diagnostics split statuses and target mix", () => {
  const summary = buildApprovalFlowDiagnostics([
    {
      id: "flow_1",
      tenantId: "tenant_1",
      code: "leave_default",
      name: "Leave Default",
      description: "",
      targetType: "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
      status: "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED",
      latestVersionNo: 2,
      publishedVersionId: "version_2"
    },
    {
      id: "flow_2",
      tenantId: "tenant_1",
      code: "claim_default",
      name: "Claim Default",
      description: "",
      targetType: "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
      status: "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT",
      latestVersionNo: 1,
      publishedVersionId: ""
    },
    {
      id: "flow_3",
      tenantId: "tenant_1",
      code: "claim_backup",
      name: "Claim Backup",
      description: "",
      targetType: "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
      status: "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED",
      latestVersionNo: 4,
      publishedVersionId: "version_3"
    }
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.published, 1);
  assert.equal(summary.draft, 1);
  assert.equal(summary.archived, 1);
  assert.deepEqual(summary.targetSummary, [
    "APPROVAL_FLOW_TARGET_TYPE_CLAIM:2",
    "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST:1"
  ]);
});

test("capability summary marks enabled and disabled modules independently", () => {
  const summary = buildAdminCapabilitySummary({
    canManageApprovalFlows: true,
    canViewReporting: false,
    canManageSubscriptions: true
  });

  assert.equal(summary[0]?.enabled, true);
  assert.equal(summary[1]?.enabled, false);
  assert.equal(summary[2]?.enabled, true);
});
