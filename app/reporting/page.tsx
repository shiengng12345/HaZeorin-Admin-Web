import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  frontendGetApprovalAnalytics,
  frontendGetOverview,
  frontendGetQueueTrend,
  frontendListSavedPresets
} from "@/lib/grpc/reporting-client";
import { GrpcBusinessError, GrpcTransportError } from "@/lib/grpc/errors";
import {
  buildReportingPath,
  DEFAULT_REPORTING_STATE,
  formatReportingWindow,
  parseReportingState
} from "@/lib/reporting";
import { executeProtectedPageCall } from "@/lib/session";
import { ReportingSavedViews } from "./ReportingSavedViews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

export default async function ReportingPage({ searchParams }: ReportingPageProps) {
  const params = (await searchParams) ?? {};
  const query = parseReportingState(params);
  const nextPath = buildReportingPath(query);
  const message = typeof params.message === "string" ? params.message : "";
  const routeError = typeof params.error === "string" ? params.error : "";

  let reportingError = "";
  let overview:
    | Awaited<ReturnType<typeof frontendGetOverview>>
    | null = null;
  let queueTrend:
    | Awaited<ReturnType<typeof frontendGetQueueTrend>>
    | null = null;
  let approvalAnalytics:
    | Awaited<ReturnType<typeof frontendGetApprovalAnalytics>>
    | null = null;
  let savedPresets:
    | Awaited<ReturnType<typeof frontendListSavedPresets>>
    | null = null;

  try {
    [overview, queueTrend, approvalAnalytics, savedPresets] = await executeProtectedPageCall(
      nextPath,
      (session) =>
        Promise.all([
          frontendGetOverview(session, { window: query.window }),
          frontendGetQueueTrend(session, { window: query.window }),
          frontendGetApprovalAnalytics(session, { window: query.window }),
          frontendListSavedPresets(session)
        ])
    );
  } catch (error) {
    if (error instanceof GrpcBusinessError || error instanceof GrpcTransportError) {
      reportingError = error.message;
    } else {
      throw error;
    }
  }

  const currentScopeSummary = `${formatReportingWindow(query.window)} tenant snapshot`;

  return (
    <AdminShell
      nextPath={nextPath}
      activeView="reporting"
      moduleTitle="Platform reporting"
      moduleDescription={
        <>
          Admin-facing tenant snapshot powered by <code>reporting.v1</code>, with backend access
          now able to honor platform reporting capability in addition to tenant workspace role.
        </>
      }
    >
      <section className="content-stack">
        {message ? <div className="success-banner">{message}</div> : null}
        {routeError ? <div className="status-banner">{routeError}</div> : null}
        {reportingError ? <div className="status-banner">{reportingError}</div> : null}

        <section className="module-hero">
          <div className="module-hero-main">
            <div className="module-hero-pills">
              <span className="section-pill">Reporting module</span>
              <span className="section-pill section-pill-muted">Operational snapshot</span>
            </div>

            <h2 className="module-hero-title">Tenant reporting workspace</h2>
            <p className="module-hero-copy">
              Review the active tenant&apos;s workforce, queue volume, and approval efficiency from
              one admin view. The sidebar tenant switcher controls the reporting scope.
            </p>

            <form method="get" className="module-hero-actions">
              <label htmlFor="window" className="field">
                <span>Window</span>
                <select id="window" name="window" defaultValue={query.window}>
                  <option value="REPORTING_WINDOW_ALL_TIME">All time</option>
                  <option value="REPORTING_WINDOW_LAST_7_DAYS">Last 7 days</option>
                  <option value="REPORTING_WINDOW_LAST_30_DAYS">Last 30 days</option>
                  <option value="REPORTING_WINDOW_LAST_90_DAYS">Last 90 days</option>
                </select>
              </label>
              <button type="submit" className="button-secondary">
                Apply window
              </button>
              <Link href={buildReportingPath(DEFAULT_REPORTING_STATE)} className="button-ghost">
                Reset
              </Link>
            </form>
          </div>

          <div className="module-hero-kpis">
            <article className="metric-card">
              <span>Total employees</span>
              <strong>{formatCount(overview?.totalEmployees ?? 0)}</strong>
              <small>{formatCount(overview?.activeEmployees ?? 0)} active in snapshot.</small>
            </article>
            <article className="metric-card">
              <span>Pending approvals</span>
              <strong>{formatCount(overview?.pendingApprovals ?? 0)}</strong>
              <small>{formatCount(approvalAnalytics?.pendingRequests ?? 0)} active requests.</small>
            </article>
            <article className="metric-card">
              <span>Queue volume</span>
              <strong>{formatCount(approvalAnalytics?.totalRequests ?? 0)}</strong>
              <small>{formatReportingWindow(query.window)} approval window.</small>
            </article>
            <article className="metric-card">
              <span>Average resolution</span>
              <strong>{formatHours(approvalAnalytics?.averageResolutionHours ?? 0)}</strong>
              <small>{formatHours(approvalAnalytics?.averageStepActionHours ?? 0)} per step action.</small>
            </article>
          </div>
        </section>

        <ReportingSavedViews
          currentState={query}
          scopeSummary={currentScopeSummary}
          returnTo={buildReportingPath(query)}
          savedPresets={savedPresets ?? []}
        />

        {overview && approvalAnalytics ? (
          <>
            <section className="operations-summary-strip">
              <article className="operations-summary-card">
                <span>Current window</span>
                <strong>{formatReportingWindow(query.window)}</strong>
                <small>Queue and approval analytics follow this selection together.</small>
              </article>
              <article className="operations-summary-card">
                <span>Departments</span>
                <strong>{formatCount(overview.totalDepartments)}</strong>
                <small>{formatCount(overview.activeDepartments)} active departments.</small>
              </article>
              <article className="operations-summary-card">
                <span>Leave queue</span>
                <strong>{formatCount(overview.pendingLeaveRequests)}</strong>
                <small>{formatCount(overview.approvedLeaveRequests)} approved in snapshot.</small>
              </article>
              <article className="operations-summary-card">
                <span>Claim queue</span>
                <strong>{formatCount(overview.pendingClaimRequests)}</strong>
                <small>{formatCount(overview.rejectedClaimRequests)} rejected in snapshot.</small>
              </article>
            </section>

            <section className="operations-grid">
              <section className="panel command-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Workforce</p>
                    <h2 className="panel-title">Employee mix</h2>
                    <p className="panel-subtitle">
                      The workforce snapshot is tenant-scoped and reflects the current employee
                      shape for the active tenant.
                    </p>
                  </div>
                </div>

                {overview.workforce.length > 0 ? (
                  <div className="workspace-list">
                    {overview.workforce.map((bucket) => (
                      <div key={bucket.key} className="workspace-list-row">
                        <div className="workspace-list-main">
                          <strong>{bucket.label}</strong>
                          <span>{bucket.note}</span>
                        </div>
                        <span className="workspace-badge">
                          {formatCount(bucket.count)} · {formatPercent(bucket.shareRatio)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No workforce buckets came back for this tenant yet.</div>
                )}
              </section>

              <aside className="panel insight-panel operations-insight-panel">
                <p className="eyebrow">Approval efficiency</p>
                <h2 className="insight-title">Current pressure signals</h2>
                <ul className="insight-list">
                  <li>{formatCount(approvalAnalytics.pendingRequests)} requests are still pending inside the selected window.</li>
                  <li>{formatCount(approvalAnalytics.activeAssignments)} assignments remain active across execution modes.</li>
                  <li>{formatCount(approvalAnalytics.reassignedAssignments)} assignments were reassigned in the current analytics rollup.</li>
                </ul>
              </aside>
            </section>

            <section className="panel catalog-panel">
              <div className="panel-head catalog-head">
                <div>
                  <p className="eyebrow">Queue summary</p>
                  <h2 className="panel-title">Request buckets</h2>
                  <p className="panel-subtitle">
                    Leave, claims, and approval runtime stay visible together for the active tenant.
                  </p>
                </div>
              </div>

              {overview.queues.length > 0 ? (
                <div className="table-card catalog-table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Queue</th>
                          <th>Pending</th>
                          <th>Approved</th>
                          <th>Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.queues.map((queue) => (
                          <tr key={queue.key}>
                            <td>
                              <strong>{queue.label}</strong>
                              <span className="cell-meta">{queue.key}</span>
                            </td>
                            <td>{formatCount(queue.pending)}</td>
                            <td>{formatCount(queue.approved)}</td>
                            <td>{formatCount(queue.rejected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No queue summary rows came back from reporting yet.</div>
              )}
            </section>

            <section className="panel catalog-panel">
              <div className="panel-head catalog-head">
                <div>
                  <p className="eyebrow">Trend</p>
                  <h2 className="panel-title">Queue trend buckets</h2>
                  <p className="panel-subtitle">
                    Intake activity for leave, claims, and approval requests over{" "}
                    {formatReportingWindow(query.window).toLowerCase()}.
                  </p>
                </div>
              </div>

              {queueTrend && queueTrend.length > 0 ? (
                <div className="table-card catalog-table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Bucket</th>
                          <th>Leave</th>
                          <th>Claims</th>
                          <th>Approvals</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueTrend.map((bucket) => (
                          <tr key={bucket.key}>
                            <td>
                              <strong>{bucket.label}</strong>
                              <span className="cell-meta">{bucket.key}</span>
                            </td>
                            <td>{formatCount(bucket.leaveRequests)}</td>
                            <td>{formatCount(bucket.claimRequests)}</td>
                            <td>{formatCount(bucket.approvalRequests)}</td>
                            <td>{formatCount(bucket.totalRequests)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No queue trend buckets matched the selected window.</div>
              )}
            </section>

            <section className="operations-grid">
              <section className="panel command-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Departments</p>
                    <h2 className="panel-title">Coverage snapshot</h2>
                    <p className="panel-subtitle">
                      Employee distribution across currently reported departments.
                    </p>
                  </div>
                </div>

                {overview.departments.length > 0 ? (
                  <div className="workspace-list">
                    {overview.departments.map((department) => (
                      <div key={department.departmentId} className="workspace-list-row">
                        <div className="workspace-list-main">
                          <strong>{department.name}</strong>
                          <span>
                            Code {department.code} · {department.departmentId}
                          </span>
                        </div>
                        <span className="workspace-badge">
                          {formatCount(department.employeeCount)} ·{" "}
                          {formatPercent(department.coverageRatio)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No department rows came back from reporting yet.</div>
                )}
              </section>

              <section className="panel command-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Managers</p>
                    <h2 className="panel-title">Pending approval load</h2>
                    <p className="panel-subtitle">
                      Manager queue share shows where current approval pressure sits.
                    </p>
                  </div>
                </div>

                {overview.managers.length > 0 ? (
                  <div className="workspace-list">
                    {overview.managers.map((manager) => (
                      <div key={manager.managerId} className="workspace-list-row">
                        <div className="workspace-list-main">
                          <strong>{manager.managerName}</strong>
                          <span>{manager.managerId}</span>
                        </div>
                        <span className="workspace-badge workspace-badge-accent">
                          {formatCount(manager.pendingApprovals)} · {formatPercent(manager.queueShare)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No manager queue rows came back from reporting yet.</div>
                )}
              </section>
            </section>

            <section className="panel catalog-panel">
              <div className="panel-head catalog-head">
                <div>
                  <p className="eyebrow">Approval analytics</p>
                  <h2 className="panel-title">Target mix</h2>
                  <p className="panel-subtitle">
                    Request mix and pending shape for the selected tenant window.
                  </p>
                </div>
              </div>

              {approvalAnalytics.targets.length > 0 ? (
                <div className="table-card catalog-table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Target</th>
                          <th>Total</th>
                          <th>Pending</th>
                          <th>Approved</th>
                          <th>Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvalAnalytics.targets.map((target) => (
                          <tr key={target.key}>
                            <td>
                              <strong>{target.label}</strong>
                              <span className="cell-meta">{target.key}</span>
                            </td>
                            <td>{formatCount(target.totalRequests)}</td>
                            <td>{formatCount(target.pendingRequests)}</td>
                            <td>{formatCount(target.approvedRequests)}</td>
                            <td>{formatCount(target.rejectedRequests)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No approval analytics matched this reporting window.</div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
