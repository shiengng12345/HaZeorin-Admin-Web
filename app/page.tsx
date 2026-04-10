import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { isAllowedAdminCapability } from "@/lib/env";
import { listApprovalFlows } from "@/lib/grpc/approvalflow-client";
import {
  frontendGetApprovalAnalytics,
  frontendGetOverview
} from "@/lib/grpc/reporting-client";
import { listPlans } from "@/lib/grpc/subscription-client";
import { listSubscriptions } from "@/lib/grpc/tenant-client";
import {
  buildApprovalFlowDiagnostics,
  buildReportingDiagnostics,
  buildSubscriptionDiagnostics
} from "@/lib/diagnostics";
import { executeProtectedPageCall, readSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const session = await readSession();
  const canManageApprovalFlows = isAllowedAdminCapability(
    session?.userId ?? "",
    "manageApprovalFlows"
  );
  const canViewReporting = isAllowedAdminCapability(session?.userId ?? "", "viewPlatformReporting");
  const canManageSubscriptions = isAllowedAdminCapability(
    session?.userId ?? "",
    "manageSubscriptions"
  );

  let flowSummary:
    | ReturnType<typeof buildApprovalFlowDiagnostics>
    | null = null;
  let reportingSummary:
    | ReturnType<typeof buildReportingDiagnostics>
    | null = null;
  let subscriptionSummary:
    | ReturnType<typeof buildSubscriptionDiagnostics>
    | null = null;

  if (canManageApprovalFlows || canViewReporting || canManageSubscriptions) {
    const controlHubData = await executeProtectedPageCall("/", async (authSession) => {
      const [
        approvalFlowPage,
        reportingOverview,
        reportingAnalytics,
        activeSubscriptionPage,
        cancelledSubscriptionPage,
        plansPage
      ] = await Promise.all([
        canManageApprovalFlows
          ? listApprovalFlows(authSession, {
              page: 1,
              limit: 100,
              includeArchived: true
            })
          : Promise.resolve(null),
        canViewReporting
          ? frontendGetOverview(authSession, {
              window: "REPORTING_WINDOW_LAST_30_DAYS"
            })
          : Promise.resolve(null),
        canViewReporting
          ? frontendGetApprovalAnalytics(authSession, {
              window: "REPORTING_WINDOW_LAST_30_DAYS"
            })
          : Promise.resolve(null),
        canManageSubscriptions
          ? listSubscriptions(authSession, {
              page: 1,
              limit: 20,
              sortBy: "ts.started_at",
              sortType: "SORT_TYPE_DESC",
              status: "SUBSCRIPTION_STATUS_ACTIVE"
            })
          : Promise.resolve(null),
        canManageSubscriptions
          ? listSubscriptions(authSession, {
              page: 1,
              limit: 1,
              sortBy: "ts.started_at",
              sortType: "SORT_TYPE_DESC",
              status: "SUBSCRIPTION_STATUS_CANCELLED"
            })
          : Promise.resolve(null),
        canManageSubscriptions
          ? listPlans(authSession, {
              page: 1,
              limit: 100,
              sortBy: "price_cents",
              sortType: "SORT_TYPE_ASC"
            })
          : Promise.resolve(null)
      ]);

      return {
        approvalFlowPage,
        reportingOverview,
        reportingAnalytics,
        activeSubscriptionPage,
        cancelledSubscriptionPage,
        plansPage
      };
    });

    if (controlHubData.approvalFlowPage) {
      flowSummary = buildApprovalFlowDiagnostics(
        controlHubData.approvalFlowPage.list,
        controlHubData.approvalFlowPage.pagination.total
      );
    }

    if (controlHubData.reportingOverview && controlHubData.reportingAnalytics) {
      reportingSummary = buildReportingDiagnostics(
        controlHubData.reportingOverview,
        controlHubData.reportingAnalytics
      );
    }

    if (
      controlHubData.activeSubscriptionPage &&
      controlHubData.cancelledSubscriptionPage &&
      controlHubData.plansPage
    ) {
      subscriptionSummary = buildSubscriptionDiagnostics(
        [
          ...controlHubData.activeSubscriptionPage.list,
          ...controlHubData.cancelledSubscriptionPage.list
        ],
        controlHubData.plansPage.list
      );
    }
  }

  return (
    <AdminShell
      nextPath="/"
      activeView="home"
      moduleTitle="Control hub"
      moduleDescription={
        <>
          Start from a neutral admin home, then move into reporting or subscription modules based
          on the backend capabilities assigned to your operator account.
        </>
      }
    >
      <section className="content-stack">
        {params.message ? <div className="success-banner">{params.message}</div> : null}
        {params.error ? <div className="status-banner">{params.error}</div> : null}

        <section className="module-hero">
          <div className="module-hero-main">
            <div className="module-hero-pills">
              <span className="section-pill">Admin portal</span>
              <span className="section-pill section-pill-muted">Home</span>
            </div>

            <h2 className="module-hero-title">Platform control hub</h2>
            <p className="module-hero-copy">
              Start from a neutral landing page, then review the current tenant pressure before
              moving into the module your operator account actually owns.
            </p>

            <div className="module-hero-actions">
              <Link href="/diagnostics" className="button-secondary">
                Open diagnostics
              </Link>
              {canManageApprovalFlows ? (
                <Link href="/approval-flows" className="button-primary">
                  Open approval flows
                </Link>
              ) : null}
              {canViewReporting ? (
                <Link href="/reporting" className="button-primary">
                  Open reporting
                </Link>
              ) : null}
              {canManageSubscriptions ? (
                <Link href="/subscriptions" className="button-secondary">
                  Open operations
                </Link>
              ) : null}
            </div>
          </div>

          <div className="module-hero-kpis">
            {reportingSummary ? (
              <>
                <article className="metric-card">
                  <span>Active employees</span>
                  <strong>{formatCount(reportingSummary.activeEmployees)}</strong>
                  <small>
                    {formatCount(reportingSummary.totalEmployees)} total in the last 30-day
                    snapshot.
                  </small>
                </article>
                <article className="metric-card">
                  <span>Pending approvals</span>
                  <strong>{formatCount(reportingSummary.pendingApprovals)}</strong>
                  <small>
                    {formatCount(reportingSummary.pendingRequests)} unresolved approval requests in
                    the same window.
                  </small>
                </article>
                <article className="metric-card">
                  <span>Approval funnel</span>
                  <strong>{formatPercent(reportingSummary.approvalFunnelRate)}</strong>
                  <small>Resolved approvals only, aligned with reporting.v1.</small>
                </article>
              </>
            ) : null}

            {subscriptionSummary ? (
              <>
                <article className="metric-card">
                  <span>Active subscriptions</span>
                  <strong>{formatCount(subscriptionSummary.activeCount)}</strong>
                  <small>
                    {formatCount(subscriptionSummary.cancelledCount)} cancelled for the
                    active tenant.
                  </small>
                </article>
                <article className="metric-card">
                  <span>Current plan</span>
                  <strong>{subscriptionSummary.activePlanLabel}</strong>
                  <small>{subscriptionSummary.latestLifecycleNote}</small>
                </article>
              </>
            ) : null}

            {flowSummary ? (
              <article className="metric-card">
                <span>Approval flow library</span>
                <strong>{formatCount(flowSummary.total)}</strong>
                <small>
                  {formatCount(flowSummary.published)} published /{" "}
                  {formatCount(flowSummary.draft)} draft in the current diagnostics slice.
                </small>
              </article>
            ) : null}
          </div>
        </section>

        <section className="operations-summary-strip">
          {reportingSummary ? (
            <article className="operations-summary-card">
              <span>30-day snapshot</span>
              <strong>{reportingSummary.hottestQueueLabel}</strong>
              <small>
                {formatCount(reportingSummary.hottestQueuePending)} pending items in the most
                pressured queue.
              </small>
            </article>
          ) : null}
          {reportingSummary ? (
            <article className="operations-summary-card">
              <span>Queue mix</span>
              <strong>
                {formatCount(reportingSummary.pendingLeaveRequests)} leave /{" "}
                {formatCount(reportingSummary.pendingClaimRequests)} claims
              </strong>
              <small>Leave and claim queues are now surfaced separately.</small>
            </article>
          ) : null}
          {reportingSummary ? (
            <article className="operations-summary-card">
              <span>Busiest manager</span>
              <strong>{reportingSummary.busiestManagerName}</strong>
              <small>
                {formatCount(reportingSummary.busiestManagerPendingApprovals)} pending approvals.
              </small>
            </article>
          ) : null}
          {subscriptionSummary ? (
            <article className="operations-summary-card">
              <span>Plan catalog</span>
              <strong>{formatCount(subscriptionSummary.activePlanCount)} active plans</strong>
              <small>{formatCount(subscriptionSummary.inactivePlanCount)} inactive plans remain in the catalog.</small>
            </article>
          ) : null}
          {flowSummary ? (
            <article className="operations-summary-card">
              <span>Flow readiness</span>
              <strong>{formatCount(flowSummary.archived)} archived</strong>
              <small>
                {flowSummary.sampleMayBePartial
                  ? `Status breakdown sampled from the first ${formatCount(
                      flowSummary.sampledCount
                    )} templates.`
                  : "Status breakdown covers the full current tenant library."}
              </small>
            </article>
          ) : null}
        </section>

        <section className="operations-grid">
          {reportingSummary ? (
            <section className="panel command-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Tenant diagnostics</p>
                  <h2 className="panel-title">Current tenant diagnostics</h2>
                  <p className="panel-subtitle">
                    This home view now carries the most important reporting pressure signals before
                    you dive into the full reporting workspace.
                  </p>
                </div>
              </div>

              <div className="workspace-list">
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Workforce posture</strong>
                    <span>
                      {formatCount(reportingSummary.activeEmployees)} active employees out of{" "}
                      {formatCount(reportingSummary.totalEmployees)} in the current tenant.
                    </span>
                  </div>
                  <span className="workspace-badge">Last 30 days</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Most pressured queue</strong>
                    <span>
                      {reportingSummary.hottestQueueLabel} currently holds{" "}
                      {formatCount(reportingSummary.hottestQueuePending)} pending items.
                    </span>
                  </div>
                  <span className="workspace-badge">Queue focus</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Leave queue</strong>
                    <span>
                      {formatCount(reportingSummary.pendingLeaveRequests)} leave requests are still
                      pending in the current snapshot.
                    </span>
                  </div>
                  <span className="workspace-badge">Leave</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Claim queue</strong>
                    <span>
                      {formatCount(reportingSummary.pendingClaimRequests)} claim requests are still
                      pending in the current snapshot.
                    </span>
                  </div>
                  <span className="workspace-badge">Claim</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Most exposed approval target</strong>
                    <span>
                      {reportingSummary.hottestTargetLabel} drives{" "}
                      {formatCount(reportingSummary.hottestTargetPending)} pending requests.
                    </span>
                  </div>
                  <span className="workspace-badge">Target mix</span>
                </div>
              </div>
            </section>
          ) : null}

          {subscriptionSummary ? (
            <section className="panel command-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Subscription posture</p>
                  <h2 className="panel-title">Current subscription posture</h2>
                  <p className="panel-subtitle">
                    See the current contract footprint for the active tenant before moving into full
                    subscription operations.
                  </p>
                </div>
              </div>

              <div className="workspace-list">
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Latest contract posture</strong>
                    <span>
                      {subscriptionSummary.hasActiveSubscription
                        ? `${subscriptionSummary.activePlanLabel} with ${formatCount(
                            subscriptionSummary.activeSeatCount ?? 0
                          )} seats is currently active.`
                        : `${subscriptionSummary.activePlanLabel} is the latest historical contract for this tenant.`}
                    </span>
                  </div>
                  <span className="workspace-badge">{subscriptionSummary.latestStatusLabel}</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Tenant subscription footprint</strong>
                    <span>
                      {formatCount(subscriptionSummary.totalRecords)} total contracts, with{" "}
                      {formatCount(subscriptionSummary.cancelledCount)} historical
                      cancellations.
                    </span>
                  </div>
                  <span className="workspace-badge">Lifecycle</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Plan catalog coverage</strong>
                    <span>
                      {formatCount(subscriptionSummary.activePlanCount)} active plans are ready for
                      launches and migrations.
                    </span>
                  </div>
                  <span className="workspace-badge">Catalog</span>
                </div>
              </div>
            </section>
          ) : null}

          {flowSummary ? (
            <section className="panel command-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Approval flow readiness</p>
                  <h2 className="panel-title">Template library posture</h2>
                  <p className="panel-subtitle">
                    Surface the runtime template posture on the control hub, so operators can see
                    whether the tenant is mostly draft, published, or archive-heavy before opening
                    the builder.
                  </p>
                </div>
              </div>

              <div className="workspace-list">
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Published templates</strong>
                    <span>
                      {formatCount(flowSummary.published)} published templates appear in
                      the current diagnostics slice.
                    </span>
                  </div>
                  <span className="workspace-badge">Published</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Draft backlog</strong>
                    <span>
                      {formatCount(flowSummary.draft)} drafts still need validation or
                      publication.
                    </span>
                  </div>
                  <span className="workspace-badge">Drafts</span>
                </div>
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Archived templates</strong>
                    <span>
                      {formatCount(flowSummary.archived)} archived rows stay visible for
                      operator cleanup and historical review.
                    </span>
                  </div>
                  <span className="workspace-badge">Archive</span>
                </div>
              </div>
            </section>
          ) : null}
        </section>

        <section className="operations-grid">
          <section className="panel command-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Modules</p>
                <h2 className="panel-title">Choose a live workspace</h2>
                <p className="panel-subtitle">
                  Start from the module that matches the backend capability your admin account was
                  granted.
                </p>
              </div>
            </div>

            <div className="workspace-list">
              <div className="workspace-list-row">
                <div className="workspace-list-main">
                  <strong>Tenant diagnostics</strong>
                  <span>Read capability, subscription, approval-flow, and reporting state together.</span>
                </div>
                <Link href="/diagnostics" className="button-secondary">
                  Open
                </Link>
              </div>
              {canManageApprovalFlows ? (
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Approval flow builder</strong>
                    <span>Maintain templates, validate drafts, simulate runtime routing, and bind them to runtime targets.</span>
                  </div>
                  <Link href="/approval-flows" className="button-secondary">
                    Open
                  </Link>
                </div>
              ) : null}
              {canViewReporting ? (
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Platform reporting</strong>
                    <span>Current tenant snapshot, queue trend, and approval analytics.</span>
                  </div>
                  <Link href="/reporting" className="button-secondary">
                    Open
                  </Link>
                </div>
              ) : null}
              {canManageSubscriptions ? (
                <>
                  <div className="workspace-list-row">
                    <div className="workspace-list-main">
                      <strong>Subscription operations</strong>
                      <span>Launch, migrate, and cancel tenant subscriptions.</span>
                    </div>
                    <Link href="/subscriptions" className="button-secondary">
                      Open
                    </Link>
                  </div>
                  <div className="workspace-list-row">
                    <div className="workspace-list-main">
                      <strong>Plan catalog</strong>
                      <span>Maintain the reusable pricing and interval library.</span>
                    </div>
                    <Link href="/plans" className="button-secondary">
                      Open
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <aside className="panel insight-panel operations-insight-panel">
            <p className="eyebrow">Current rollout</p>
            <h2 className="insight-title">What changed</h2>
            <ul className="insight-list">
              <li>Capability-specific modules now appear only for operators who can use them.</li>
              <li>The control hub now surfaces live tenant diagnostics before the module jump.</li>
              <li>Subscription, reporting, and approval-flow pressure can be reviewed from one home page.</li>
              <li>Backend reporting capability can still unlock the reporting slice without a tenant workspace role.</li>
            </ul>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
