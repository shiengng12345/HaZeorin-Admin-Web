import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveApprovalFlowAction,
  publishApprovalFlowAction,
  updateApprovalFlowDraftAction,
  upsertApprovalFlowBindingAction
} from "../actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { ConfirmActionButton } from "@/components/common/ConfirmActionButton";
import {
  buildApprovalFlowDetailPath,
  compareApprovalFlowGraphs,
  defaultApprovalFlowSimulationFieldsJson,
  formatApprovalFlowTargetType,
  formatApprovalFlowTemplateStatus,
  readApprovalFlowBindingFormState,
  readApprovalFlowFormState,
  readApprovalFlowSimulationFormState,
  sanitizeApprovalFlowReturnPath,
  summarizeApprovalFlowGraph
} from "@/lib/approval-flows";
import {
  getApprovalFlow,
  listApprovalFlowBindings,
  simulateApprovalFlow,
  validateApprovalFlow
} from "@/lib/grpc/approvalflow-client";
import { GrpcBusinessError, GrpcTransportError } from "@/lib/grpc/errors";
import { executeProtectedPageCall } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApprovalFlowDetailPageProps = {
  params: Promise<{
    templateId: string;
  }>;
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

function formatValidationState(valid: boolean, issueCount: number) {
  if (valid && issueCount === 0) {
    return "Valid";
  }

  if (issueCount > 0) {
    return `Needs attention (${issueCount})`;
  }

  return "Pending review";
}

function formatExecutionMode(value: string) {
  if (value === "APPROVAL_NODE_EXECUTION_MODE_ANY_ONE_APPROVE") {
    return "Any one approve";
  }

  if (value === "APPROVAL_NODE_EXECUTION_MODE_ALL_APPROVE") {
    return "All approve";
  }

  return "Unspecified";
}

function describeRpcError(error: unknown, fallback: string) {
  if (error instanceof GrpcBusinessError || error instanceof GrpcTransportError) {
    return error.message;
  }

  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return `${error.name}: ${error.message}`;
  }

  return fallback;
}

export default async function ApprovalFlowDetailPage({
  params,
  searchParams
}: ApprovalFlowDetailPageProps) {
  const resolvedParams = await params;
  const query = (await searchParams) ?? {};
  const templateId = resolvedParams.templateId;
  const returnTo = sanitizeApprovalFlowReturnPath(
    typeof query.returnTo === "string" ? query.returnTo : ""
  );
  const simulationQuery = {
    simulate: typeof query.simulate === "string" ? query.simulate : undefined,
    simulationRequesterId:
      typeof query.simulationRequesterId === "string"
        ? query.simulationRequesterId
        : undefined,
    simulationRequesterEmployeeId:
      typeof query.simulationRequesterEmployeeId === "string"
        ? query.simulationRequesterEmployeeId
        : undefined,
    simulationFieldsJson:
      typeof query.simulationFieldsJson === "string"
        ? query.simulationFieldsJson
        : undefined
  };
  const nextPath =
    returnTo === "/approval-flows"
      ? buildApprovalFlowDetailPath(templateId, simulationQuery)
      : buildApprovalFlowDetailPath(templateId, { returnTo, ...simulationQuery });
  const shouldRunSimulation = typeof query.simulate === "string" && query.simulate === "true";
  const requestedSimulationRequesterId =
    typeof query.simulationRequesterId === "string" ? query.simulationRequesterId : "";
  const requestedSimulationRequesterEmployeeId =
    typeof query.simulationRequesterEmployeeId === "string"
      ? query.simulationRequesterEmployeeId
      : "";
  const requestedSimulationFieldsJson =
    typeof query.simulationFieldsJson === "string" ? query.simulationFieldsJson : "";

  let flowRecord;
  let sessionUserId = "";
  let validationError = "";
  let bindingsError = "";
  let simulationError = "";
  let validationResult: Awaited<ReturnType<typeof validateApprovalFlow>> | null = null;
  let simulationResult: Awaited<ReturnType<typeof simulateApprovalFlow>> | null = null;
  let bindingRows: Awaited<ReturnType<typeof listApprovalFlowBindings>>["list"] = [];

  try {
    const data = await executeProtectedPageCall(nextPath, async (session) => {
      const record = await getApprovalFlow(session, templateId);
      const [validation, bindings, simulation] = await Promise.allSettled([
        record.draftVersion
          ? validateApprovalFlow(session, {
              tenantId: session.tenantId,
              targetType: record.template.targetType,
              graphJson: record.draftVersion.graphJson
            })
          : Promise.resolve(null),
        listApprovalFlowBindings(session, {
          page: 1,
          limit: 100,
          targetType: record.template.targetType,
          includeInactive: true
        }),
        shouldRunSimulation && (record.draftVersion || record.publishedVersion)
          ? simulateApprovalFlow(session, {
              tenantId: session.tenantId,
              templateId: record.template.id,
              requesterId: requestedSimulationRequesterId.trim() || session.userId,
              requesterEmployeeId:
                requestedSimulationRequesterEmployeeId.trim() || undefined,
              fieldsJson:
                requestedSimulationFieldsJson.trim() ||
                defaultApprovalFlowSimulationFieldsJson(record.template.targetType)
            })
          : Promise.resolve(null)
      ]);

      return {
        record,
        validation,
        bindings,
        simulation,
        sessionUserId: session.userId
      };
    });

    flowRecord = data.record;
    sessionUserId = data.sessionUserId;

    if (data.validation.status === "fulfilled") {
      validationResult = data.validation.value;
    } else {
      validationError = describeRpcError(
        data.validation.reason,
        "Unable to validate the current draft."
      );
    }

    if (data.bindings.status === "fulfilled") {
      bindingRows = data.bindings.value.list.filter((binding) => binding.templateId === templateId);
    } else {
      bindingsError = describeRpcError(
        data.bindings.reason,
        "Unable to load approval flow bindings."
      );
    }

    if (data.simulation.status === "fulfilled") {
      simulationResult = data.simulation.value;
    } else {
      simulationError = describeRpcError(
        data.simulation.reason,
        "Unable to simulate the current approval flow."
      );
    }
  } catch (error) {
    if (error instanceof GrpcBusinessError && error.status === "STATUS_CODE_NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  const defaultGraphJson =
    flowRecord.draftVersion?.graphJson ||
    flowRecord.publishedVersion?.graphJson ||
    "";
  const form = readApprovalFlowFormState(query, {
    code: flowRecord.template.code,
    name: flowRecord.template.name,
    description: flowRecord.template.description,
    targetType: flowRecord.template.targetType,
    graphJson: defaultGraphJson
  });
  const bindingSeed =
    bindingRows.find((binding) => binding.id === (typeof query.bindingId === "string" ? query.bindingId : "")) ??
    null;
  const bindingForm = readApprovalFlowBindingFormState(query, bindingSeed
    ? {
        bindingId: bindingSeed.id,
        name: bindingSeed.name,
        priority: String(bindingSeed.priority),
        isDefault: bindingSeed.isDefault,
        isActive: bindingSeed.isActive,
        conditionsJson: bindingSeed.conditionsJson
      }
    : undefined);
  const simulationForm = readApprovalFlowSimulationFormState(query, {
    shouldRun: shouldRunSimulation,
    requesterId: sessionUserId,
    requesterEmployeeId: requestedSimulationRequesterEmployeeId,
    fieldsJson: defaultApprovalFlowSimulationFieldsJson(flowRecord.template.targetType)
  });
  const error = typeof query.error === "string" ? query.error : "";
  const message = typeof query.message === "string" ? query.message : "";
  const graphSummary = summarizeApprovalFlowGraph(form.graphJson);
  const publishedGraphSummary = flowRecord.publishedVersion
    ? summarizeApprovalFlowGraph(flowRecord.publishedVersion.graphJson)
    : null;
  const graphComparison = compareApprovalFlowGraphs(
    flowRecord.draftVersion?.graphJson ?? "",
    flowRecord.publishedVersion?.graphJson ?? ""
  );
  const activeBindings = bindingRows.filter((binding) => binding.isActive).length;
  const defaultBindings = bindingRows.filter((binding) => binding.isDefault).length;
  const matchedSimulationBinding =
    simulationResult?.matchedBindingId
      ? bindingRows.find((binding) => binding.id === simulationResult?.matchedBindingId) ?? null
      : null;

  if (
    shouldRunSimulation &&
    !simulationResult &&
    !simulationError &&
    !flowRecord.draftVersion &&
    !flowRecord.publishedVersion
  ) {
    simulationError = "No draft or published version is available to simulate yet.";
  }

  return (
    <AdminShell
      nextPath={nextPath}
      activeView="approval-flows"
      moduleTitle="Approval flows"
      moduleDescription={
        <>
          Draft editing, validation, publish, and binding management all stay inside the shared{" "}
          <code>approvalflow.v1</code> surface.
        </>
      }
    >
      <section className="content-stack">
        <section className="record-hero">
          <div className="record-hero-main">
            <div className="record-chip-row">
              <span className="section-pill">Approval flow module</span>
              <span className="section-pill section-pill-muted">Template detail</span>
              <span className={statusClass(flowRecord.template.status)}>
                {formatApprovalFlowTemplateStatus(flowRecord.template.status)}
              </span>
            </div>
            <h2 className="record-title">{flowRecord.template.name}</h2>
            <p className="record-copy">
              Keep the draft current, validate the compiled graph, publish a runtime version, and
              manage bindings that point requests into this template.
            </p>
          </div>

          <div className="record-hero-meta">
            <div className="record-mini-card">
              <span>Target</span>
              <strong>{formatApprovalFlowTargetType(flowRecord.template.targetType)}</strong>
            </div>
            <div className="record-mini-card">
              <span>Latest version</span>
              <strong>v{flowRecord.template.latestVersionNo}</strong>
            </div>
          </div>
        </section>

        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="status-banner">{error}</div> : null}

        <section className="record-layout record-layout-wide">
          <section className="panel form-shell form-shell-prominent">
            <div className="panel-head form-shell-head">
              <div>
                <p className="eyebrow">Template maintenance</p>
                <h2 className="panel-title">Draft editor</h2>
                <p className="panel-subtitle">
                  Draft content can change over time, while code and target scope remain stable
                  reference points.
                </p>
              </div>
              <Link href={returnTo} className="button-ghost">
                Back to flow library
              </Link>
            </div>

            <form action={updateApprovalFlowDraftAction} className="field-grid">
              <input type="hidden" name="templateId" value={flowRecord.template.id} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Identity</p>
                    <h3 className="form-section-title">Stable reference</h3>
                  </div>
                  <p className="form-section-copy">
                    The code stays immutable after creation; the operator-facing title and
                    description can still evolve with the flow.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="code">Flow code</label>
                    <input id="code" name="code_display" type="text" defaultValue={form.code} disabled />
                    <p className="field-hint">Code is immutable after creation.</p>
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
                    Target type is fixed, but the description can keep clarifying how operators
                    should use this template.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="targetTypeDisplay">Target type</label>
                    <input
                      id="targetTypeDisplay"
                      type="text"
                      value={formatApprovalFlowTargetType(flowRecord.template.targetType)}
                      disabled
                      readOnly
                    />
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
                    <h3 className="form-section-title">Editable JSON graph</h3>
                  </div>
                  <p className="form-section-copy">
                    Save changes first, then publish when validation and bindings are ready.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="graphJson">Graph JSON</label>
                  <textarea
                    id="graphJson"
                    name="graphJson"
                    rows={18}
                    defaultValue={form.graphJson}
                    className="code-input"
                    spellCheck={false}
                    required
                  />
                </div>
              </section>

              <div className="form-action-row">
                <button type="submit" className="button-primary">
                  Save draft changes
                </button>
                <Link href={returnTo} className="button-ghost">
                  Back to flow library
                </Link>
              </div>
            </form>

            <div className="approval-flow-action-row">
              <form action={publishApprovalFlowAction}>
                <input type="hidden" name="templateId" value={flowRecord.template.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <ConfirmActionButton
                  className="button-secondary"
                  label="Publish current draft"
                  message="Publish the current draft as the live runtime version?"
                />
              </form>

              <form action={archiveApprovalFlowAction}>
                <input type="hidden" name="templateId" value={flowRecord.template.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <ConfirmActionButton
                  className="button-ghost danger"
                  label="Archive template"
                  message="Archive this approval flow template?"
                />
              </form>
            </div>
          </section>

          <aside className="record-sidebar">
            <section className="panel insight-panel">
              <p className="eyebrow">Template state</p>
              <h3 className="insight-title">{flowRecord.template.code}</h3>
              <div className="record-preview-stack">
                <div className="record-preview-row">
                  <span>Status</span>
                  <strong>{formatApprovalFlowTemplateStatus(flowRecord.template.status)}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Draft graph</span>
                  <strong>
                    {graphSummary.nodeCount} nodes · {graphSummary.edgeCount} edges
                  </strong>
                </div>
                <div className="record-preview-row">
                  <span>Published graph</span>
                  <strong>
                    {publishedGraphSummary
                      ? `${publishedGraphSummary.nodeCount} nodes · ${publishedGraphSummary.edgeCount} edges`
                      : "Not published"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <p className="eyebrow">Validation</p>
              <h3 className="insight-title">
                {validationResult
                  ? formatValidationState(validationResult.isValid, validationResult.issues.length)
                  : "Draft review"}
              </h3>
              <div className="record-preview-stack">
                <div className="record-preview-row">
                  <span>Issues</span>
                  <strong>{validationResult?.issues.length ?? 0}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Bindings</span>
                  <strong>{bindingRows.length}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Active defaults</span>
                  <strong>{defaultBindings}</strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <p className="eyebrow">Binding coverage</p>
              <h3 className="insight-title">Runtime mapping</h3>
              <ul className="insight-list">
                <li>{activeBindings} bindings are currently active for this template.</li>
                <li>{defaultBindings} bindings are marked as the default for this target type.</li>
                <li>Bindings stay tenant-scoped because the active sidebar tenant controls the context.</li>
              </ul>
            </section>
          </aside>
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Validation result</p>
              <h2 className="panel-title">Compiled draft review</h2>
              <p className="panel-subtitle">
                Validation runs against the current draft and returns issues plus the compiled graph
                snapshot.
              </p>
            </div>
          </div>

          {validationError ? <div className="status-banner">{validationError}</div> : null}

          {validationResult ? (
            <>
              <section className="operations-summary-strip">
                <article className="operations-summary-card">
                  <span>Validation state</span>
                  <strong>{validationResult.isValid ? "Valid" : "Needs attention"}</strong>
                  <small>Issue count: {validationResult.issues.length}</small>
                </article>
                <article className="operations-summary-card">
                  <span>Compiled payload</span>
                  <strong>{validationResult.compiledJson ? "Available" : "Empty"}</strong>
                  <small>Returned from backend validation.</small>
                </article>
                <article className="operations-summary-card">
                  <span>Published version</span>
                  <strong>{flowRecord.publishedVersion ? `v${flowRecord.publishedVersion.versionNo}` : "None"}</strong>
                  <small>{flowRecord.template.publishedVersionId || "No published version id yet."}</small>
                </article>
                <article className="operations-summary-card">
                  <span>Draft version</span>
                  <strong>{flowRecord.draftVersion ? `v${flowRecord.draftVersion.versionNo}` : "None"}</strong>
                  <small>{flowRecord.draftVersion?.id || "No draft version id."}</small>
                </article>
              </section>

              {validationResult.issues.length > 0 ? (
                <div className="table-card catalog-table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Message</th>
                          <th>Node</th>
                          <th>Edge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.issues.map((issue, index) => (
                          <tr key={`${issue.code}-${issue.nodeId}-${issue.edgeId}-${index}`}>
                            <td>{issue.code}</td>
                            <td>{issue.message}</td>
                            <td>{issue.nodeId || "—"}</td>
                            <td>{issue.edgeId || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="success-banner">
                  Draft validation returned no issues for the current template version.
                </div>
              )}

              <div className="approval-flow-code-card">
                <div className="approval-flow-code-head">
                  <strong>Compiled JSON</strong>
                  <span>Latest validation output</span>
                </div>
                <pre className="code-block">{validationResult.compiledJson || "{}"}</pre>
              </div>
            </>
          ) : (
            <div className="empty-state">No draft version is available to validate yet.</div>
          )}
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Version comparison</p>
              <h2 className="panel-title">Draft vs published comparison</h2>
              <p className="panel-subtitle">
                Compare the editable draft against the current published graph. This stays within
                the loaded template record and does not require backend changes.
              </p>
            </div>
          </div>

          {flowRecord.draftVersion || flowRecord.publishedVersion ? (
            <>
              <section className="operations-summary-strip">
                <article className="operations-summary-card">
                  <span>Draft version</span>
                  <strong>{flowRecord.draftVersion ? `v${flowRecord.draftVersion.versionNo}` : "None"}</strong>
                  <small>{flowRecord.draftVersion?.id || "No draft version id."}</small>
                </article>
                <article className="operations-summary-card">
                  <span>Published version</span>
                  <strong>{flowRecord.publishedVersion ? `v${flowRecord.publishedVersion.versionNo}` : "None"}</strong>
                  <small>{flowRecord.publishedVersion?.id || "No published version id."}</small>
                </article>
                <article className="operations-summary-card">
                  <span>Node delta</span>
                  <strong>
                    {graphComparison.nodeDelta > 0
                      ? `+${graphComparison.nodeDelta}`
                      : String(graphComparison.nodeDelta)}
                  </strong>
                  <small>
                    {graphComparison.draft.nodeCount} draft nodes vs {graphComparison.published.nodeCount} published nodes
                  </small>
                </article>
                <article className="operations-summary-card">
                  <span>Edge delta</span>
                  <strong>
                    {graphComparison.edgeDelta > 0
                      ? `+${graphComparison.edgeDelta}`
                      : String(graphComparison.edgeDelta)}
                  </strong>
                  <small>
                    {graphComparison.draft.edgeCount} draft edges vs {graphComparison.published.edgeCount} published edges
                  </small>
                </article>
              </section>

              <div className="table-card catalog-table-card">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Snapshot</th>
                        <th>Version</th>
                        <th>Nodes</th>
                        <th>Edges</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Draft</td>
                        <td>{flowRecord.draftVersion ? `v${flowRecord.draftVersion.versionNo}` : "None"}</td>
                        <td>{graphComparison.draft.nodeCount}</td>
                        <td>{graphComparison.draft.edgeCount}</td>
                        <td>
                          {graphComparison.draftOnlyNodeIds.length || graphComparison.draftOnlyEdgeIds.length
                            ? `${graphComparison.draftOnlyNodeIds.length} draft-only nodes, ${graphComparison.draftOnlyEdgeIds.length} draft-only edges`
                            : "No structural differences from published"}
                        </td>
                      </tr>
                      <tr>
                        <td>Published</td>
                        <td>
                          {flowRecord.publishedVersion ? `v${flowRecord.publishedVersion.versionNo}` : "None"}
                        </td>
                        <td>{graphComparison.published.nodeCount}</td>
                        <td>{graphComparison.published.edgeCount}</td>
                        <td>
                          {graphComparison.publishedOnlyNodeIds.length || graphComparison.publishedOnlyEdgeIds.length
                            ? `${graphComparison.publishedOnlyNodeIds.length} published-only nodes, ${graphComparison.publishedOnlyEdgeIds.length} published-only edges`
                            : "No structural differences from draft"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {graphComparison.hasChanges ? (
                <div className="status-banner">
                  Draft and published graphs differ structurally. Review the node and edge counts
                  before publishing.
                </div>
              ) : (
                <div className="success-banner">
                  Draft and published graphs are structurally aligned.
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">No version data is available yet for this template.</div>
          )}
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Runtime preflight</p>
              <h2 className="panel-title">Simulation workspace</h2>
              <p className="panel-subtitle">
                Validation checks graph structure. Simulation checks how the current template routes
                a requester through runtime steps and approver resolution.
              </p>
            </div>
          </div>

          <form method="get" action={buildApprovalFlowDetailPath(templateId)} className="field-grid">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="simulate" value="true" />

            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <p className="eyebrow">Requester context</p>
                  <h3 className="form-section-title">Who is entering the flow</h3>
                </div>
                <p className="form-section-copy">
                  Simulation currently runs against the saved template version, preferring the draft
                  when one exists.
                </p>
              </div>

              <div className="plan-form-grid">
                <div className="field">
                  <label htmlFor="simulationRequesterId">Requester user ID</label>
                  <input
                    id="simulationRequesterId"
                    name="simulationRequesterId"
                    type="text"
                    defaultValue={simulationForm.requesterId}
                    placeholder="admin_user_1"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="simulationRequesterEmployeeId">Requester employee ID</label>
                  <input
                    id="simulationRequesterEmployeeId"
                    name="simulationRequesterEmployeeId"
                    type="text"
                    defaultValue={simulationForm.requesterEmployeeId}
                    placeholder="employee_123"
                  />
                </div>
                <div className="field field-span-2">
                  <label htmlFor="simulationFieldsJson">Runtime fields JSON</label>
                  <textarea
                    id="simulationFieldsJson"
                    name="simulationFieldsJson"
                    rows={10}
                    defaultValue={simulationForm.fieldsJson}
                    className="code-input"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>
            </section>

            <div className="form-action-row">
              <button type="submit" className="button-primary">
                Run simulation
              </button>
            </div>
          </form>

          {simulationError ? <div className="status-banner">{simulationError}</div> : null}

          {simulationResult ? (
            <>
              <section className="operations-summary-strip">
                <article className="operations-summary-card">
                  <span>Matched binding</span>
                  <strong>{matchedSimulationBinding?.name ?? "Direct template simulation"}</strong>
                  <small>{simulationResult.matchedBindingId || "No binding id returned."}</small>
                </article>
                <article className="operations-summary-card">
                  <span>Version</span>
                  <strong>{simulationResult.versionId || "Unavailable"}</strong>
                  <small>{simulationResult.templateId || flowRecord.template.id}</small>
                </article>
                <article className="operations-summary-card">
                  <span>Visited nodes</span>
                  <strong>{simulationResult.visitedNodeIds.length}</strong>
                  <small>Nodes traversed during simulation.</small>
                </article>
                <article className="operations-summary-card">
                  <span>Approval steps</span>
                  <strong>{simulationResult.steps.length}</strong>
                  <small>{simulationResult.issues.length} issues returned.</small>
                </article>
              </section>

              {simulationResult.steps.length > 0 ? (
                <div className="table-card catalog-table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Step</th>
                          <th>Node</th>
                          <th>Execution mode</th>
                          <th>Approver IDs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulationResult.steps.map((step) => (
                          <tr key={`${step.nodeId}-${step.stepNo}`}>
                            <td>{step.stepNo}</td>
                            <td>{step.nodeId}</td>
                            <td>{formatExecutionMode(step.executionMode)}</td>
                            <td>{step.approverIds.join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No approval steps were produced by the current simulation.</div>
              )}

              <div className="approval-flow-code-card">
                <div className="approval-flow-code-head">
                  <strong>Visited node IDs</strong>
                  <span>Traversal order returned by the simulation result</span>
                </div>
                <pre className="code-block">
                  {simulationResult.visitedNodeIds.length > 0
                    ? simulationResult.visitedNodeIds.join("\n")
                    : "No node traversal was returned."}
                </pre>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Run a simulation to inspect runtime routing, version usage, and approver resolution
              for this template.
            </div>
          )}
        </section>

        <section className="record-layout record-layout-wide">
          <section className="panel form-shell form-shell-prominent">
            <div className="panel-head form-shell-head">
              <div>
                <p className="eyebrow">Binding manager</p>
                <h2 className="panel-title">Create or update bindings</h2>
                <p className="panel-subtitle">
                  Bindings point runtime requests at a template and decide which version becomes the
                  default path for a target type.
                </p>
              </div>
            </div>

            {bindingsError ? <div className="status-banner">{bindingsError}</div> : null}

            <form action={upsertApprovalFlowBindingAction} className="field-grid">
              <input type="hidden" name="templateId" value={flowRecord.template.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="targetType" value={flowRecord.template.targetType} />

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Binding identity</p>
                    <h3 className="form-section-title">Select or create</h3>
                  </div>
                  <p className="form-section-copy">
                    Choose an existing binding to update, or use the load links below to pull an
                    existing row into the editor with its current values.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="bindingId">Binding</label>
                    <select id="bindingId" name="bindingId" defaultValue={bindingForm.bindingId}>
                      <option value="">Create new binding</option>
                      {bindingRows.map((binding) => (
                        <option key={binding.id} value={binding.id}>
                          {binding.name} · priority {binding.priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="bindingName">Binding name</label>
                    <input
                      id="bindingName"
                      name="name"
                      type="text"
                      defaultValue={bindingForm.name}
                      placeholder="Leave default binding"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Runtime behavior</p>
                    <h3 className="form-section-title">Priority and defaulting</h3>
                  </div>
                  <p className="form-section-copy">
                    Priority decides evaluation order. Default bindings give the runtime a safe
                    fallback when no conditions match.
                  </p>
                </div>

                <div className="plan-form-grid">
                  <div className="field">
                    <label htmlFor="priority">Priority</label>
                    <input
                      id="priority"
                      name="priority"
                      type="number"
                      min={0}
                      defaultValue={bindingForm.priority}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="targetTypeLabel">Target type</label>
                    <input
                      id="targetTypeLabel"
                      type="text"
                      value={formatApprovalFlowTargetType(flowRecord.template.targetType)}
                      disabled
                      readOnly
                    />
                  </div>

                  <label className="checkbox-field checkbox-field-inline">
                    <input type="checkbox" name="isDefault" defaultChecked={bindingForm.isDefault} />
                    <span>Use this binding as the default for the target type.</span>
                  </label>

                  <label className="checkbox-field checkbox-field-inline">
                    <input type="checkbox" name="isActive" defaultChecked={bindingForm.isActive} />
                    <span>Keep this binding active for runtime resolution.</span>
                  </label>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <div>
                    <p className="eyebrow">Conditions</p>
                    <h3 className="form-section-title">Binding conditions JSON</h3>
                  </div>
                  <p className="form-section-copy">
                    Leave this empty for a broad binding, or store a JSON condition set for more
                    selective matching.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="conditionsJson">Conditions JSON</label>
                  <textarea
                    id="conditionsJson"
                    name="conditionsJson"
                    rows={8}
                    defaultValue={bindingForm.conditionsJson}
                    className="code-input"
                    spellCheck={false}
                    placeholder='{"departmentCode":"FINANCE"}'
                  />
                </div>
              </section>

              <div className="form-action-row">
                <button type="submit" className="button-primary">
                  {bindingForm.bindingId ? "Save binding changes" : "Create binding"}
                </button>
              </div>
            </form>
          </section>

          <aside className="record-sidebar">
            <section className="panel insight-panel">
              <p className="eyebrow">Binding summary</p>
              <h3 className="insight-title">
                {bindingForm.bindingId ? "Editing existing binding" : "Creating new binding"}
              </h3>
              <div className="record-preview-stack">
                <div className="record-preview-row">
                  <span>Total bindings</span>
                  <strong>{bindingRows.length}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Active</span>
                  <strong>{activeBindings}</strong>
                </div>
                <div className="record-preview-row">
                  <span>Default</span>
                  <strong>{defaultBindings}</strong>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section className="panel catalog-panel">
          <div className="panel-head catalog-head">
            <div>
              <p className="eyebrow">Binding list</p>
              <h2 className="panel-title">Bindings for this template</h2>
              <p className="panel-subtitle">
                These rows are already filtered to the current template ID from the active tenant.
              </p>
            </div>
          </div>

          {bindingRows.length > 0 ? (
            <div className="table-card catalog-table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Priority</th>
                      <th>Default</th>
                      <th>Status</th>
                      <th>Version</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bindingRows.map((binding) => (
                      <tr key={binding.id}>
                        <td>
                          <strong>{binding.name}</strong>
                          <span className="cell-meta">{binding.id}</span>
                        </td>
                        <td>{binding.priority}</td>
                        <td>{binding.isDefault ? "Yes" : "No"}</td>
                        <td>
                          <span className={binding.isActive ? "status-chip is-active" : "status-chip is-suspended"}>
                            {binding.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{binding.versionId || "Uses template published version"}</td>
                        <td>
                          <div className="action-row">
                            <Link
                              href={buildApprovalFlowDetailPath(templateId, {
                                returnTo,
                                bindingId: binding.id,
                                bindingName: binding.name,
                                bindingPriority: String(binding.priority),
                                bindingIsDefault: binding.isDefault ? "true" : "false",
                                bindingIsActive: binding.isActive ? "true" : "false",
                                bindingConditionsJson: binding.conditionsJson,
                                simulate: simulationForm.shouldRun ? "true" : undefined,
                                simulationRequesterId: simulationForm.requesterId,
                                simulationRequesterEmployeeId:
                                  simulationForm.requesterEmployeeId,
                                simulationFieldsJson: simulationForm.fieldsJson
                              })}
                              className="button-secondary compact"
                            >
                              Load into editor
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              No bindings currently point at this template. Create one to make the flow available
              to runtime selection.
            </div>
          )}
        </section>
      </section>
    </AdminShell>
  );
}
