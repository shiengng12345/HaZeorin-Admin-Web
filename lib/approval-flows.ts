import type {
  ApprovalFlowTargetType,
  ApprovalFlowTemplateStatus
} from "@/lib/grpc/approvalflow-client";

export const APPROVAL_FLOW_TARGET_OPTIONS = [
  "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
  "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
  "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
  "APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE"
] as const satisfies readonly ApprovalFlowTargetType[];

type ConfigurableApprovalFlowTargetType = (typeof APPROVAL_FLOW_TARGET_OPTIONS)[number];

export type ApprovalFlowTargetFilter = "" | ConfigurableApprovalFlowTargetType;

export type ApprovalFlowListState = {
  page: number;
  limit: number;
  search: string;
  targetType: ApprovalFlowTargetFilter;
  includeArchived: boolean;
};

export type ApprovalFlowFormState = {
  code: string;
  name: string;
  description: string;
  targetType: ApprovalFlowTargetType;
  graphJson: string;
};

export type ApprovalFlowBindingFormState = {
  bindingId: string;
  name: string;
  priority: string;
  isDefault: boolean;
  isActive: boolean;
  conditionsJson: string;
};

export type ApprovalFlowSimulationFormState = {
  shouldRun: boolean;
  requesterId: string;
  requesterEmployeeId: string;
  fieldsJson: string;
};

export const DEFAULT_APPROVAL_FLOW_GRAPH_JSON = JSON.stringify(
  {
    nodes: [
      {
        id: "start",
        kind: "START",
        label: "Start",
        config: {}
      },
      {
        id: "managerApproval",
        kind: "APPROVER_MANAGER",
        label: "Manager Approval",
        config: {
          executionMode: "ALL_APPROVE"
        }
      },
      {
        id: "end",
        kind: "END",
        label: "End",
        config: {}
      }
    ],
    edges: [
      {
        id: "e1",
        sourceNodeId: "start",
        targetNodeId: "managerApproval",
        priority: 1
      },
      {
        id: "e2",
        sourceNodeId: "managerApproval",
        targetNodeId: "end",
        priority: 1
      }
    ]
  },
  null,
  2
);

export const DEFAULT_APPROVAL_FLOW_LIST_STATE: ApprovalFlowListState = {
  page: 1,
  limit: 10,
  search: "",
  targetType: "",
  includeArchived: false
};

export const DEFAULT_APPROVAL_FLOW_FORM_STATE: ApprovalFlowFormState = {
  code: "",
  name: "",
  description: "",
  targetType: "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
  graphJson: DEFAULT_APPROVAL_FLOW_GRAPH_JSON
};

export const DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE: ApprovalFlowBindingFormState = {
  bindingId: "",
  name: "",
  priority: "1",
  isDefault: false,
  isActive: true,
  conditionsJson: ""
};

export const DEFAULT_APPROVAL_FLOW_SIMULATION_FORM_STATE: ApprovalFlowSimulationFormState = {
  shouldRun: false,
  requesterId: "",
  requesterEmployeeId: "",
  fieldsJson: defaultApprovalFlowSimulationFieldsJson(
    "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST"
  )
};

export function parseApprovalFlowListState(
  params: Record<string, string | string[] | undefined>
): ApprovalFlowListState {
  const rawTargetType = singleValue(params.targetType);

  return {
    page: parsePositiveInt(singleValue(params.page), DEFAULT_APPROVAL_FLOW_LIST_STATE.page),
    limit: parseLimit(singleValue(params.limit), DEFAULT_APPROVAL_FLOW_LIST_STATE.limit),
    search: singleValue(params.search)?.trim() ?? "",
    targetType: isApprovalFlowTargetType(rawTargetType)
      ? rawTargetType
      : DEFAULT_APPROVAL_FLOW_LIST_STATE.targetType,
    includeArchived: singleValue(params.includeArchived) === "true"
  };
}

export function buildApprovalFlowsPath(
  state: Partial<ApprovalFlowListState> & {
    error?: string;
    message?: string;
  } = {}
) {
  const merged = {
    ...DEFAULT_APPROVAL_FLOW_LIST_STATE,
    ...state
  };
  const search = new URLSearchParams();

  if (merged.page !== DEFAULT_APPROVAL_FLOW_LIST_STATE.page) {
    search.set("page", String(merged.page));
  }
  if (merged.limit !== DEFAULT_APPROVAL_FLOW_LIST_STATE.limit) {
    search.set("limit", String(merged.limit));
  }
  if (merged.search) {
    search.set("search", merged.search);
  }
  if (merged.targetType) {
    search.set("targetType", merged.targetType);
  }
  if (merged.includeArchived) {
    search.set("includeArchived", "true");
  }
  if (state.error) {
    search.set("error", state.error);
  }
  if (state.message) {
    search.set("message", state.message);
  }

  const query = search.toString();
  return query ? `/approval-flows?${query}` : "/approval-flows";
}

export function sanitizeApprovalFlowReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/approval-flows";
  }

  if (value === "/approval-flows" || value.startsWith("/approval-flows?")) {
    return value;
  }

  return "/approval-flows";
}

export function buildApprovalFlowDetailPath(
  templateId: string,
  input: {
    error?: string;
    message?: string;
    returnTo?: string;
    name?: string;
    description?: string;
    graphJson?: string;
    bindingId?: string;
    bindingName?: string;
    bindingPriority?: string;
    bindingIsDefault?: string;
    bindingIsActive?: string;
    bindingConditionsJson?: string;
    simulate?: string;
    simulationRequesterId?: string;
    simulationRequesterEmployeeId?: string;
    simulationFieldsJson?: string;
  } = {}
) {
  const search = new URLSearchParams();

  if (input.error) {
    search.set("error", input.error);
  }
  if (input.message) {
    search.set("message", input.message);
  }
  if (input.returnTo) {
    search.set("returnTo", sanitizeApprovalFlowReturnPath(input.returnTo));
  }
  if (input.name) {
    search.set("name", input.name);
  }
  if (input.description) {
    search.set("description", input.description);
  }
  if (input.graphJson) {
    search.set("graphJson", input.graphJson);
  }
  if (input.bindingId) {
    search.set("bindingId", input.bindingId);
  }
  if (input.bindingName) {
    search.set("bindingName", input.bindingName);
  }
  if (input.bindingPriority) {
    search.set("bindingPriority", input.bindingPriority);
  }
  if (input.bindingIsDefault) {
    search.set("bindingIsDefault", input.bindingIsDefault);
  }
  if (input.bindingIsActive) {
    search.set("bindingIsActive", input.bindingIsActive);
  }
  if (input.bindingConditionsJson) {
    search.set("bindingConditionsJson", input.bindingConditionsJson);
  }
  if (input.simulate) {
    search.set("simulate", input.simulate);
  }
  if (input.simulationRequesterId) {
    search.set("simulationRequesterId", input.simulationRequesterId);
  }
  if (input.simulationRequesterEmployeeId) {
    search.set("simulationRequesterEmployeeId", input.simulationRequesterEmployeeId);
  }
  if (input.simulationFieldsJson) {
    search.set("simulationFieldsJson", input.simulationFieldsJson);
  }

  const query = search.toString();
  return query ? `/approval-flows/${templateId}?${query}` : `/approval-flows/${templateId}`;
}

export function buildNewApprovalFlowPath(
  input: Partial<ApprovalFlowFormState> & {
    error?: string;
  } = {}
) {
  const merged = {
    ...DEFAULT_APPROVAL_FLOW_FORM_STATE,
    ...input
  };
  const search = new URLSearchParams();

  if (input.error) {
    search.set("error", input.error);
  }
  if (merged.code) {
    search.set("code", merged.code);
  }
  if (merged.name) {
    search.set("name", merged.name);
  }
  if (merged.description) {
    search.set("description", merged.description);
  }
  if (merged.targetType !== DEFAULT_APPROVAL_FLOW_FORM_STATE.targetType) {
    search.set("targetType", merged.targetType);
  }
  if (merged.graphJson !== DEFAULT_APPROVAL_FLOW_FORM_STATE.graphJson) {
    search.set("graphJson", merged.graphJson);
  }

  const query = search.toString();
  return query ? `/approval-flows/new?${query}` : "/approval-flows/new";
}

export function readApprovalFlowFormState(
  params: Record<string, string | string[] | undefined>,
  fallback: Partial<ApprovalFlowFormState> = {}
): ApprovalFlowFormState {
  const rawTargetType = singleValue(params.targetType);

  return {
    code: singleValue(params.code) ?? fallback.code ?? DEFAULT_APPROVAL_FLOW_FORM_STATE.code,
    name: singleValue(params.name) ?? fallback.name ?? DEFAULT_APPROVAL_FLOW_FORM_STATE.name,
    description:
      singleValue(params.description) ??
      fallback.description ??
      DEFAULT_APPROVAL_FLOW_FORM_STATE.description,
    targetType: isApprovalFlowTargetType(rawTargetType)
      ? rawTargetType
      : fallback.targetType ?? DEFAULT_APPROVAL_FLOW_FORM_STATE.targetType,
    graphJson:
      singleValue(params.graphJson) ??
      fallback.graphJson ??
      DEFAULT_APPROVAL_FLOW_FORM_STATE.graphJson
  };
}

export function readApprovalFlowBindingFormState(
  params: Record<string, string | string[] | undefined>,
  fallback: Partial<ApprovalFlowBindingFormState> = {}
): ApprovalFlowBindingFormState {
  return {
    bindingId:
      singleValue(params.bindingId) ??
      fallback.bindingId ??
      DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE.bindingId,
    name:
      singleValue(params.bindingName) ??
      fallback.name ??
      DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE.name,
    priority:
      singleValue(params.bindingPriority) ??
      fallback.priority ??
      DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE.priority,
    isDefault:
      parseBooleanValue(singleValue(params.bindingIsDefault)) ??
      fallback.isDefault ??
      DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE.isDefault,
    isActive:
      parseBooleanValue(singleValue(params.bindingIsActive)) ??
      fallback.isActive ??
      DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE.isActive,
    conditionsJson:
      singleValue(params.bindingConditionsJson) ??
      fallback.conditionsJson ??
      DEFAULT_APPROVAL_FLOW_BINDING_FORM_STATE.conditionsJson
  };
}

export function defaultApprovalFlowSimulationFieldsJson(targetType: ApprovalFlowTargetType) {
  switch (targetType) {
    case "APPROVAL_FLOW_TARGET_TYPE_CLAIM":
      return JSON.stringify(
        {
          targetType: "claim",
          country: "MY",
          categoryCode: "travel",
          amountCents: 12500
        },
        null,
        2
      );
    case "APPROVAL_FLOW_TARGET_TYPE_OVERTIME":
      return JSON.stringify(
        {
          targetType: "overtime",
          country: "MY",
          hours: 3,
          site: "KL"
        },
        null,
        2
      );
    case "APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE":
      return JSON.stringify(
        {
          targetType: "employee_change",
          country: "MY",
          changeType: "manager_change",
          departmentCode: "OPS"
        },
        null,
        2
      );
    case "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST":
    default:
      return JSON.stringify(
        {
          targetType: "leave_request",
          country: "MY",
          leaveTypeCode: "annual",
          durationDays: 2
        },
        null,
        2
      );
  }
}

export function readApprovalFlowSimulationFormState(
  params: Record<string, string | string[] | undefined>,
  fallback: Partial<ApprovalFlowSimulationFormState> = {}
): ApprovalFlowSimulationFormState {
  return {
    shouldRun:
      parseBooleanValue(singleValue(params.simulate)) ??
      fallback.shouldRun ??
      DEFAULT_APPROVAL_FLOW_SIMULATION_FORM_STATE.shouldRun,
    requesterId:
      singleValue(params.simulationRequesterId) ??
      fallback.requesterId ??
      DEFAULT_APPROVAL_FLOW_SIMULATION_FORM_STATE.requesterId,
    requesterEmployeeId:
      singleValue(params.simulationRequesterEmployeeId) ??
      fallback.requesterEmployeeId ??
      DEFAULT_APPROVAL_FLOW_SIMULATION_FORM_STATE.requesterEmployeeId,
    fieldsJson:
      singleValue(params.simulationFieldsJson) ??
      fallback.fieldsJson ??
      DEFAULT_APPROVAL_FLOW_SIMULATION_FORM_STATE.fieldsJson
  };
}

export function formatApprovalFlowTargetType(value: ApprovalFlowTargetType | string) {
  switch (value) {
    case "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST":
      return "Leave request";
    case "APPROVAL_FLOW_TARGET_TYPE_CLAIM":
      return "Claim";
    case "APPROVAL_FLOW_TARGET_TYPE_OVERTIME":
      return "Overtime";
    case "APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE":
      return "Employee change";
    default:
      return "Unspecified";
  }
}

export function formatApprovalFlowTemplateStatus(
  value: ApprovalFlowTemplateStatus | string
) {
  switch (value) {
    case "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT":
      return "Draft";
    case "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED":
      return "Published";
    case "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED":
      return "Archived";
    default:
      return "Unspecified";
  }
}

export function summarizeApprovalFlowGraph(graphJson: string) {
  try {
    const parsed = JSON.parse(graphJson) as {
      nodes?: unknown[];
      edges?: unknown[];
    };

    return {
      nodeCount: Array.isArray(parsed.nodes) ? parsed.nodes.length : 0,
      edgeCount: Array.isArray(parsed.edges) ? parsed.edges.length : 0
    };
  } catch {
    return {
      nodeCount: 0,
      edgeCount: 0
    };
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(value: string | undefined, fallback: number) {
  const parsed = parsePositiveInt(value, fallback);
  return [10, 20, 50].includes(parsed) ? parsed : fallback;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isApprovalFlowTargetType(
  value: string | undefined
): value is ConfigurableApprovalFlowTargetType {
  return APPROVAL_FLOW_TARGET_OPTIONS.includes(value as ConfigurableApprovalFlowTargetType);
}

function parseBooleanValue(value: string | undefined) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  return undefined;
}
