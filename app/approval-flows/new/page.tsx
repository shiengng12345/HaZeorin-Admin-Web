import Link from "next/link";

import { createApprovalFlowAction } from "../actions";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  DEFAULT_APPROVAL_FLOW_FORM_STATE,
  formatApprovalFlowTargetType,
  readApprovalFlowFormState,
  summarizeApprovalFlowGraph
} from "@/lib/approval-flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewApprovalFlowPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewApprovalFlowPage({
  searchParams
}: NewApprovalFlowPageProps) {
  const params = (await searchParams) ?? {};
  const form = readApprovalFlowFormState(params);
  const error = typeof params.error === "string" ? params.error : "";
  const graphSummary = summarizeApprovalFlowGraph(form.graphJson);

  return (
    <AdminShell
      nextPath="/approval-flows/new"
      activeView="approval-flows-new"
      moduleTitle="Approval flows"
      moduleDescription={
        <>
          Build new templates over <code>approvalflow.v1</code> with an initial draft graph and a
          concrete runtime target.
        </>
      }
    >
      <section className="content-stack">
        <section className="record-hero">
          <div className="record-hero-main">
            <div className="record-chip-row">
              <span className="section-pill">Approval flow module</span>
              <span className="section-pill section-pill-muted">Create template</span>
            </div>
            <h2 className="record-title">Create a new approval flow</h2>
            <p className="record-copy">
              Start with a stable code, pick the target request type, and seed the draft graph
              before moving into publish and binding work.
            </p>
          </div>

          <div className="record-hero-meta">
            <div className="record-mini-card">
              <span>Target</span>
              <strong>{formatApprovalFlowTargetType(form.targetType)}</strong>
            </div>
            <div className="record-mini-card">
              <span>Starter graph</span>
              <strong>
                {graphSummary.nodeCount} nodes · {graphSummary.edgeCount} edges
              </strong>
            </div>
          </div>
        </section>

        <section className="record-layout record-layout-wide">
          <section className="panel form-shell form-shell-prominent">
            <div className="panel-head form-shell-head">
              <div>
                <p className="eyebrow">New template</p>
                <h2 className="panel-title">Flow setup</h2>
                <p className="panel-subtitle">
                  The create step stores both the template record and its first draft version.
                </p>
              </div>
              <Link href="/approval-flows" className="button-ghost">
                Back to flow library
              </Link>
            </div>

            {error ? <div className="status-banner">{error}</div> : null}

            <form action={createApprovalFlowAction} className="field-grid">
              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Identity</p>
                    <h3 className="form-section-title">Name the template</h3>
                  </div>
                  <p className="form-section-copy">
                    Keep the code stable for integrations and the title readable for operators.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="code">Flow code</label>
                    <input
                      id="code"
                      name="code"
                      type="text"
                      defaultValue={form.code}
                      placeholder="leave_manager_default"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="name">Flow name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      defaultValue={form.name}
                      placeholder="Leave Manager Default"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Runtime scope</p>
                    <h3 className="form-section-title">Target and context</h3>
                  </div>
                  <p className="form-section-copy">
                    The target type decides where this template can be bound in the approval
                    runtime.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="targetType">Target type</label>
                    <select
                      id="targetType"
                      name="targetType"
                      defaultValue={form.targetType}
                      required
                    >
                      <option value="APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST">Leave request</option>
                      <option value="APPROVAL_FLOW_TARGET_TYPE_CLAIM">Claim</option>
                      <option value="APPROVAL_FLOW_TARGET_TYPE_OVERTIME">Overtime</option>
                      <option value="APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE">
                        Employee change
                      </option>
                    </select>
                  </div>

                  <div className="field field-span-2">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      defaultValue={form.description}
                      placeholder="What does this flow cover and when should operators bind it?"
                    />
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Draft graph</p>
                    <h3 className="form-section-title">Initial JSON graph</h3>
                  </div>
                  <p className="form-section-copy">
                    Start from the manager-approval template, then refine the draft on the detail
                    page after creation.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="graphJson">Graph JSON</label>
                  <textarea
                    id="graphJson"
                    name="graphJson"
                    rows={18}
                    defaultValue={form.graphJson || DEFAULT_APPROVAL_FLOW_FORM_STATE.graphJson}
                    className="code-input"
                    spellCheck={false}
                    required
                  />
                </div>
              </section>

              <div className="form-action-row">
                <button type="submit" className="button-primary">
                  Create approval flow
                </button>
                <Link href="/approval-flows" className="button-ghost">
                  Cancel
                </Link>
              </div>
            </form>
          </section>

          <aside className="record-sidebar">
            <section className="panel insight-panel">
              <p className="eyebrow">Draft preview</p>
              <h3 className="insight-title">{form.name || "Untitled flow"}</h3>
              <div className="record-preview-stack">
                <div className="record-preview-row">
                  <span>Code</span>
                  <strong>{form.code || "pending_code"}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Target</span>
                  <strong>{formatApprovalFlowTargetType(form.targetType)}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Graph</span>
                  <strong>
                    {graphSummary.nodeCount} nodes · {graphSummary.edgeCount} edges
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <p className="eyebrow">Starting point</p>
              <h3 className="insight-title">Before create</h3>
              <ul className="insight-list">
                <li>Use a stable lowercase code such as <code>leave_manager_default</code>.</li>
                <li>The draft opens with a simple manager approval so validation has a safe base.</li>
                <li>Bindings are configured after the template exists and can reference a version.</li>
              </ul>
            </section>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
