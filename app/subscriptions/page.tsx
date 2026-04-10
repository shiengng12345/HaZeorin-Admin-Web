import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { ConfirmActionButton } from "@/components/common/ConfirmActionButton";
import {
  cancelSubscriptionAction,
  changeSubscriptionPlanAction,
  createSubscriptionAction
} from "./actions";
import { listPlans } from "@/lib/grpc/subscription-client";
import { listSubscriptions } from "@/lib/grpc/tenant-client";
import { formatPriceFromCents } from "@/lib/plans";
import {
  DEFAULT_SUBSCRIPTION_LIST_STATE,
  buildSubscriptionsPath,
  formatSubscriptionDate,
  formatSubscriptionStatus,
  parseSubscriptionListState
} from "@/lib/subscriptions";
import { executeProtectedPageCall } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusFilterLabel(value: string) {
  if (value === "SUBSCRIPTION_STATUS_ACTIVE") {
    return "Active only";
  }

  if (value === "SUBSCRIPTION_STATUS_CANCELLED") {
    return "Cancelled only";
  }

  return "All statuses";
}

function sortLabel(sortBy: string, sortType: string) {
  const direction = sortType === "SORT_TYPE_ASC" ? "Asc" : "Desc";

  switch (sortBy) {
    case "ts.seat_count":
      return `Seats · ${direction}`;
    case "ts.status":
      return `Status · ${direction}`;
    case "ts.created_at":
      return `Created · ${direction}`;
    default:
      return `Started · ${direction}`;
  }
}

export default async function SubscriptionsPage({
  searchParams
}: SubscriptionsPageProps) {
  const params = (await searchParams) ?? {};
  const query = parseSubscriptionListState(params);
  const nextPath = buildSubscriptionsPath(query);

  const [subscriptionData, plansData] = await executeProtectedPageCall(nextPath, (session) =>
    Promise.all([
      listSubscriptions(session, {
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortType: query.sortType,
        status: query.status || undefined,
        planId: query.planId || undefined
      }),
      listPlans(session, {
        page: 1,
        limit: 100,
        sortBy: "price_cents",
        sortType: "SORT_TYPE_ASC"
      })
    ])
  );

  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const previousPath =
    query.page > 1 ? buildSubscriptionsPath({ ...query, page: query.page - 1 }) : null;
  const nextPageExists =
    subscriptionData.pagination.totalPage > 0 &&
    query.page < subscriptionData.pagination.totalPage;
  const nextPagePath = nextPageExists
    ? buildSubscriptionsPath({ ...query, page: query.page + 1 })
    : null;

  const planById = new Map(plansData.list.map((plan) => [plan.id, plan]));
  const activePlans = plansData.list.filter((plan) => plan.isActive);
  const activeCount = subscriptionData.list.filter(
    (subscription) => subscription.status === "SUBSCRIPTION_STATUS_ACTIVE"
  ).length;
  const cancelledCount = subscriptionData.list.filter(
    (subscription) => subscription.status === "SUBSCRIPTION_STATUS_CANCELLED"
  ).length;
  const selectedPlanLabel = query.planId
    ? planById.get(query.planId)?.name ?? "Selected plan"
    : "All plans";

  return (
    <AdminShell
      nextPath={nextPath}
      activeView="subscriptions"
      moduleTitle="Subscription"
      moduleDescription={
        <>
          Tenant-bound subscription lifecycles, plan changes, and cancellation work over the shared{" "}
          <code>tenant.v1</code> contract.
        </>
      }
    >
      <section className="content-stack">
      <section className="module-hero">
        <div className="module-hero-main">
          <div className="module-hero-pills">
            <span className="section-pill">Subscription module</span>
            <span className="section-pill section-pill-muted">Operations</span>
          </div>

          <h2 className="module-hero-title">Subscription operations</h2>
          <p className="module-hero-copy">
            Launch tenant subscriptions, move active tenants onto new plans, and close contracts
            without leaving the operations surface.
          </p>

          <div className="module-hero-actions">
            <Link href="/plans" className="button-secondary">
              Inspect plan catalog
            </Link>
            <span className="module-note">
              Current filter: {query.search ? `"${query.search}"` : "All subscriptions"}
            </span>
          </div>
        </div>

        <div className="module-hero-kpis">
          <article className="metric-card">
            <span>Matching subscriptions</span>
            <strong>{subscriptionData.pagination.total}</strong>
            <small>Rows returned for the active tenant and current query.</small>
          </article>
          <article className="metric-card">
            <span>Active on page</span>
            <strong>{activeCount}</strong>
            <small>{cancelledCount} cancelled rows are visible in this slice.</small>
          </article>
          <article className="metric-card">
            <span>Plan scope</span>
            <strong>{selectedPlanLabel}</strong>
            <small>{activePlans.length} active plans can be used for new launches.</small>
          </article>
          <article className="metric-card">
            <span>Sort</span>
            <strong>{sortLabel(query.sortBy, query.sortType)}</strong>
            <small>
              Page {subscriptionData.pagination.page} of{" "}
              {Math.max(subscriptionData.pagination.totalPage, 1)}
            </small>
          </article>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="status-banner">{error}</div> : null}

      <section className="operations-summary-strip">
        <article className="operations-summary-card">
          <span>Current search</span>
          <strong>{query.search ? `"${query.search}"` : "All subscriptions"}</strong>
          <small>Plan filter: {selectedPlanLabel}</small>
        </article>
        <article className="operations-summary-card">
          <span>Active rows</span>
          <strong>{activeCount}</strong>
          <small>Cancelled in current page: {cancelledCount}</small>
        </article>
        <article className="operations-summary-card">
          <span>Status filter</span>
          <strong>{statusFilterLabel(query.status)}</strong>
          <small>{sortLabel(query.sortBy, query.sortType)}</small>
        </article>
        <article className="operations-summary-card">
          <span>Available plans</span>
          <strong>{activePlans.length}</strong>
          <small>Ready for launches and migrations</small>
        </article>
      </section>

      <section className="operations-grid">
        <section className="panel command-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Launch</p>
              <h2 className="panel-title">Create tenant subscription</h2>
              <p className="panel-subtitle">
                The active tenant from the sidebar is used automatically. Pick an active plan and
                seat count, then the backend enforces the single-active-subscription rule.
              </p>
            </div>
          </div>

          {activePlans.length > 0 ? (
            <form action={createSubscriptionAction} className="field-grid subscription-form-grid">
              <input type="hidden" name="returnTo" value={nextPath} />

              <div className="field field-span-2">
                <label htmlFor="planId">Plan</label>
                <select id="planId" name="planId" defaultValue={activePlans[0]?.id ?? ""}>
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {formatPriceFromCents(plan.priceCents, plan.currency)} ·{" "}
                      {plan.interval.replace("PLAN_INTERVAL_", "").toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="seatCount">Seat count</label>
                <input
                  id="seatCount"
                  name="seatCount"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue="10"
                />
              </div>

              <div className="field subscription-action-hint">
                <span className="field-hint">
                  New subscriptions start as active and immediately bind to the tenant currently in
                  session.
                </span>
              </div>

              <div className="button-row field-span-2">
                <button type="submit" className="button-primary">
                  Launch subscription
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              No active plans are available. Activate or create a plan in the catalog before
              launching a tenant subscription.
            </div>
          )}
        </section>

        <aside className="panel insight-panel operations-insight-panel">
          <p className="eyebrow">Operator notes</p>
          <h2 className="insight-title">What this workspace controls</h2>
          <ul className="insight-list">
            <li>Only the tenant selected in the sidebar is queried or mutated here.</li>
            <li>Plan changes are limited to active plans so retired plans do not re-enter use.</li>
            <li>Cancellation is terminal for the active record; reopening requires a fresh launch.</li>
          </ul>

          <div className="insight-divider" />

          <div className="insight-metrics">
            <div>
              <span>Active plan options</span>
              <strong>{activePlans.length}</strong>
            </div>
            <div>
              <span>Loaded rows</span>
              <strong>{subscriptionData.list.length}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel command-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Query controls</p>
            <h2 className="panel-title">Search and filter</h2>
            <p className="panel-subtitle">
              Search follows plan metadata, while filters keep the table focused on state or a
              single plan.
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
              placeholder="plan code, name, description"
            />
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={query.status}>
              <option value="">All statuses</option>
              <option value="SUBSCRIPTION_STATUS_ACTIVE">Active only</option>
              <option value="SUBSCRIPTION_STATUS_CANCELLED">Cancelled only</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="planId">Plan</label>
            <select id="planId" name="planId" defaultValue={query.planId}>
              <option value="">All plans</option>
              {plansData.list.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sortBy">Sort by</label>
            <select id="sortBy" name="sortBy" defaultValue={query.sortBy}>
              <option value="ts.started_at">Started at</option>
              <option value="ts.seat_count">Seat count</option>
              <option value="ts.status">Status</option>
              <option value="ts.created_at">Created at</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="sortType">Direction</label>
            <select id="sortType" name="sortType" defaultValue={query.sortType}>
              <option value="SORT_TYPE_DESC">Descending</option>
              <option value="SORT_TYPE_ASC">Ascending</option>
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
            <Link href={buildSubscriptionsPath(DEFAULT_SUBSCRIPTION_LIST_STATE)} className="button-ghost">
              Reset to default
            </Link>
          </div>
        </form>

        <div className="query-strip">
          <span className="query-chip">Status: {statusFilterLabel(query.status)}</span>
          <span className="query-chip">Plan: {selectedPlanLabel}</span>
          <span className="query-chip">Rows per page: {query.limit}</span>
          <span className="query-chip">Sorting: {sortLabel(query.sortBy, query.sortType)}</span>
        </div>
      </section>

      <section className="panel catalog-panel">
        <div className="panel-head catalog-head">
          <div>
            <p className="eyebrow">Live records</p>
            <h2 className="panel-title">Tenant subscriptions</h2>
            <p className="panel-subtitle">
              Each row exposes lifecycle state, seat count, and the exact actions that are still
              legal from the backend.
            </p>
          </div>
          <div className="catalog-meta">
            <strong>{subscriptionData.pagination.total} total rows</strong>
            <span>
              Page {subscriptionData.pagination.page} of{" "}
              {Math.max(subscriptionData.pagination.totalPage, 1)}
            </span>
          </div>
        </div>

        {subscriptionData.list.length > 0 ? (
          <div className="table-card catalog-table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Plan</th>
                    <th>Seats</th>
                    <th>Status</th>
                    <th>Lifecycle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionData.list.map((subscription) => {
                    const currentPlan = planById.get(subscription.planId);
                    const availableChangePlans = activePlans.filter(
                      (plan) => plan.id !== subscription.planId
                    );
                    const isActive = subscription.status === "SUBSCRIPTION_STATUS_ACTIVE";

                    return (
                      <tr key={subscription.id}>
                        <td>
                          <strong>{formatSubscriptionDate(subscription.startedAt)}</strong>
                          <span className="cell-meta">ID {subscription.id}</span>
                        </td>
                        <td>
                          <strong>{currentPlan?.name ?? "Archived plan"}</strong>
                          <span className="cell-meta">
                            {currentPlan
                              ? `${currentPlan.code} · ${formatPriceFromCents(
                                  currentPlan.priceCents,
                                  currentPlan.currency
                                )}`
                              : subscription.planId}
                          </span>
                        </td>
                        <td>
                          <strong>{subscription.seatCount}</strong>
                          <span className="cell-meta">Provisioned seats</span>
                        </td>
                        <td>
                          <span
                            className={
                              isActive ? "status-chip is-active" : "status-chip is-suspended"
                            }
                          >
                            {formatSubscriptionStatus(subscription.status)}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {isActive
                              ? "Running"
                              : formatSubscriptionDate(subscription.cancelledAt)}
                          </strong>
                          <span className="cell-meta">
                            {isActive
                              ? "No cancellation timestamp yet."
                              : "Cancelled and no longer mutable."}
                          </span>
                        </td>
                        <td>
                          <div className="subscription-row-actions">
                            {isActive ? (
                              <>
                                {availableChangePlans.length > 0 ? (
                                  <form
                                    action={changeSubscriptionPlanAction}
                                    className="inline-action-form"
                                  >
                                    <input
                                      type="hidden"
                                      name="subscriptionId"
                                      value={subscription.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="currentPlanId"
                                      value={subscription.planId}
                                    />
                                    <input type="hidden" name="returnTo" value={nextPath} />
                                    <select
                                      name="newPlanId"
                                      defaultValue={availableChangePlans[0]?.id ?? ""}
                                    >
                                      {availableChangePlans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>
                                          {plan.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button type="submit" className="button-secondary compact">
                                      Change plan
                                    </button>
                                  </form>
                                ) : (
                                  <span className="cell-meta">
                                    No alternate active plans available.
                                  </span>
                                )}

                                <form action={cancelSubscriptionAction}>
                                  <input
                                    type="hidden"
                                    name="subscriptionId"
                                    value={subscription.id}
                                  />
                                  <input type="hidden" name="returnTo" value={nextPath} />
                                  <ConfirmActionButton
                                    className="button-ghost danger compact"
                                    label="Cancel"
                                    message={`Cancel the current subscription for ${
                                      currentPlan?.name ?? "this tenant"
                                    }?`}
                                  />
                                </form>
                              </>
                            ) : (
                              <span className="cell-meta">
                                This record is closed. Launch a new subscription to reactivate the
                                tenant lifecycle.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination-row">
              <span>
                Showing page {subscriptionData.pagination.page} with{" "}
                {subscriptionData.list.length} rows loaded.
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
            No subscriptions matched the current query. Reset the filters or launch a subscription
            from the active plan set to repopulate this workspace.
          </div>
        )}
      </section>
    </section>
    </AdminShell>
  );
}
