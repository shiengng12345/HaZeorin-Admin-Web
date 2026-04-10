import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  formatApprovalFlowTargetType,
  formatApprovalFlowTemplateStatus
} from "@/lib/approval-flows";
import {
  buildAdminCapabilitySummary,
  buildApprovalFlowDiagnostics,
  buildSubscriptionDiagnostics
} from "@/lib/diagnostics";
import { isAllowedAdminCapability } from "@/lib/env";
import { listApprovalFlows } from "@/lib/grpc/approvalflow-client";
import { listMyTenantMemberships } from "@/lib/grpc/auth-client";
import {
  frontendGetApprovalAnalytics,
  frontendGetOverview
} from "@/lib/grpc/reporting-client";
import { listPlans } from "@/lib/grpc/subscription-client";
import { listSubscriptions } from "@/lib/grpc/tenant-client";
import { formatPlanInterval, formatPriceFromCents } from "@/lib/plans";
import { executeProtectedPageCall, requirePageSession } from "@/lib/session";
import { formatSubscriptionDate, formatSubscriptionStatus } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiagnosticsPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

export default async function DiagnosticsPage({ searchParams }: DiagnosticsPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = "/diagnostics";
  const session = await requirePageSession(nextPath);
  const canManageApprovalFlows = isAllowedAdminCapability(
    session.userId,
    "manageApprovalFlows"
  );
  const canViewReporting = isAllowedAdminCapability(session.userId, "viewPlatformReporting");
  const canManageSubscriptions = isAllowedAdminCapability(
    session.userId,
    "manageSubscriptions"
  );

  const [memberships, planData, subscriptionData, flowData, overview, approvalAnalytics] =
    await executeProtectedPageCall(nextPath, (activeSession) =>
      Promise.all([
        listMyTenantMemberships(activeSession),
        canManageSubscriptions
          ? listPlans(activeSession, {
              page: 1,
              limit: 100,
              sortBy: "price_cents",
              sortType: "SORT_TYPE_ASC"
            })
          : Promise.resolve(null),
        canManageSubscriptions
          ? listSubscriptions(activeSession, {
              page: 1,
              limit: 20,
              sortBy: "ts.started_at",
              sortType: "SORT_TYPE_DESC"
            })
          : Promise.resolve(null),
        canManageApprovalFlows
          ? listApprovalFlows(activeSession, {
              page: 1,
              limit: 50,
              includeArchived: true
            })
          : Promise.resolve(null),
        canViewReporting
          ? frontendGetOverview(activeSession, {
              window: "REPORTING_WINDOW_LAST_30_DAYS"
            })
          : Promise.resolve(null),
        canViewReporting
          ? frontendGetApprovalAnalytics(activeSession, {
              window: "REPORTING_WINDOW_LAST_30_DAYS"
            })
          : Promise.resolve(null)
      ])
    );

  const currentMembership =
    memberships.find((membership) => membership.tenantId === session.tenantId) ?? null;
  const capabilitySummary = buildAdminCapabilitySummary({
    canManageApprovalFlows,
    canViewReporting,
    canManageSubscriptions
  });
  const subscriptionDiagnostics =
    planData && subscriptionData
      ? buildSubscriptionDiagnostics(subscriptionData.list, planData.list)
      : null;
  const flowDiagnostics = flowData ? buildApprovalFlowDiagnostics(flowData.list) : null;

  return (
    <AdminShell
      nextPath={nextPath}
      activeView="diagnostics"
      moduleTitle="Diagnostics"
      moduleDescription={
        <>
          Cross-module diagnostics for the active tenant, combining capability access, subscription
          state, approval-flow footprint, and the latest reporting pressure signals.
        </>
      }
    >
      <section className="content-stack">
        {params.message ? <div className="success-banner">{params.message}</div> : null}
        {params.error ? <div className="status-banner">{params.error}</div> : null}

        <section className="module-hero">
          <div className="module-hero-main">
            <div className="module-hero-pills">
              <span className="section-pill">Support module</span>
              <span className="section-pill section-pill-muted">Tenant diagnostics</span>
            </div>

            <h2 className="module-hero-title">Tenant diagnostics</h2>
            <p className="module-hero-copy">
              Pull the active tenant&apos;s control-plane context into one place before you jump
              into approval flows, reporting, or subscription operations.
            </p>

            <div className="module-hero-actions">
              <Link href="/" className="button-secondary">
                Back to control hub
              </Link>
              {canViewReporting ? (
                <Link href="/reporting" className="button-ghost">
                  Open reporting
                </Link>
              ) : null}
              {canManageSubscriptions ? (
                <Link href="/subscriptions" className="button-ghost">
                  Open operations
                </Link>
              ) : null}
            </div>
          </div>

          <div className="module-hero-kpis">
            <article className="metric-card">
              <span>Active tenant</span>
              <strong>{currentMembership?.tenantName ?? session.tenantId}</strong>
              <small>{currentMembership?.tenantId ?? session.tenantId}</small>
            </article>
            <article className="metric-card">
              <span>Capability coverage</span>
              <strong>{capabilitySummary.filter((entry) => entry.enabled).length} / 3</strong>
              <small>Modules currently assigned to this operator.</small>
            </article>
            <article className="metric-card">
              <span>Subscription state</span>
              <strong>{subscriptionDiagnostics?.activePlanLabel ?? "Unavailable"}</strong>
              <small>
                {subscriptionDiagnostics?.activeSeatCount
                  ? `${formatCount(subscriptionDiagnostics.activeSeatCount)} seats`
                  : "No active tenant subscription"}
              </small>
            </article>
            <article className="metric-card">
              <span>Approval load</span>
              <strong>{formatCount(approvalAnalytics?.pendingRequests ?? 0)}</strong>
              <small>Pending requests in the last 30 days.</small>
            </article>
          </div>
        </section>

        <section className="operations-summary-strip">
          <article className="operations-summary-card">
            <span>Tenant membership</span>
            <strong>{currentMembership?.role ?? "Unknown role"}</strong>
            <small>{currentMembership?.tenantStatus ?? "Status unavailable"}</small>
          </article>
          <article className="operations-summary-card">
            <span>Plan catalog</span>
            <strong>{formatCount(subscriptionDiagnostics?.planCatalogCount ?? 0)}</strong>
            <small>
              {formatCount(subscriptionDiagnostics?.activePlanCount ?? 0)} active plans available.
            </small>
          </article>
          <article className="operations-summary-card">
            <span>Approval flows</span>
            <strong>{formatCount(flowDiagnostics?.total ?? 0)}</strong>
            <small>{formatCount(flowDiagnostics?.published ?? 0)} published templates.</small>
          </article>
          <article className="operations-summary-card">
            <span>Reporting window</span>
            <strong>Last 30 days</strong>
            <small>
              {formatCount(overview?.pendingApprovals ?? 0)} pending approvals in overview.
            </small>
          </article>
        </section>

        <section className="operations-grid">
          <section className="panel command-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Access snapshot</p>
                <h2 className="panel-title">Capability coverage</h2>
                <p className="panel-subtitle">
                  A module is only useful here if the backend has actually granted the corresponding
                  admin capability.
                </p>
              </div>
            </div>

            <div className="diagnostic-capability-grid">
              {capabilitySummary.map((entry) => (
                <article key={entry.key} className="record-mini-card">
                  <span>{entry.label}</span>
                  <strong>{entry.enabled ? "Enabled" : "Not assigned"}</strong>
                  <small className="record-copy">{entry.note}</small>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel insight-panel operations-insight-panel">
            <p className="eyebrow">Tenant context</p>
            <h2 className="insight-title">Current operator footing</h2>
            <ul className="insight-list">
              <li>User ID: {session.userId}</li>
              <li>Tenant ID: {session.tenantId}</li>
              <li>Membership count: {formatCount(memberships.length)}</li>
              <li>
                Current tenant role: {currentMembership?.role ?? "Unknown"} /{" "}
                {currentMembership?.tenantStatus ?? "Status unavailable"}
              </li>
            </ul>
          </aside>
        </section>

        <section className="operations-grid">
          <section className="panel command-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Subscriptions</p>
                <h2 className="panel-title">Tenant lifecycle snapshot</h2>
                <p className="panel-subtitle">
                  Fast read of active subscription state before making any pricing or lifecycle
                  change.
                </p>
              </div>
            </div>

            {subscriptionDiagnostics && planData && subscriptionData ? (
              <>
                <div className="diagnostic-capability-grid">
                  <article className="record-mini-card">
                    <span>Active plan</span>
                    <strong>{subscriptionDiagnostics.activePlanLabel}</strong>
                    <small className="record-copy">
                      {subscriptionDiagnostics.activeStartedAt
                        ? `Started ${formatSubscriptionDate(subscriptionDiagnostics.activeStartedAt)}`
                        : "No active subscription is bound to this tenant."}
                    </small>
                  </article>
                  <article className="record-mini-card">
                    <span>Seat count</span>
                    <strong>
                      {subscriptionDiagnostics.activeSeatCount === null
                        ? "Unassigned"
                        : formatCount(subscriptionDiagnostics.activeSeatCount)}
                    </strong>
                    <small className="record-copy">Provisioned seats on the active record.</small>
                  </article>
                  <article className="record-mini-card">
                    <span>Subscription records</span>
                    <strong>{formatCount(subscriptionDiagnostics.totalRecords)}</strong>
                    <small className="record-copy">
                      {formatCount(subscriptionDiagnostics.cancelledCount)} cancelled records are still visible.
                    </small>
                  </article>
                </div>

                <div className="workspace-list">
                  {subscriptionData.list.slice(0, 3).map((subscription) => {
                    const plan =
                      planData.list.find((entry) => entry.id === subscription.planId) ?? null;

                    return (
                      <div key={subscription.id} className="workspace-list-row">
                        <div className="workspace-list-main">
                          <strong>{plan?.name ?? subscription.planId}</strong>
                          <span>
                            {plan
                              ? `${formatPriceFromCents(plan.priceCents, plan.currency)} · ${formatPlanInterval(plan.interval)}`
                              : subscription.planId}
                          </span>
                        </div>
                        <span className="workspace-badge">
                          {formatSubscriptionStatus(subscription.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state">
                Subscription diagnostics are unavailable because this operator does not own the
                subscription capability.
              </div>
            )}
          </section>

          <section className="panel command-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Approval footprint</p>
                <h2 className="panel-title">Flow library status</h2>
                <p className="panel-subtitle">
                  Published vs draft coverage for the active tenant&apos;s approval catalog.
                </p>
              </div>
            </div>

            {flowDiagnostics && flowData ? (
              <>
                <div className="diagnostic-capability-grid">
                  <article className="record-mini-card">
                    <span>Published</span>
                    <strong>{formatCount(flowDiagnostics.published)}</strong>
                    <small className="record-copy">
                      Templates currently serving runtime bindings.
                    </small>
                  </article>
                  <article className="record-mini-card">
                    <span>Draft</span>
                    <strong>{formatCount(flowDiagnostics.draft)}</strong>
                    <small className="record-copy">
                      Templates still waiting for validation or publish.
                    </small>
                  </article>
                  <article className="record-mini-card">
                    <span>Archived</span>
                    <strong>{formatCount(flowDiagnostics.archived)}</strong>
                    <small className="record-copy">
                      Templates retired from new runtime use.
                    </small>
                  </article>
                </div>

                <div className="workspace-list">
                  {flowData.list.slice(0, 4).map((template) => (
                    <div key={template.id} className="workspace-list-row">
                      <div className="workspace-list-main">
                        <strong>{template.name}</strong>
                        <span>
                          {formatApprovalFlowTargetType(template.targetType)} · {template.code}
                        </span>
                      </div>
                      <span className="workspace-badge">
                        {formatApprovalFlowTemplateStatus(template.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                Approval-flow diagnostics are unavailable because this operator does not own the
                approval-flow capability.
              </div>
            )}
          </section>
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Reporting pressure</p>
              <h2 className="panel-title">Last 30 days snapshot</h2>
              <p className="panel-subtitle">
                Reporting stays tenant-scoped here and gives the quickest pressure read before you
                drill into the full workspace.
              </p>
            </div>
          </div>

          {overview && approvalAnalytics ? (
            <div className="diagnostic-capability-grid">
              <article className="record-mini-card">
                <span>Total employees</span>
                <strong>{formatCount(overview.totalEmployees)}</strong>
                <small className="record-copy">
                  {formatCount(overview.activeEmployees)} active employees.
                </small>
              </article>
              <article className="record-mini-card">
                <span>Pending approvals</span>
                <strong>{formatCount(approvalAnalytics.pendingRequests)}</strong>
                <small className="record-copy">
                  {formatCount(approvalAnalytics.activeAssignments)} active assignments.
                </small>
              </article>
              <article className="record-mini-card">
                <span>Resolved funnel</span>
                <strong>{approvalAnalytics.approvalFunnelRate.toFixed(1)}%</strong>
                <small className="record-copy">
                  {formatCount(approvalAnalytics.approvedRequests)} approved /{" "}
                  {formatCount(approvalAnalytics.rejectedRequests)} rejected.
                </small>
              </article>
              <article className="record-mini-card">
                <span>Departments</span>
                <strong>{formatCount(overview.totalDepartments)}</strong>
                <small className="record-copy">
                  {formatCount(overview.activeDepartments)} active departments.
                </small>
              </article>
            </div>
          ) : (
            <div className="empty-state">
              Reporting diagnostics are unavailable because this operator does not own the reporting
              capability.
            </div>
          )}
        </section>
      </section>
    </AdminShell>
  );
}
