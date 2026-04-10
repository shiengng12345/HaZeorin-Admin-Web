import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  buildApprovalFlowsPath,
  DEFAULT_APPROVAL_FLOW_LIST_STATE,
  formatApprovalFlowTargetType,
  formatApprovalFlowTemplateStatus,
  parseApprovalFlowListState
} from "@/lib/approval-flows";
import { listApprovalFlows } from "@/lib/grpc/approvalflow-client";
import { executeProtectedPageCall } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApprovalFlowsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusClass(status: string) {
  if (status === "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED") {
    return "status-chip is-active";
  }

  if (status === "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED") {
    return "status-chip is-suspended";
  }

  return "status-chip is-draft";
}

export default async function ApprovalFlowsPage({
  searchParams
}: ApprovalFlowsPageProps) {
  const params = (await searchParams) ?? {};
  const query = parseApprovalFlowListState(params);
  const nextPath = buildApprovalFlowsPath(query);
  const data = await executeProtectedPageCall(nextPath, (session) =>
    listApprovalFlows(session, {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      targetType: query.targetType || undefined,
      includeArchived: query.includeArchived
    })
  );

  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const previousPath =
    query.page > 1 ? buildApprovalFlowsPath({ ...query, page: query.page - 1 }) : null;
  const nextPageExists =
    data.pagination.totalPage > 0 && query.page < data.pagination.totalPage;
  const nextPagePath = nextPageExists
    ? buildApprovalFlowsPath({ ...query, page: query.page + 1 })
    : null;
  const publishedOnPage = data.list.filter(
    (template) => template.status === "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED"
  ).length;
  const archivedOnPage = data.list.filter(
    (template) => template.status === "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED"
  ).length;

  return (
    <AdminShell
      nextPath={nextPath}
      activeView="approval-flows"
      moduleTitle="Approval flows"
      moduleDescription={
        <>
          Approval-flow configuration runs over the shared <code>approvalflow.v1</code> contract,
          including draft updates, validation, publish, and binding management.
        </>
      }
    >
      <section className="content-stack">
        <section className="module-hero">
          <div className="module-hero-main">
            <div className="module-hero-pills">
              <span className="section-pill">Approval flow module</span>
              <span className="section-pill section-pill-muted">Template library</span>
            </div>

            <h2 className="module-hero-title">Approval flow library</h2>
            <p className="module-hero-copy">
              Search templates, review lifecycle state, and move into draft editing or binding
              management from one operator surface.
            </p>

            <div className="module-hero-actions">
              <Link href="/approval-flows/new" className="button-primary">
                Create flow
              </Link>
              <span className="module-note">
                Query: {query.search ? `"${query.search}"` : "All flows"}
              </span>
            </div>
          </div>

          <div className="module-hero-kpis">
            <article className="metric-card">
              <span>Total flows</span>
              <strong>{data.pagination.total}</strong>
              <small>All templates matching the current query.</small>
            </article>
            <article className="metric-card">
              <span>Published on page</span>
              <strong>{publishedOnPage}</strong>
              <small>{data.list.length} rows visible on this page.</small>
            </article>
            <article className="metric-card">
              <span>Archived on page</span>
              <strong>{archivedOnPage}</strong>
              <small>{query.includeArchived ? "Archive rows included." : "Archive rows hidden."}</small>
            </article>
            <article className="metric-card">
              <span>Target filter</span>
              <strong>
                {query.targetType
                  ? formatApprovalFlowTargetType(query.targetType)
                  : "All targets"}
              </strong>
              <small>
                Page {data.pagination.page} of {Math.max(data.pagination.totalPage, 1)}
              </small>
            </article>
          </div>
        </section>

        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="status-banner">{error}</div> : null}

        <section className="panel command-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Query controls</p>
              <h2 className="panel-title">Search and filter</h2>
              <p className="panel-subtitle">
                Keep the flow library tight by target type, free-text search, and archive
                visibility.
              </p>
            </div>
          </div>

          <form method="get" className="filter-grid command-grid">
            <div className="field">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                name="search"
                type="text"
                defaultValue={query.search}
                placeholder="code, name, description"
              />
            </div>

            <div className="field">
              <label htmlFor="targetType">Target type</label>
              <select id="targetType" name="targetType" defaultValue={query.targetType}>
                <option value="">All targets</option>
                <option value="APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST">Leave request</option>
                <option value="APPROVAL_FLOW_TARGET_TYPE_CLAIM">Claim</option>
                <option value="APPROVAL_FLOW_TARGET_TYPE_OVERTIME">Overtime</option>
                <option value="APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE">Employee change</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="limit">Rows per page</label>
              <select id="limit" name="limit" defaultValue={String(query.limit)}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            <label className="checkbox-field checkbox-field-inline">
              <input
                type="checkbox"
                name="includeArchived"
                defaultChecked={query.includeArchived}
                value="true"
              />
              <span>Include archived templates in the result set.</span>
            </label>

            <div className="button-row">
              <button type="submit" className="button-secondary">
                Apply query
              </button>
              <Link
                href={buildApprovalFlowsPath(DEFAULT_APPROVAL_FLOW_LIST_STATE)}
                className="button-ghost"
              >
                Reset to default
              </Link>
            </div>
          </form>

          <div className="query-strip">
            <span className="query-chip">
              Target: {query.targetType ? formatApprovalFlowTargetType(query.targetType) : "All"}
            </span>
            <span className="query-chip">
              Archive: {query.includeArchived ? "Included" : "Hidden"}
            </span>
            <span className="query-chip">Rows per page: {query.limit}</span>
          </div>
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Results</p>
              <h2 className="panel-title">Approval flow templates</h2>
              <p className="panel-subtitle">
                Keep code, target, status, and draft/published versions visible together.
              </p>
            </div>
            <div className="catalog-meta">
              <strong>{data.pagination.total} total rows</strong>
              <span>
                Page {data.pagination.page} of {Math.max(data.pagination.totalPage, 1)}
              </span>
            </div>
          </div>

          {data.list.length > 0 ? (
            <div className="table-card catalog-table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Versions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.list.map((template) => (
                      <tr key={template.id}>
                        <td>
                          <strong>{template.code}</strong>
                          <span className="cell-meta">ID {template.id}</span>
                        </td>
                        <td>
                          <strong>{template.name}</strong>
                          <span className="cell-meta">
                            {template.description || "No description provided."}
                          </span>
                        </td>
                        <td>{formatApprovalFlowTargetType(template.targetType)}</td>
                        <td>
                          <span className={statusClass(template.status)}>
                            {formatApprovalFlowTemplateStatus(template.status)}
                          </span>
                        </td>
                        <td>
                          <strong>v{template.latestVersionNo}</strong>
                          <span className="cell-meta">
                            {template.publishedVersionId
                              ? `Published ${template.publishedVersionId.slice(0, 8)}`
                              : "No published version yet"}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <Link
                              href={`/approval-flows/${template.id}?returnTo=${encodeURIComponent(nextPath)}`}
                              className="button-secondary compact"
                            >
                              Open
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-row">
                <span>
                  Showing page {data.pagination.page} with {data.list.length} rows loaded.
                </span>
                <div className="pagination-actions">
                  {previousPath ? (
                    <Link href={previousPath} className="button-ghost">
                      Previous
                    </Link>
                  ) : (
                    <span className="button-ghost is-disabled">Previous</span>
                  )}

                  {nextPagePath ? (
                    <Link href={nextPagePath} className="button-secondary">
                      Next
                    </Link>
                  ) : (
                    <span className="button-secondary is-disabled">Next</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state spotlight-empty-state">
              No approval flows matched the current query. Reset the toolbar, widen the search, or
              create a new template to repopulate the library.
            </div>
          )}
        </section>
      </section>
    </AdminShell>
  );
}
