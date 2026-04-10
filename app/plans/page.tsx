import Link from "next/link";

import { deletePlanAction } from "./actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { ConfirmActionButton } from "@/components/common/ConfirmActionButton";
import { listPlans } from "@/lib/grpc/subscription-client";
import {
  buildPlansPath,
  DEFAULT_PLAN_LIST_STATE,
  formatPlanInterval,
  formatPriceFromCents,
  parsePlanListState
} from "@/lib/plans";
import { executeProtectedPageCall } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlansPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function boolFilterLabel(value: "" | "true" | "false") {
  if (value === "true") {
    return "Active only";
  }

  if (value === "false") {
    return "Inactive only";
  }

  return "All statuses";
}

function intervalFilterLabel(value: string) {
  if (value === "PLAN_INTERVAL_MONTHLY") {
    return "Monthly";
  }

  if (value === "PLAN_INTERVAL_YEARLY") {
    return "Yearly";
  }

  return "All intervals";
}

function sortLabel(sortBy: string, sortType: string) {
  if (!sortBy) {
    return "Default";
  }

  const direction = sortType === "SORT_TYPE_DESC" ? "Desc" : "Asc";

  return `${sortBy.replaceAll("_", " ")} · ${direction}`;
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = (await searchParams) ?? {};
  const query = parsePlanListState(params);
  const nextPath = buildPlansPath(query);
  const data = await executeProtectedPageCall(nextPath, (session) =>
    listPlans(session, {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      sortBy: query.sortBy || undefined,
      sortType: query.sortType,
      isActive:
        query.isActive === "" ? undefined : query.isActive === "true",
      interval: query.interval || undefined
    })
  );

  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const previousPath =
    query.page > 1 ? buildPlansPath({ ...query, page: query.page - 1 }) : null;
  const nextPageExists =
    data.pagination.totalPage > 0 && query.page < data.pagination.totalPage;
  const nextPagePath = nextPageExists
    ? buildPlansPath({ ...query, page: query.page + 1 })
    : null;
  const activeOnPage = data.list.filter((plan) => plan.isActive).length;

  return (
    <AdminShell
      nextPath={nextPath}
      activeView="plans"
      moduleTitle="Subscription"
      moduleDescription={
        <>
          Plan catalog and lifecycle work over the shared <code>subscription.v1</code> contract.
        </>
      }
    >
      <section className="content-stack">
        <section className="module-hero">
          <div className="module-hero-main">
            <div className="module-hero-pills">
              <span className="section-pill">Subscription module</span>
              <span className="section-pill section-pill-muted">Plan catalog</span>
            </div>

            <h2 className="module-hero-title">Plan catalog</h2>
            <p className="module-hero-copy">
              Search, filter, edit, and retire subscription plans from one working surface.
            </p>

            <div className="module-hero-actions">
              <Link href="/plans/new" className="button-primary">
                Create plan
              </Link>
              <span className="module-note">
                Query: {query.search ? `"${query.search}"` : "All plans"}
              </span>
            </div>
          </div>

          <div className="module-hero-kpis">
            <article className="metric-card">
              <span>Total plans</span>
              <strong>{data.pagination.total}</strong>
              <small>All rows matching the current query.</small>
            </article>
            <article className="metric-card">
              <span>Active rows</span>
              <strong>{activeOnPage}</strong>
              <small>{data.list.length} rows visible on this page.</small>
            </article>
            <article className="metric-card">
              <span>Status filter</span>
              <strong>{boolFilterLabel(query.isActive)}</strong>
              <small>Interval: {intervalFilterLabel(query.interval)}</small>
            </article>
            <article className="metric-card">
              <span>Sort</span>
              <strong>{sortLabel(query.sortBy, query.sortType)}</strong>
              <small>Page {data.pagination.page} of {Math.max(data.pagination.totalPage, 1)}</small>
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
                These controls map directly to the fields the backend supports today.
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
                placeholder="code, name, description, currency"
              />
            </div>

            <div className="field">
              <label htmlFor="isActive">Status</label>
              <select id="isActive" name="isActive" defaultValue={query.isActive}>
                <option value="">All statuses</option>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="interval">Interval</label>
              <select id="interval" name="interval" defaultValue={query.interval}>
                <option value="">All intervals</option>
                <option value="PLAN_INTERVAL_MONTHLY">Monthly</option>
                <option value="PLAN_INTERVAL_YEARLY">Yearly</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="sortBy">Sort by</label>
              <select id="sortBy" name="sortBy" defaultValue={query.sortBy}>
                <option value="price_cents">Price</option>
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="currency">Currency</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="sortType">Direction</label>
              <select id="sortType" name="sortType" defaultValue={query.sortType}>
                <option value="SORT_TYPE_ASC">Ascending</option>
                <option value="SORT_TYPE_DESC">Descending</option>
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

            <div className="button-row">
              <button type="submit" className="button-secondary">
                Apply query
              </button>
              <Link href={buildPlansPath(DEFAULT_PLAN_LIST_STATE)} className="button-ghost">
                Reset to default
              </Link>
            </div>
          </form>

          <div className="query-strip">
            <span className="query-chip">Status: {boolFilterLabel(query.isActive)}</span>
            <span className="query-chip">Interval: {intervalFilterLabel(query.interval)}</span>
            <span className="query-chip">Rows per page: {query.limit}</span>
            <span className="query-chip">Sorting: {sortLabel(query.sortBy, query.sortType)}</span>
          </div>
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Results</p>
              <h2 className="panel-title">Subscription plans</h2>
              <p className="panel-subtitle">
                Code, price, interval, state, and edit actions stay visible in one dense table.
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
                      <th>Interval</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.list.map((plan) => (
                      <tr key={plan.id}>
                        <td>
                          <strong>{plan.code}</strong>
                          <span className="cell-meta">ID {plan.id}</span>
                        </td>
                        <td>
                          <strong>{plan.name}</strong>
                          <span className="cell-meta">
                            {plan.description || "No description provided."}
                          </span>
                        </td>
                        <td>{formatPlanInterval(plan.interval)}</td>
                        <td>{formatPriceFromCents(plan.priceCents, plan.currency)}</td>
                        <td>
                          <span
                            className={
                              plan.isActive ? "status-chip is-active" : "status-chip is-suspended"
                            }
                          >
                            {plan.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <Link
                              href={`/plans/${plan.id}?returnTo=${encodeURIComponent(nextPath)}`}
                              className="button-secondary compact"
                            >
                              Edit
                            </Link>
                            <form action={deletePlanAction}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <input type="hidden" name="planName" value={plan.name} />
                              <input type="hidden" name="returnTo" value={nextPath} />
                              <ConfirmActionButton
                                className="button-ghost danger"
                                label="Delete"
                                message={`Delete ${plan.name}? This cannot be undone.`}
                              />
                            </form>
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
              No plans matched the current query. Reset the toolbar, widen the search, or create a
              new plan to repopulate the catalog.
            </div>
          )}
        </section>
      </section>
    </AdminShell>
  );
}
