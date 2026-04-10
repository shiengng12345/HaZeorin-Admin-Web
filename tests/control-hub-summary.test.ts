import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApprovalFlowDiagnostics,
  buildReportingDiagnostics,
  buildSubscriptionDiagnostics
} from "../lib/diagnostics";

test("control hub flow summary counts draft, published, and archived templates", () => {
  const summary = buildApprovalFlowDiagnostics(
    [
      {
        id: "flow_1",
        tenantId: "tenant_1",
        code: "leave_review",
        name: "Leave Review",
        description: "",
        targetType: "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
        status: "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED",
        latestVersionNo: 2,
        publishedVersionId: "version_2"
      },
      {
        id: "flow_2",
        tenantId: "tenant_1",
        code: "claim_review",
        name: "Claim Review",
        description: "",
        targetType: "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
        status: "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT",
        latestVersionNo: 1,
        publishedVersionId: ""
      },
      {
        id: "flow_3",
        tenantId: "tenant_1",
        code: "old_flow",
        name: "Old Flow",
        description: "",
        targetType: "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
        status: "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED",
        latestVersionNo: 4,
        publishedVersionId: "version_4"
      }
    ],
    5
  );

  assert.equal(summary.total, 5);
  assert.equal(summary.sampledCount, 3);
  assert.equal(summary.published, 1);
  assert.equal(summary.draft, 1);
  assert.equal(summary.archived, 1);
  assert.equal(summary.sampleMayBePartial, true);
});

test("control hub subscription summary surfaces current plan posture", () => {
  const summary = buildSubscriptionDiagnostics(
    [
      {
        id: "sub_1",
        tenantId: "tenant_1",
        planId: "plan_growth",
        status: "SUBSCRIPTION_STATUS_ACTIVE",
        seatCount: 42,
        startedAt: "2026-04-01T00:00:00Z",
        cancelledAt: ""
      }
    ],
    [
      {
        id: "plan_growth",
        code: "growth",
        name: "Growth Annual",
        description: "",
        priceCents: 120000,
        currency: "MYR",
        interval: "PLAN_INTERVAL_YEARLY",
        isActive: true
      },
      {
        id: "plan_legacy",
        code: "legacy",
        name: "Legacy",
        description: "",
        priceCents: 50000,
        currency: "MYR",
        interval: "PLAN_INTERVAL_MONTHLY",
        isActive: false
      }
    ]
  );

  assert.equal(summary.activeCount, 1);
  assert.equal(summary.cancelledCount, 0);
  assert.equal(summary.totalRecords, 1);
  assert.equal(summary.activePlanCount, 1);
  assert.equal(summary.inactivePlanCount, 1);
  assert.equal(summary.activePlanLabel, "Growth Annual");
  assert.equal(summary.activeSeatCount, 42);
  assert.equal(summary.hasActiveSubscription, true);
  assert.equal(summary.latestStatusLabel, "Active");
});

test("control hub subscription summary falls back to the latest cancelled contract", () => {
  const summary = buildSubscriptionDiagnostics(
    [
      {
      id: "sub_cancelled",
      tenantId: "tenant_1",
      planId: "plan_starter",
      status: "SUBSCRIPTION_STATUS_CANCELLED",
      seatCount: 12,
      startedAt: "2026-01-01T00:00:00Z",
      cancelledAt: "2026-03-01T00:00:00Z"
    }
    ],
    [
      {
        id: "plan_starter",
        code: "starter",
        name: "Starter Monthly",
        description: "",
        priceCents: 9900,
        currency: "MYR",
        interval: "PLAN_INTERVAL_MONTHLY",
        isActive: true
      }
    ]
  );

  assert.equal(summary.activePlanLabel, "Starter Monthly");
  assert.equal(summary.activeSeatCount, 12);
  assert.equal(summary.hasActiveSubscription, false);
  assert.equal(summary.latestStatusLabel, "Cancelled");
});

test("control hub reporting summary surfaces hottest queue and manager pressure", () => {
  const summary = buildReportingDiagnostics(
    {
      totalDepartments: 2,
      activeDepartments: 2,
      totalEmployees: 12,
      activeEmployees: 10,
      probationEmployees: 1,
      inactiveEmployees: 2,
      pendingLeaveRequests: 3,
      approvedLeaveRequests: 4,
      rejectedLeaveRequests: 1,
      pendingClaimRequests: 7,
      approvedClaimRequests: 2,
      rejectedClaimRequests: 1,
      pendingApprovals: 9,
      departments: [],
      managers: [
        {
          managerId: "mgr_1",
          managerName: "Alice Manager",
          pendingApprovals: 6,
          queueShare: 66
        },
        {
          managerId: "mgr_2",
          managerName: "Bob Manager",
          pendingApprovals: 3,
          queueShare: 34
        }
      ],
      workforce: [],
      queues: [
        {
          key: "leave",
          label: "Leave requests",
          pending: 3,
          approved: 4,
          rejected: 1
        },
        {
          key: "claim",
          label: "Claim requests",
          pending: 7,
          approved: 2,
          rejected: 1
        }
      ]
    },
    {
      totalRequests: 15,
      pendingRequests: 8,
      activeAssignments: 6,
      reassignedAssignments: 1,
      averageResolutionHours: 12,
      averageStepActionHours: 4,
      approvedRequests: 5,
      rejectedRequests: 2,
      approvalFunnelRate: 71.4,
      pendingAges: [],
      targets: [
        {
          key: "leave",
          label: "Leave",
          totalRequests: 6,
          pendingRequests: 2,
          approvedRequests: 3,
          rejectedRequests: 1,
          reassignedRequests: 0,
          skippedRequests: 0
        },
        {
          key: "claim",
          label: "Claim",
          totalRequests: 9,
          pendingRequests: 6,
          approvedRequests: 2,
          rejectedRequests: 1,
          reassignedRequests: 1,
          skippedRequests: 0
        }
      ],
      executionModes: []
    }
  );

  assert.equal(summary.totalEmployees, 12);
  assert.equal(summary.activeEmployees, 10);
  assert.equal(summary.pendingApprovals, 9);
  assert.equal(summary.pendingRequests, 8);
  assert.equal(summary.pendingLeaveRequests, 3);
  assert.equal(summary.pendingClaimRequests, 7);
  assert.equal(summary.busiestManagerName, "Alice Manager");
  assert.equal(summary.busiestManagerPendingApprovals, 6);
  assert.equal(summary.hottestQueueLabel, "Claim requests");
  assert.equal(summary.hottestQueuePending, 7);
  assert.equal(summary.hottestTargetLabel, "Claim");
  assert.equal(summary.hottestTargetPending, 6);
});
