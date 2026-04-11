import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApprovalFlowDetailPath,
  defaultApprovalFlowSimulationFieldsJson,
  readApprovalFlowSimulationFormState
} from "../lib/approval-flows";
import {
  fixtureLogin,
  fixtureSimulateApprovalFlow
} from "../lib/e2e-fixtures";

test("approval flow simulation helpers preserve state in detail paths", () => {
  const path = buildApprovalFlowDetailPath("flow_claim_ops", {
    returnTo: "/approval-flows",
    simulate: "true",
    simulationRequesterId: "admin_user_1",
    simulationRequesterEmployeeId: "employee_123",
    simulationFieldsJson: JSON.stringify({ country: "MY", managerId: "mgr_ops_1" })
  });

  assert.match(path, /\/approval-flows\/flow_claim_ops\?/);
  assert.match(path, /simulate=true/);
  assert.match(path, /simulationRequesterId=admin_user_1/);
  assert.match(path, /simulationRequesterEmployeeId=employee_123/);
  assert.match(path, /simulationFieldsJson=/);

  const state = readApprovalFlowSimulationFormState({
    simulate: "true",
    simulationRequesterId: "admin_user_1",
    simulationRequesterEmployeeId: "employee_123",
    simulationFieldsJson: JSON.stringify({ country: "MY", managerId: "mgr_ops_1" })
  });

  assert.equal(state.shouldRun, true);
  assert.equal(state.requesterId, "admin_user_1");
  assert.equal(state.requesterEmployeeId, "employee_123");
  assert.equal(
    state.fieldsJson,
    JSON.stringify({ country: "MY", managerId: "mgr_ops_1" })
  );

  const defaultFields = JSON.parse(
    defaultApprovalFlowSimulationFieldsJson("APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST")
  ) as Record<string, unknown>;

  assert.equal(defaultFields.targetType, "leave_request");
  assert.equal(defaultFields.durationDays, 2);
});

test("fixture approval flow simulation resolves approvers from runtime fields", async () => {
  const session = await fixtureLogin({
    email: "platform.admin@hazeorin.test",
    password: "Passw0rd!",
    tenantId: "tenant_malaysia_ops"
  });

  const simulation = await fixtureSimulateApprovalFlow(session, {
    tenantId: session.tenantId,
    templateId: "flow_claim_ops",
    requesterId: session.userId,
    requesterEmployeeId: "employee_ops_001",
    fieldsJson: JSON.stringify({
      country: "MY",
      categoryCode: "travel",
      amountCents: 12500,
      managerId: "mgr_ops_1"
    })
  });

  assert.equal(simulation.templateId, "flow_claim_ops");
  assert.equal(simulation.versionId, "flow_claim_v3");
  assert.deepEqual(simulation.visitedNodeIds, ["start", "manager_approval", "end"]);
  assert.equal(simulation.steps.length, 1);
  assert.equal(simulation.steps[0]?.nodeId, "manager_approval");
  assert.equal(simulation.steps[0]?.executionMode, "APPROVAL_NODE_EXECUTION_MODE_ALL_APPROVE");
  assert.deepEqual(simulation.steps[0]?.approverIds, ["mgr_ops_1"]);
  assert.equal(simulation.issues.length, 0);
});
