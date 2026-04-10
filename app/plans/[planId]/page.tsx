import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePlanAction } from "../actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPlan } from "@/lib/grpc/subscription-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import {
  INTERVAL_OPTIONS,
  formatPriceForInput,
  readPlanFormState,
  sanitizePlanReturnPath
} from "@/lib/plans";
import { executeProtectedPageCall } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanDetailPageProps = {
  params: Promise<{
    planId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlanDetailPage({
  params,
  searchParams
}: PlanDetailPageProps) {
  const resolvedParams = await params;
  const query = (await searchParams) ?? {};
  const planId = resolvedParams.planId;
  const returnTo = sanitizePlanReturnPath(
    typeof query.returnTo === "string" ? query.returnTo : ""
  );
  const nextPath = `/plans/${planId}`;

  let plan;

  try {
    plan = await executeProtectedPageCall(nextPath, (session) => getPlan(session, planId));
  } catch (error) {
    if (error instanceof GrpcBusinessError && error.status === "STATUS_CODE_NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  const form = readPlanFormState(query, {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: formatPriceForInput(plan.priceCents),
    currency: plan.currency,
    interval: plan.interval,
    isActive: plan.isActive
  });
  const error = typeof query.error === "string" ? query.error : "";
  const message = typeof query.message === "string" ? query.message : "";
  const intervalLabel =
    form.interval === "PLAN_INTERVAL_YEARLY" ? "Yearly" : "Monthly";
  const shellNextPath =
    returnTo === "/plans"
      ? nextPath
      : `${nextPath}?${new URLSearchParams({ returnTo }).toString()}`;

  return (
    <AdminShell
      nextPath={shellNextPath}
      activeView="plans"
      moduleTitle="Subscription"
      moduleDescription={
        <>
          Plan catalog and lifecycle work over the shared <code>subscription.v1</code> contract.
        </>
      }
    >
      <section className="content-stack">
        <section className="record-hero">
          <div className="record-hero-main">
            <div className="record-chip-row">
              <span className="section-pill">Subscription module</span>
              <span className="section-pill section-pill-muted">Plan detail</span>
              <span className={plan.isActive ? "status-chip is-active" : "status-chip is-suspended"}>
                {plan.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <h2 className="record-title">{plan.name}</h2>
            <p className="record-copy">
              Update price, interval, and rollout status while keeping the immutable record identity
              visible for operators.
            </p>
          </div>

          <div className="record-hero-meta">
            <div className="record-mini-card">
              <span>Interval</span>
              <strong>{intervalLabel}</strong>
            </div>
            <div className="record-mini-card">
              <span>Record ID</span>
              <strong>{plan.id.slice(0, 8)}</strong>
            </div>
          </div>
        </section>

        <section className="record-layout record-layout-wide">
          <section className="panel form-shell form-shell-prominent">
            <div className="panel-head form-shell-head">
              <div>
                <p className="eyebrow">Catalog record</p>
                <h2 className="panel-title">Plan maintenance</h2>
                <p className="panel-subtitle">
                  Commercial edits stay available, but the original code remains locked for system
                  references and future billing integrations.
                </p>
              </div>
              <Link href={returnTo} className="button-ghost">
                Back to catalog
              </Link>
            </div>

            {message ? <div className="success-banner">{message}</div> : null}
            {error ? <div className="status-banner">{error}</div> : null}

            <form action={updatePlanAction} className="field-grid">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Identity</p>
                    <h3 className="form-section-title">Immutable reference</h3>
                  </div>
                  <p className="form-section-copy">
                    The code is locked after creation, but the operator-facing label can still evolve.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="code">Plan code</label>
                    <input id="code" name="code_display" type="text" defaultValue={form.code} disabled />
                    <p className="field-hint">Code is immutable after creation.</p>
                  </div>

                  <div className="field">
                    <label htmlFor="name">Plan name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      defaultValue={form.name}
                      placeholder="Starter"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Commercial model</p>
                    <h3 className="form-section-title">Price and cadence</h3>
                  </div>
                  <p className="form-section-copy">
                    Changes here directly affect what operators can apply in subscription operations.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="price">Price</label>
                    <input
                      id="price"
                      name="price"
                      type="text"
                      inputMode="decimal"
                      defaultValue={form.price}
                      placeholder="29.90"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="currency">Currency</label>
                    <input
                      id="currency"
                      name="currency"
                      type="text"
                      maxLength={3}
                      defaultValue={form.currency}
                      placeholder="MYR"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="interval">Interval</label>
                    <select id="interval" name="interval" defaultValue={form.interval} required>
                      {INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="checkbox-field checkbox-field-inline">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={form.isActive}
                    />
                    <span>Plan is active and available for subscription changes.</span>
                  </label>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Operator context</p>
                    <h3 className="form-section-title">Description</h3>
                  </div>
                  <p className="form-section-copy">
                    Keep the internal explanation concise so plan differences remain easy to scan.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={5}
                    defaultValue={form.description}
                    placeholder="What does this plan unlock for tenants?"
                  />
                </div>
              </section>

              <div className="form-action-row">
                <button type="submit" className="button-primary">
                  Save plan changes
                </button>
                <Link href={returnTo} className="button-ghost">
                  Back to catalog
                </Link>
              </div>
            </form>
          </section>

          <aside className="record-sidebar">
            <section className="panel insight-panel">
              <p className="eyebrow">Record state</p>
              <h3 className="insight-title">{plan.code}</h3>
              <div className="record-preview-stack">
                <div className="record-preview-row">
                  <span>Status</span>
                  <strong>{plan.isActive ? "Active" : "Inactive"}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Interval</span>
                  <strong>{intervalLabel}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Plan ID</span>
                  <strong>{plan.id.slice(0, 8)}</strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <p className="eyebrow">Editing rules</p>
              <h3 className="insight-title">What stays stable</h3>
              <ul className="insight-list">
                <li>The immutable code anchors references in future billing workflows.</li>
                <li>Price and interval changes should be intentional and operator-reviewed.</li>
                <li>Deactivate a plan when you need to preserve history without deleting the record.</li>
              </ul>
            </section>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
