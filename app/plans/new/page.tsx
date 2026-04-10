import Link from "next/link";

import { createPlanAction } from "../actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { INTERVAL_OPTIONS, readPlanFormState } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewPlanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPlanPage({ searchParams }: NewPlanPageProps) {
  const params = (await searchParams) ?? {};
  const form = readPlanFormState(params);
  const error = typeof params.error === "string" ? params.error : "";
  const normalizedCurrency = form.currency.trim().toUpperCase() || "MYR";
  const normalizedInterval =
    form.interval === "PLAN_INTERVAL_YEARLY" ? "Yearly" : "Monthly";

  return (
    <AdminShell
      nextPath="/plans/new"
      activeView="plans-new"
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
              <span className="section-pill section-pill-muted">Create plan</span>
            </div>
            <h2 className="record-title">Define a new price point</h2>
            <p className="record-copy">
              Launch a new commercial offer with immutable code, billing interval, and operator-facing
              description in one publishing flow.
            </p>
          </div>

          <div className="record-hero-meta">
            <div className="record-mini-card">
              <span>Current interval</span>
              <strong>{normalizedInterval}</strong>
            </div>
            <div className="record-mini-card">
              <span>Currency</span>
              <strong>{normalizedCurrency}</strong>
            </div>
          </div>
        </section>

        <section className="record-layout record-layout-wide">
          <section className="panel form-shell form-shell-prominent">
            <div className="panel-head form-shell-head">
              <div>
                <p className="eyebrow">New catalog record</p>
                <h2 className="panel-title">Plan setup</h2>
                <p className="panel-subtitle">
                  Separate the system identifier from the commercial label, then set price and billing
                  rhythm before the plan is published.
                </p>
              </div>
              <Link href="/plans" className="button-ghost">
                Back to catalog
              </Link>
            </div>

            {error ? <div className="status-banner">{error}</div> : null}

            <form action={createPlanAction} className="field-grid">
              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Identity</p>
                    <h3 className="form-section-title">Name the offer</h3>
                  </div>
                  <p className="form-section-copy">
                    Keep the code stable for systems and the name readable for operators.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="code">Plan code</label>
                    <input
                      id="code"
                      name="code"
                      type="text"
                      defaultValue={form.code}
                      placeholder="starter_monthly"
                      required
                    />
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
                    Capture the amount as a decimal string. The BFF will normalize it into cents.
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

                  <div className="field field-span-2">
                    <label htmlFor="interval">Interval</label>
                    <select id="interval" name="interval" defaultValue={form.interval} required>
                      {INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Operator context</p>
                    <h3 className="form-section-title">Describe the plan</h3>
                  </div>
                  <p className="form-section-copy">
                    A short internal description helps future operators decide when to use this offer.
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
                  Create subscription plan
                </button>
                <Link href="/plans" className="button-ghost">
                  Cancel
                </Link>
              </div>
            </form>
          </section>

          <aside className="record-sidebar">
            <section className="panel insight-panel">
              <p className="eyebrow">Draft preview</p>
              <h3 className="insight-title">{form.name || "Untitled plan"}</h3>
              <div className="record-preview-stack">
                <div className="record-preview-row">
                  <span>Code</span>
                  <strong>{form.code || "pending_code"}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Price</span>
                  <strong>{form.price || "0.00"} {normalizedCurrency}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Interval</span>
                  <strong>{normalizedInterval}</strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <p className="eyebrow">Launch checklist</p>
              <h3 className="insight-title">Before publish</h3>
              <ul className="insight-list">
                <li>Use lowercase snake case like <code>starter_monthly</code>.</li>
                <li>Currency should stay on a 3-letter code such as <code>MYR</code>.</li>
                <li>Choose the interval before communicating the public price.</li>
              </ul>
            </section>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
