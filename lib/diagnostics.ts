import type { ApprovalFlowTemplate } from "@/lib/grpc/approvalflow-client";
import type {
  ReportingApprovalAnalytics,
  ReportingOverview
} from "@/lib/grpc/reporting-client";
import type { SubscriptionPlan } from "@/lib/grpc/subscription-client";
import type { TenantSubscription } from "@/lib/grpc/tenant-client";
import { formatSubscriptionDate } from "@/lib/subscriptions";

export type AdminCapabilitySummary = {
  key: string;
  label: string;
  enabled: boolean;
  note: string;
};

export type SubscriptionDiagnostics = {
  totalRecords: number;
  activeCount: number;
  cancelledCount: number;
  activePlanLabel: string;
  activeSeatCount: number | null;
  activeStartedAt: string;
  planCatalogCount: number;
  activePlanCount: number;
  inactivePlanCount: number;
  hasActiveSubscription: boolean;
  latestStatusLabel: string;
  latestLifecycleNote: string;
};

export type ApprovalFlowDiagnostics = {
  total: number;
  sampledCount: number;
  published: number;
  draft: number;
  archived: number;
  sampleMayBePartial: boolean;
  targetSummary: string[];
};

export type ReportingDiagnostics = {
  totalEmployees: number;
  activeEmployees: number;
  pendingApprovals: number;
  pendingRequests: number;
  approvalFunnelRate: number;
  hottestQueueLabel: string;
  hottestQueuePending: number;
  hottestTargetLabel: string;
  hottestTargetPending: number;
  busiestManagerName: string;
  busiestManagerPendingApprovals: number;
  pendingLeaveRequests: number;
  pendingClaimRequests: number;
};

export function buildAdminCapabilitySummary(input: {
  canManageApprovalFlows: boolean;
  canViewReporting: boolean;
  canManageSubscriptions: boolean;
}) {
  return [
    {
      key: "approvalFlows",
      label: "Approval flows",
      enabled: input.canManageApprovalFlows,
      note: input.canManageApprovalFlows
        ? "Templates, publish, and binding controls are available."
        : "Flow builder access is not assigned to this operator."
    },
    {
      key: "reporting",
      label: "Reporting",
      enabled: input.canViewReporting,
      note: input.canViewReporting
        ? "Tenant reporting and approval analytics are available."
        : "Reporting analytics are not assigned to this operator."
    },
    {
      key: "subscriptions",
      label: "Subscriptions",
      enabled: input.canManageSubscriptions,
      note: input.canManageSubscriptions
        ? "Plan catalog and tenant subscription operations are available."
        : "Subscription operations are not assigned to this operator."
    }
  ] satisfies AdminCapabilitySummary[];
}

export function buildSubscriptionDiagnostics(
  subscriptions: TenantSubscription[],
  plans: SubscriptionPlan[]
): SubscriptionDiagnostics {
  const sortedSubscriptions = [...subscriptions].sort((left, right) => {
    const leftTime = new Date(left.cancelledAt || left.startedAt).getTime();
    const rightTime = new Date(right.cancelledAt || right.startedAt).getTime();
    return rightTime - leftTime;
  });
  const activeRecord =
    sortedSubscriptions.find((entry) => entry.status === "SUBSCRIPTION_STATUS_ACTIVE") ?? null;
  const latestRecord = activeRecord ?? sortedSubscriptions[0] ?? null;
  const activePlan = activeRecord
    ? plans.find((plan) => plan.id === activeRecord.planId) ?? null
    : null;
  const latestPlan = latestRecord
    ? plans.find((plan) => plan.id === latestRecord.planId) ?? null
    : null;

  return {
    totalRecords: subscriptions.length,
    activeCount: subscriptions.filter((entry) => entry.status === "SUBSCRIPTION_STATUS_ACTIVE")
      .length,
    cancelledCount: subscriptions.filter(
      (entry) => entry.status === "SUBSCRIPTION_STATUS_CANCELLED"
    ).length,
    activePlanLabel: activePlan?.name ?? latestPlan?.name ?? "No active subscription",
    activeSeatCount: activeRecord?.seatCount ?? latestRecord?.seatCount ?? null,
    activeStartedAt: activeRecord?.startedAt ?? "",
    planCatalogCount: plans.length,
    activePlanCount: plans.filter((plan) => plan.isActive).length,
    inactivePlanCount: plans.filter((plan) => !plan.isActive).length,
    hasActiveSubscription: activeRecord != null,
    latestStatusLabel:
      latestRecord?.status === "SUBSCRIPTION_STATUS_ACTIVE"
        ? "Active"
        : latestRecord?.status === "SUBSCRIPTION_STATUS_CANCELLED"
          ? "Cancelled"
          : "No active subscription",
    latestLifecycleNote:
      latestRecord == null
        ? "No tenant contract has been launched yet."
        : latestRecord.status === "SUBSCRIPTION_STATUS_ACTIVE"
          ? `${latestRecord.seatCount} seats · started ${formatSubscriptionDate(
              latestRecord.startedAt
            )}`
          : `${latestRecord.seatCount} seats · cancelled ${formatSubscriptionDate(
              latestRecord.cancelledAt || latestRecord.startedAt
            )}`
  };
}

export function buildApprovalFlowDiagnostics(
  templates: ApprovalFlowTemplate[],
  totalTemplates = templates.length
): ApprovalFlowDiagnostics {
  const targetCounts = new Map<string, number>();

  for (const template of templates) {
    const current = targetCounts.get(template.targetType) ?? 0;
    targetCounts.set(template.targetType, current + 1);
  }

  return {
    total: totalTemplates,
    sampledCount: templates.length,
    published: templates.filter(
      (template) => template.status === "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED"
    ).length,
    draft: templates.filter(
      (template) => template.status === "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT"
    ).length,
    archived: templates.filter(
      (template) => template.status === "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED"
    ).length,
    sampleMayBePartial: totalTemplates > templates.length,
    targetSummary: [...targetCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([targetType, count]) => `${targetType}:${count}`)
  };
}

export function buildReportingDiagnostics(
  overview: ReportingOverview,
  approvalAnalytics: ReportingApprovalAnalytics
): ReportingDiagnostics {
  const hottestQueue =
    [...overview.queues].sort((left, right) => right.pending - left.pending)[0] ?? null;
  const hottestTarget =
    [...approvalAnalytics.targets].sort(
      (left, right) => right.pendingRequests - left.pendingRequests
    )[0] ?? null;
  const busiestManager =
    [...overview.managers].sort(
      (left, right) => right.pendingApprovals - left.pendingApprovals
    )[0] ?? null;

  return {
    totalEmployees: overview.totalEmployees,
    activeEmployees: overview.activeEmployees,
    pendingApprovals: overview.pendingApprovals,
    pendingRequests: approvalAnalytics.pendingRequests,
    approvalFunnelRate: approvalAnalytics.approvalFunnelRate,
    hottestQueueLabel: hottestQueue?.label ?? "No queue pressure yet",
    hottestQueuePending: hottestQueue?.pending ?? 0,
    hottestTargetLabel: hottestTarget?.label ?? "No approval target pressure yet",
    hottestTargetPending: hottestTarget?.pendingRequests ?? 0,
    busiestManagerName: busiestManager?.managerName ?? "No manager pressure yet",
    busiestManagerPendingApprovals: busiestManager?.pendingApprovals ?? 0,
    pendingLeaveRequests: overview.pendingLeaveRequests,
    pendingClaimRequests: overview.pendingClaimRequests
  };
}
