type FixtureSession = {
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

type FixtureMembership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  role: string;
};

type ApprovalFlowTargetType =
  | "APPROVAL_FLOW_TARGET_TYPE_UNSPECIFIED"
  | "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST"
  | "APPROVAL_FLOW_TARGET_TYPE_CLAIM"
  | "APPROVAL_FLOW_TARGET_TYPE_OVERTIME"
  | "APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE";

type ApprovalFlowTemplateStatus =
  | "APPROVAL_FLOW_TEMPLATE_STATUS_UNSPECIFIED"
  | "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT"
  | "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED"
  | "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED";

type ApprovalNodeExecutionMode =
  | "APPROVAL_NODE_EXECUTION_MODE_UNSPECIFIED"
  | "APPROVAL_NODE_EXECUTION_MODE_ALL_APPROVE"
  | "APPROVAL_NODE_EXECUTION_MODE_ANY_ONE_APPROVE";

type FixtureApprovalFlowTemplate = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string;
  targetType: ApprovalFlowTargetType;
  status: ApprovalFlowTemplateStatus;
  latestVersionNo: number;
  publishedVersionId: string;
};

type FixtureApprovalFlowVersion = {
  id: string;
  templateId: string;
  versionNo: number;
  isPublished: boolean;
  graphJson: string;
  compiledJson: string;
};

type FixtureApprovalFlowBinding = {
  id: string;
  tenantId: string;
  name: string;
  targetType: ApprovalFlowTargetType;
  templateId: string;
  versionId: string;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  conditionsJson: string;
};

type FixtureApprovalFlowValidationIssue = {
  code: string;
  message: string;
  nodeId: string;
  edgeId: string;
};

type FixtureOverview = {
  totalDepartments: number;
  activeDepartments: number;
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  inactiveEmployees: number;
  pendingLeaveRequests: number;
  approvedLeaveRequests: number;
  rejectedLeaveRequests: number;
  pendingClaimRequests: number;
  approvedClaimRequests: number;
  rejectedClaimRequests: number;
  pendingApprovals: number;
  departments: Array<{
    departmentId: string;
    code: string;
    name: string;
    employeeCount: number;
    coverageRatio: number;
  }>;
  managers: Array<{
    managerId: string;
    managerName: string;
    pendingApprovals: number;
    queueShare: number;
  }>;
  workforce: Array<{
    key: string;
    label: string;
    count: number;
    shareRatio: number;
    note: string;
  }>;
  queues: Array<{
    key: string;
    label: string;
    pending: number;
    approved: number;
    rejected: number;
  }>;
};

type FixtureApprovalAnalytics = {
  totalRequests: number;
  pendingRequests: number;
  activeAssignments: number;
  reassignedAssignments: number;
  averageResolutionHours: number;
  averageStepActionHours: number;
  pendingAges: Array<{
    key: string;
    label: string;
    pendingRequests: number;
  }>;
  targets: Array<{
    key: string;
    label: string;
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    reassignedRequests: number;
    skippedRequests: number;
  }>;
  executionModes: Array<{
    key: string;
    label: string;
    pendingAssignments: number;
    activeRequests: number;
    requiredApprovals: number;
    approvedProgress: number;
  }>;
};

type FixtureReportingWindow =
  | "REPORTING_WINDOW_UNSPECIFIED"
  | "REPORTING_WINDOW_ALL_TIME"
  | "REPORTING_WINDOW_LAST_7_DAYS"
  | "REPORTING_WINDOW_LAST_30_DAYS"
  | "REPORTING_WINDOW_LAST_90_DAYS";

type FixtureReportingSavedPreset = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  normalizedName: string;
  scopeSummary: string;
  window: FixtureReportingWindow;
  createdAt: string;
  updatedAt: string;
};

type FixturePlanInterval = "PLAN_INTERVAL_MONTHLY" | "PLAN_INTERVAL_YEARLY";

type FixturePlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: FixturePlanInterval;
  isActive: boolean;
};

type FixtureSubscriptionStatus =
  | "SUBSCRIPTION_STATUS_UNSPECIFIED"
  | "SUBSCRIPTION_STATUS_ACTIVE"
  | "SUBSCRIPTION_STATUS_CANCELLED";

type FixtureSubscription = {
  id: string;
  tenantId: string;
  planId: string;
  status: FixtureSubscriptionStatus;
  seatCount: number;
  startedAt: string;
  cancelledAt: string;
};

type FixtureState = {
  users: Array<{
    userId: string;
    email: string;
    password: string;
    memberships: FixtureMembership[];
  }>;
  plans: FixturePlan[];
  subscriptions: FixtureSubscription[];
  templates: FixtureApprovalFlowTemplate[];
  versions: FixtureApprovalFlowVersion[];
  bindings: FixtureApprovalFlowBinding[];
  reportingByTenant: Record<
    string,
    {
      overview: FixtureOverview;
      queueTrend: Array<{
        key: string;
        label: string;
        leaveRequests: number;
        claimRequests: number;
        approvalRequests: number;
        totalRequests: number;
      }>;
      approvalAnalytics: FixtureApprovalAnalytics;
    }
  >;
  reportingSavedPresets: FixtureReportingSavedPreset[];
  counters: {
    plan: number;
    subscription: number;
    template: number;
    version: number;
    binding: number;
  };
};

declare global {
  var __hazeorinAdminWebE2EState: FixtureState | undefined;
}

const USER_ID = "admin_user_1";
const TENANT_HQ = "tenant_platform_hq";
const TENANT_OPS = "tenant_malaysia_ops";

const BASE_GRAPH_JSON = JSON.stringify(
  {
    nodes: [
      { id: "start", type: "start" },
      {
        id: "manager_approval",
        type: "approval",
        executionMode: "APPROVAL_NODE_EXECUTION_MODE_ALL_APPROVE"
      },
      { id: "end", type: "end" }
    ],
    edges: [
      { id: "edge_start_manager", from: "start", to: "manager_approval" },
      { id: "edge_manager_end", from: "manager_approval", to: "end" }
    ]
  },
  null,
  2
);

function futureIso(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function fixedIso(value: string) {
  return new Date(value).toISOString();
}

function normalizeFixtureReportingName(value: string | undefined | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

function normalizeFixtureScopeSummary(value: string | undefined | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function buildSession(userId: string, tenantId: string): FixtureSession {
  return {
    userId,
    tenantId,
    accessToken: `fixture-admin-access:${userId}:${tenantId}`,
    refreshToken: `fixture-admin-refresh:${userId}:${tenantId}`,
    accessTokenExpiresAt: futureIso(12),
    refreshTokenExpiresAt: futureIso(24 * 14)
  };
}

function parseRefreshToken(refreshToken: string) {
  const [prefix, userId, tenantId] = refreshToken.split(":");

  if (prefix !== "fixture-admin-refresh" || !userId || !tenantId) {
    return null;
  }

  return { userId, tenantId };
}

function cloneGraphJson(graphJson: string) {
  return JSON.stringify(JSON.parse(graphJson), null, 2);
}

function initialState(): FixtureState {
  const leaveTemplateId = "flow_leave_default";
  const leaveDraftVersionId = "flow_leave_v1";
  const claimTemplateId = "flow_claim_ops";
  const claimDraftVersionId = "flow_claim_v1";
  const claimPublishedVersionId = "flow_claim_v2";

  return {
    users: [
      {
        userId: USER_ID,
        email: "platform.admin@hazeorin.test",
        password: "Passw0rd!",
        memberships: [
          {
            tenantId: TENANT_HQ,
            tenantName: "Platform HQ",
            tenantSlug: "platform-hq",
            tenantStatus: "TENANT_MEMBERSHIP_STATUS_ACTIVE",
            role: "TENANT_MEMBERSHIP_ROLE_OWNER"
          },
          {
            tenantId: TENANT_OPS,
            tenantName: "Malaysia Operations",
            tenantSlug: "malaysia-operations",
            tenantStatus: "TENANT_MEMBERSHIP_STATUS_ACTIVE",
            role: "TENANT_MEMBERSHIP_ROLE_ADMIN"
          }
        ]
      }
    ],
    plans: [
      {
        id: "plan_starter_monthly",
        code: "starter_monthly",
        name: "Starter Monthly",
        description: "Base monthly offering for new tenants.",
        priceCents: 9900,
        currency: "MYR",
        interval: "PLAN_INTERVAL_MONTHLY",
        isActive: true
      },
      {
        id: "plan_growth_yearly",
        code: "growth_yearly",
        name: "Growth Annual",
        description: "Annual package for established teams.",
        priceCents: 199900,
        currency: "MYR",
        interval: "PLAN_INTERVAL_YEARLY",
        isActive: true
      },
      {
        id: "plan_legacy_monthly",
        code: "legacy_monthly",
        name: "Legacy Monthly",
        description: "Retired package kept for history.",
        priceCents: 5900,
        currency: "MYR",
        interval: "PLAN_INTERVAL_MONTHLY",
        isActive: false
      }
    ],
    subscriptions: [
      {
        id: "subscription_hq_active",
        tenantId: TENANT_HQ,
        planId: "plan_growth_yearly",
        status: "SUBSCRIPTION_STATUS_ACTIVE",
        seatCount: 40,
        startedAt: fixedIso("2026-02-01T09:00:00+08:00"),
        cancelledAt: ""
      },
      {
        id: "subscription_ops_cancelled",
        tenantId: TENANT_OPS,
        planId: "plan_starter_monthly",
        status: "SUBSCRIPTION_STATUS_CANCELLED",
        seatCount: 12,
        startedAt: fixedIso("2026-01-10T09:00:00+08:00"),
        cancelledAt: fixedIso("2026-03-12T18:30:00+08:00")
      }
    ],
    templates: [
      {
        id: leaveTemplateId,
        tenantId: TENANT_HQ,
        code: "leave_manager_default",
        name: "Leave Manager Default",
        description: "Default manager approval for leave requests.",
        targetType: "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
        status: "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT",
        latestVersionNo: 1,
        publishedVersionId: ""
      },
      {
        id: claimTemplateId,
        tenantId: TENANT_OPS,
        code: "ops_claim_review",
        name: "Operations Claim Review",
        description: "Claim routing for Malaysia operations.",
        targetType: "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
        status: "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED",
        latestVersionNo: 2,
        publishedVersionId: claimPublishedVersionId
      }
    ],
    versions: [
      {
        id: leaveDraftVersionId,
        templateId: leaveTemplateId,
        versionNo: 1,
        isPublished: false,
        graphJson: BASE_GRAPH_JSON,
        compiledJson: cloneGraphJson(BASE_GRAPH_JSON)
      },
      {
        id: claimDraftVersionId,
        templateId: claimTemplateId,
        versionNo: 1,
        isPublished: false,
        graphJson: BASE_GRAPH_JSON,
        compiledJson: cloneGraphJson(BASE_GRAPH_JSON)
      },
      {
        id: claimPublishedVersionId,
        templateId: claimTemplateId,
        versionNo: 2,
        isPublished: true,
        graphJson: BASE_GRAPH_JSON,
        compiledJson: cloneGraphJson(BASE_GRAPH_JSON)
      }
    ],
    bindings: [
      {
        id: "binding_claim_default",
        tenantId: TENANT_OPS,
        name: "Malaysia claims default",
        targetType: "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
        templateId: claimTemplateId,
        versionId: claimPublishedVersionId,
        priority: 10,
        isDefault: true,
        isActive: true,
        conditionsJson: "{\"country\":\"MY\"}"
      }
    ],
    reportingByTenant: {
      [TENANT_HQ]: {
        overview: {
          totalDepartments: 3,
          activeDepartments: 3,
          totalEmployees: 18,
          activeEmployees: 17,
          probationEmployees: 1,
          inactiveEmployees: 1,
          pendingLeaveRequests: 2,
          approvedLeaveRequests: 7,
          rejectedLeaveRequests: 1,
          pendingClaimRequests: 1,
          approvedClaimRequests: 4,
          rejectedClaimRequests: 0,
          pendingApprovals: 3,
          departments: [
            {
              departmentId: "dept_hq_ops",
              code: "HQ-OPS",
              name: "HQ Operations",
              employeeCount: 10,
              coverageRatio: 100
            }
          ],
          managers: [
            {
              managerId: "mgr_hq_1",
              managerName: "Elaine Cruz",
              pendingApprovals: 3,
              queueShare: 100
            }
          ],
          workforce: [
            {
              key: "active",
              label: "Active",
              count: 17,
              shareRatio: 94.4,
              note: "HQ active workforce"
            }
          ],
          queues: [
            {
              key: "leave",
              label: "Leave",
              pending: 2,
              approved: 7,
              rejected: 1
            }
          ]
        },
        queueTrend: [
          {
            key: "2026-04",
            label: "Apr 2026",
            leaveRequests: 4,
            claimRequests: 2,
            approvalRequests: 5,
            totalRequests: 11
          }
        ],
        approvalAnalytics: {
          totalRequests: 11,
          pendingRequests: 3,
          activeAssignments: 3,
          reassignedAssignments: 1,
          averageResolutionHours: 6.5,
          averageStepActionHours: 2.1,
          pendingAges: [{ key: "lt_24h", label: "< 24h", pendingRequests: 2 }],
          targets: [
            {
              key: "leave_request",
              label: "Leave",
              totalRequests: 7,
              pendingRequests: 2,
              approvedRequests: 4,
              rejectedRequests: 1,
              reassignedRequests: 0,
              skippedRequests: 0
            }
          ],
          executionModes: [
            {
              key: "all_approve",
              label: "All approve",
              pendingAssignments: 3,
              activeRequests: 3,
              requiredApprovals: 3,
              approvedProgress: 0
            }
          ]
        }
      },
      [TENANT_OPS]: {
        overview: {
          totalDepartments: 2,
          activeDepartments: 2,
          totalEmployees: 9,
          activeEmployees: 8,
          probationEmployees: 1,
          inactiveEmployees: 1,
          pendingLeaveRequests: 1,
          approvedLeaveRequests: 3,
          rejectedLeaveRequests: 0,
          pendingClaimRequests: 3,
          approvedClaimRequests: 2,
          rejectedClaimRequests: 1,
          pendingApprovals: 4,
          departments: [
            {
              departmentId: "dept_kl_ops",
              code: "KL-OPS",
              name: "KL Operations",
              employeeCount: 5,
              coverageRatio: 100
            }
          ],
          managers: [
            {
              managerId: "mgr_ops_1",
              managerName: "Morgan Tan",
              pendingApprovals: 4,
              queueShare: 100
            }
          ],
          workforce: [
            {
              key: "active",
              label: "Active",
              count: 8,
              shareRatio: 88.9,
              note: "Malaysia active workforce"
            }
          ],
          queues: [
            {
              key: "claim",
              label: "Claim",
              pending: 3,
              approved: 2,
              rejected: 1
            }
          ]
        },
        queueTrend: [
          {
            key: "2026-04",
            label: "Apr 2026",
            leaveRequests: 1,
            claimRequests: 4,
            approvalRequests: 4,
            totalRequests: 9
          }
        ],
        approvalAnalytics: {
          totalRequests: 9,
          pendingRequests: 4,
          activeAssignments: 4,
          reassignedAssignments: 0,
          averageResolutionHours: 3.8,
          averageStepActionHours: 1.4,
          pendingAges: [{ key: "lt_24h", label: "< 24h", pendingRequests: 4 }],
          targets: [
            {
              key: "claim",
              label: "Claim",
              totalRequests: 6,
              pendingRequests: 3,
              approvedRequests: 2,
              rejectedRequests: 1,
              reassignedRequests: 0,
              skippedRequests: 0
            }
          ],
          executionModes: [
            {
              key: "all_approve",
              label: "All approve",
              pendingAssignments: 4,
              activeRequests: 4,
              requiredApprovals: 4,
              approvedProgress: 0
            }
          ]
        }
      }
    },
    reportingSavedPresets: [],
    counters: {
      plan: 4,
      subscription: 2,
      template: 3,
      version: 3,
      binding: 2
    }
  };
}

export function isE2EFixtureMode() {
  return process.env.HAZEORIN_E2E_FIXTURE_MODE === "1";
}

function state() {
  if (!globalThis.__hazeorinAdminWebE2EState) {
    globalThis.__hazeorinAdminWebE2EState = initialState();
  }

  return globalThis.__hazeorinAdminWebE2EState;
}

function paginate<T>(list: T[], page: number, limit: number) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
  const start = (safePage - 1) * safeLimit;

  return {
    list: list.slice(start, start + safeLimit),
    pagination: {
      total: list.length,
      totalPage: list.length === 0 ? 0 : Math.ceil(list.length / safeLimit),
      page: safePage,
      limit: safeLimit
    }
  };
}

function nextTemplateId() {
  const id = `flow_fixture_${state().counters.template}`;
  state().counters.template += 1;
  return id;
}

function nextPlanId() {
  const id = `plan_fixture_${state().counters.plan}`;
  state().counters.plan += 1;
  return id;
}

function nextSubscriptionId() {
  const id = `subscription_fixture_${state().counters.subscription}`;
  state().counters.subscription += 1;
  return id;
}

function nextVersionId() {
  const id = `flow_fixture_v${state().counters.version}`;
  state().counters.version += 1;
  return id;
}

function nextBindingId() {
  const id = `binding_fixture_${state().counters.binding}`;
  state().counters.binding += 1;
  return id;
}

function requireUserByEmail(email: string, password: string) {
  const user = state().users.find(
    (entry) =>
      entry.email.toLowerCase() === email.trim().toLowerCase() &&
      entry.password === password
  );

  if (!user) {
    throw new Error("Invalid fixture credentials.");
  }

  return user;
}

function requireMembership(userId: string, tenantId: string) {
  const user = state().users.find((entry) => entry.userId === userId);
  const membership = user?.memberships.find((entry) => entry.tenantId === tenantId);

  if (!user || !membership) {
    throw new Error("Fixture membership not found.");
  }

  return membership;
}

function requireTemplateForTenant(session: FixtureSession, templateId: string) {
  const template =
    state().templates.find(
      (entry) => entry.id === templateId.trim() && entry.tenantId === session.tenantId
    ) ?? null;

  if (!template) {
    throw new Error("Fixture approval flow not found.");
  }

  return template;
}

function requirePlan(planId: string) {
  const plan = state().plans.find((entry) => entry.id === planId.trim()) ?? null;

  if (!plan) {
    throw new Error("Fixture plan not found.");
  }

  return plan;
}

function requireSubscriptionForTenant(session: FixtureSession, subscriptionId: string) {
  const subscription =
    state().subscriptions.find(
      (entry) => entry.id === subscriptionId.trim() && entry.tenantId === session.tenantId
    ) ?? null;

  if (!subscription) {
    throw new Error("Fixture subscription not found.");
  }

  return subscription;
}

function findDraftVersion(templateId: string) {
  return (
    state().versions.find(
      (entry) => entry.templateId === templateId && entry.isPublished === false
    ) ?? null
  );
}

function findPublishedVersion(templateId: string) {
  return (
    state().versions.find(
      (entry) => entry.templateId === templateId && entry.isPublished === true
    ) ?? null
  );
}

function filterTemplates(
  session: FixtureSession,
  input: {
    search?: string;
    targetType?: ApprovalFlowTargetType;
    includeArchived?: boolean;
  }
) {
  const search = input.search?.trim().toLowerCase() ?? "";

  return state().templates
    .filter((template) => template.tenantId === session.tenantId)
    .filter(
      (template) =>
        input.includeArchived ? true : template.status !== "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED"
    )
    .filter(
      (template) =>
        !input.targetType ||
        input.targetType === "APPROVAL_FLOW_TARGET_TYPE_UNSPECIFIED" ||
        template.targetType === input.targetType
    )
    .filter((template) => {
      if (!search) {
        return true;
      }

      return [template.code, template.name, template.description]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
}

function buildRecord(templateId: string) {
  const template = state().templates.find((entry) => entry.id === templateId) ?? null;

  if (!template) {
    return null;
  }

  const versions = state().versions.filter((entry) => entry.templateId === templateId);

  return {
    template,
    draftVersion: versions.find((entry) => !entry.isPublished) ?? null,
    publishedVersion: versions.find((entry) => entry.isPublished) ?? null
  };
}

export async function fixtureLogin(payload: {
  email: string;
  password: string;
  tenantId?: string;
}) {
  globalThis.__hazeorinAdminWebE2EState = initialState();
  const user = requireUserByEmail(payload.email, payload.password);
  const activeMemberships = user.memberships.filter(
    (membership) => membership.tenantStatus === "TENANT_MEMBERSHIP_STATUS_ACTIVE"
  );
  const tenantId = payload.tenantId?.trim() || activeMemberships[0]?.tenantId || TENANT_HQ;

  requireMembership(user.userId, tenantId);
  return buildSession(user.userId, tenantId);
}

export async function fixtureRefreshSession(payload: { refreshToken: string }) {
  const parsed = parseRefreshToken(payload.refreshToken);

  if (!parsed) {
    throw new Error("Invalid fixture refresh token.");
  }

  requireMembership(parsed.userId, parsed.tenantId);
  return buildSession(parsed.userId, parsed.tenantId);
}

export async function fixtureSwitchTenant(
  session: FixtureSession,
  tenantId: string
) {
  requireMembership(session.userId, tenantId);
  return buildSession(session.userId, tenantId);
}

export async function fixtureListMyTenantMemberships(session: FixtureSession) {
  const user = state().users.find((entry) => entry.userId === session.userId);
  return user?.memberships.filter(
    (membership) => membership.tenantStatus === "TENANT_MEMBERSHIP_STATUS_ACTIVE"
  ) ?? [];
}

export async function fixtureListApprovalFlows(
  session: FixtureSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    targetType?: ApprovalFlowTargetType;
    includeArchived?: boolean;
  }
) {
  const list = filterTemplates(session, input);
  return paginate(list, input.page, input.limit);
}

function filterPlans(input: {
  search?: string;
  isActive?: boolean;
  interval?: FixturePlanInterval;
}) {
  const search = input.search?.trim().toLowerCase() ?? "";

  return state().plans
    .filter((plan) => (typeof input.isActive === "boolean" ? plan.isActive === input.isActive : true))
    .filter((plan) => (input.interval ? plan.interval === input.interval : true))
    .filter((plan) => {
      if (!search) {
        return true;
      }

      return [plan.code, plan.name, plan.description, plan.currency]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
}

function sortPlans(
  list: FixturePlan[],
  sortBy: string | undefined,
  sortType: "SORT_TYPE_ASC" | "SORT_TYPE_DESC" | undefined
) {
  const direction = sortType === "SORT_TYPE_DESC" ? -1 : 1;
  const items = [...list];

  const compareString = (left: string, right: string) => left.localeCompare(right);
  const compareNumber = (left: number, right: number) => left - right;

  items.sort((left, right) => {
    switch (sortBy) {
      case "name":
        return compareString(left.name, right.name) * direction;
      case "code":
        return compareString(left.code, right.code) * direction;
      case "currency":
        return compareString(left.currency, right.currency) * direction;
      case "price_cents":
      default:
        return compareNumber(left.priceCents, right.priceCents) * direction;
    }
  });

  return items;
}

function filterSubscriptions(
  session: FixtureSession,
  input: {
    search?: string;
    status?: FixtureSubscriptionStatus;
    planId?: string;
  }
) {
  const search = input.search?.trim().toLowerCase() ?? "";

  return state().subscriptions
    .filter((subscription) => subscription.tenantId === session.tenantId)
    .filter((subscription) => (input.status ? subscription.status === input.status : true))
    .filter((subscription) => (input.planId ? subscription.planId === input.planId : true))
    .filter((subscription) => {
      if (!search) {
        return true;
      }

      const plan = state().plans.find((entry) => entry.id === subscription.planId);
      return [
        subscription.id,
        plan?.code ?? "",
        plan?.name ?? "",
        plan?.description ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
}

function sortSubscriptions(
  list: FixtureSubscription[],
  sortBy: string | undefined,
  sortType: "SORT_TYPE_ASC" | "SORT_TYPE_DESC" | undefined
) {
  const direction = sortType === "SORT_TYPE_ASC" ? 1 : -1;
  const items = [...list];
  items.sort((left, right) => {
    switch (sortBy) {
      case "ts.seat_count":
        return (left.seatCount - right.seatCount) * direction;
      case "ts.status":
        return left.status.localeCompare(right.status) * direction;
      case "ts.created_at":
      case "ts.started_at":
      default:
        return (
          (new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime()) * direction
        );
    }
  });
  return items;
}

export async function fixtureGetApprovalFlow(
  session: FixtureSession,
  templateId: string
) {
  const record = buildRecord(templateId.trim());

  if (!record || record.template.tenantId !== session.tenantId) {
    return null;
  }

  return record;
}

export async function fixtureCreateApprovalFlow(
  session: FixtureSession,
  payload: {
    code: string;
    name: string;
    description?: string;
    targetType: ApprovalFlowTargetType;
    graphJson: string;
  }
) {
  const templateId = nextTemplateId();
  const versionId = nextVersionId();

  const template: FixtureApprovalFlowTemplate = {
    id: templateId,
    tenantId: session.tenantId,
    code: payload.code,
    name: payload.name,
    description: payload.description ?? "",
    targetType: payload.targetType,
    status: "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT",
    latestVersionNo: 1,
    publishedVersionId: ""
  };

  const draftVersion: FixtureApprovalFlowVersion = {
    id: versionId,
    templateId,
    versionNo: 1,
    isPublished: false,
    graphJson: payload.graphJson,
    compiledJson: cloneGraphJson(payload.graphJson)
  };

  state().templates.unshift(template);
  state().versions.push(draftVersion);

  return {
    template,
    draftVersion,
    publishedVersion: null
  };
}

export async function fixtureListPlans(input: {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortType?: "SORT_TYPE_ASC" | "SORT_TYPE_DESC";
  isActive?: boolean;
  interval?: FixturePlanInterval;
}) {
  const list = sortPlans(filterPlans(input), input.sortBy, input.sortType);
  return paginate(list, input.page, input.limit);
}

export async function fixtureGetPlan(planId: string) {
  return requirePlan(planId);
}

export async function fixtureCreatePlan(payload: {
  code: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: FixturePlanInterval;
}) {
  const plan: FixturePlan = {
    id: nextPlanId(),
    code: payload.code,
    name: payload.name,
    description: payload.description ?? "",
    priceCents: payload.priceCents,
    currency: payload.currency,
    interval: payload.interval,
    isActive: true
  };

  state().plans.unshift(plan);
  return plan;
}

export async function fixtureUpdatePlan(payload: {
  planId: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: FixturePlanInterval;
  isActive: boolean;
}) {
  const plan = requirePlan(payload.planId);
  plan.name = payload.name;
  plan.description = payload.description ?? "";
  plan.priceCents = payload.priceCents;
  plan.currency = payload.currency;
  plan.interval = payload.interval;
  plan.isActive = payload.isActive;
  return plan;
}

export async function fixtureDeletePlan(planId: string) {
  const plan = requirePlan(planId);
  state().plans = state().plans.filter((entry) => entry.id !== planId);
  return plan;
}

export async function fixtureListSubscriptions(
  session: FixtureSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortType?: "SORT_TYPE_ASC" | "SORT_TYPE_DESC";
    status?: FixtureSubscriptionStatus;
    planId?: string;
  }
) {
  const list = sortSubscriptions(filterSubscriptions(session, input), input.sortBy, input.sortType);
  return paginate(list, input.page, input.limit);
}

export async function fixtureGetSubscription(session: FixtureSession, subscriptionId: string) {
  return requireSubscriptionForTenant(session, subscriptionId);
}

export async function fixtureCreateSubscription(
  session: FixtureSession,
  payload: {
    tenantId: string;
    planId: string;
    seatCount: number;
  }
) {
  if (payload.tenantId !== session.tenantId) {
    throw new Error("Fixture subscription tenant mismatch.");
  }

  const plan = requirePlan(payload.planId);

  if (!plan.isActive) {
    throw new Error("Fixture subscription plan is inactive.");
  }

  const existingActive = state().subscriptions.find(
    (entry) =>
      entry.tenantId === payload.tenantId && entry.status === "SUBSCRIPTION_STATUS_ACTIVE"
  );

  if (existingActive) {
    throw new Error("Fixture tenant already has an active subscription.");
  }

  const subscription: FixtureSubscription = {
    id: nextSubscriptionId(),
    tenantId: payload.tenantId,
    planId: payload.planId,
    status: "SUBSCRIPTION_STATUS_ACTIVE",
    seatCount: payload.seatCount,
    startedAt: new Date().toISOString(),
    cancelledAt: ""
  };

  state().subscriptions.unshift(subscription);
  return subscription;
}

export async function fixtureChangeSubscriptionPlan(
  session: FixtureSession,
  payload: {
    subscriptionId: string;
    newPlanId: string;
  }
) {
  const subscription = requireSubscriptionForTenant(session, payload.subscriptionId);
  const plan = requirePlan(payload.newPlanId);

  if (subscription.status !== "SUBSCRIPTION_STATUS_ACTIVE") {
    throw new Error("Fixture subscription is not active.");
  }

  if (!plan.isActive) {
    throw new Error("Fixture replacement plan is inactive.");
  }

  subscription.planId = payload.newPlanId;
  return subscription;
}

export async function fixtureCancelSubscription(
  session: FixtureSession,
  subscriptionId: string
) {
  const subscription = requireSubscriptionForTenant(session, subscriptionId);

  if (subscription.status !== "SUBSCRIPTION_STATUS_ACTIVE") {
    throw new Error("Fixture subscription is already closed.");
  }

  subscription.status = "SUBSCRIPTION_STATUS_CANCELLED";
  subscription.cancelledAt = new Date().toISOString();
  return subscription;
}

export async function fixtureUpdateApprovalFlowDraft(
  session: FixtureSession,
  payload: {
    templateId: string;
    name: string;
    description?: string;
    graphJson: string;
  }
) {
  const template = requireTemplateForTenant(session, payload.templateId);
  template.name = payload.name;
  template.description = payload.description ?? "";

  let draftVersion = findDraftVersion(template.id);

  if (!draftVersion) {
    draftVersion = {
      id: nextVersionId(),
      templateId: template.id,
      versionNo: Math.max(template.latestVersionNo, 1),
      isPublished: false,
      graphJson: payload.graphJson,
      compiledJson: cloneGraphJson(payload.graphJson)
    };
    state().versions.push(draftVersion);
  } else {
    draftVersion.graphJson = payload.graphJson;
    draftVersion.compiledJson = cloneGraphJson(payload.graphJson);
  }

  return {
    template,
    draftVersion,
    publishedVersion: findPublishedVersion(template.id)
  };
}

export async function fixturePublishApprovalFlow(
  session: FixtureSession,
  payload: {
    templateId: string;
  }
) {
  const template = requireTemplateForTenant(session, payload.templateId);
  const draftVersion = findDraftVersion(template.id);

  if (!draftVersion) {
    throw new Error("Fixture draft version not found.");
  }

  const validation = await fixtureValidateApprovalFlow({
    graphJson: draftVersion.graphJson
  });

  const previousPublishedIndex = state().versions.findIndex(
    (entry) => entry.templateId === template.id && entry.isPublished === true
  );

  if (previousPublishedIndex >= 0) {
    state().versions.splice(previousPublishedIndex, 1);
  }

  const publishedVersion: FixtureApprovalFlowVersion = {
    id: nextVersionId(),
    templateId: template.id,
    versionNo: template.latestVersionNo + 1,
    isPublished: true,
    graphJson: draftVersion.graphJson,
    compiledJson: validation.compiledJson || cloneGraphJson(draftVersion.graphJson)
  };

  state().versions.push(publishedVersion);
  template.status = "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED";
  template.latestVersionNo = publishedVersion.versionNo;
  template.publishedVersionId = publishedVersion.id;

  return {
    template,
    publishedVersion,
    draftVersion,
    issues: validation.issues
  };
}

export async function fixtureArchiveApprovalFlow(
  session: FixtureSession,
  payload: {
    templateId: string;
  }
) {
  const template = requireTemplateForTenant(session, payload.templateId);
  template.status = "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED";
  return template;
}

export async function fixtureValidateApprovalFlow(payload: {
  graphJson: string;
}) {
  let issues: FixtureApprovalFlowValidationIssue[] = [];
  let compiledJson = "";

  try {
    compiledJson = cloneGraphJson(payload.graphJson);
  } catch {
    issues = [
      {
        code: "INVALID_JSON",
        message: "Graph JSON could not be parsed.",
        nodeId: "",
        edgeId: ""
      }
    ];
  }

  return {
    isValid: issues.length === 0,
    compiledJson,
    issues
  };
}

export async function fixtureListApprovalFlowBindings(
  session: FixtureSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    targetType?: ApprovalFlowTargetType;
    includeInactive?: boolean;
  }
) {
  const list = state().bindings
    .filter((binding) => binding.tenantId === session.tenantId)
    .filter(
      (binding) =>
        !input.targetType ||
        input.targetType === "APPROVAL_FLOW_TARGET_TYPE_UNSPECIFIED" ||
        binding.targetType === input.targetType
    )
    .filter((binding) => (input.includeInactive ? true : binding.isActive))
    .filter((binding) => {
      const search = input.search?.trim().toLowerCase() ?? "";

      if (!search) {
        return true;
      }

      return [binding.id, binding.name, binding.conditionsJson]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

  return paginate(list, input.page, input.limit);
}

export async function fixtureUpsertApprovalFlowBinding(
  session: FixtureSession,
  payload: {
    bindingId?: string;
    name: string;
    targetType: ApprovalFlowTargetType;
    templateId: string;
    priority: number;
    isDefault: boolean;
    isActive: boolean;
    conditionsJson?: string;
  }
) {
  const template = requireTemplateForTenant(session, payload.templateId);
  const versionId = template.publishedVersionId || "";

  if (payload.isDefault) {
    state().bindings.forEach((binding) => {
      if (
        binding.tenantId === session.tenantId &&
        binding.targetType === payload.targetType &&
        binding.id !== payload.bindingId
      ) {
        binding.isDefault = false;
      }
    });
  }

  if (payload.bindingId) {
    const binding = state().bindings.find(
      (entry) => entry.id === payload.bindingId && entry.tenantId === session.tenantId
    );

    if (!binding) {
      throw new Error("Fixture binding not found.");
    }

    binding.name = payload.name;
    binding.targetType = payload.targetType;
    binding.templateId = payload.templateId;
    binding.versionId = versionId;
    binding.priority = payload.priority;
    binding.isDefault = payload.isDefault;
    binding.isActive = payload.isActive;
    binding.conditionsJson = payload.conditionsJson ?? "";
    return binding;
  }

  const binding: FixtureApprovalFlowBinding = {
    id: nextBindingId(),
    tenantId: session.tenantId,
    name: payload.name,
    targetType: payload.targetType,
    templateId: payload.templateId,
    versionId,
    priority: payload.priority,
    isDefault: payload.isDefault,
    isActive: payload.isActive,
    conditionsJson: payload.conditionsJson ?? ""
  };

  state().bindings.unshift(binding);
  return binding;
}

export async function fixtureGetOverview(session: FixtureSession) {
  return (
    state().reportingByTenant[session.tenantId]?.overview ?? {
      totalDepartments: 0,
      activeDepartments: 0,
      totalEmployees: 0,
      activeEmployees: 0,
      probationEmployees: 0,
      inactiveEmployees: 0,
      pendingLeaveRequests: 0,
      approvedLeaveRequests: 0,
      rejectedLeaveRequests: 0,
      pendingClaimRequests: 0,
      approvedClaimRequests: 0,
      rejectedClaimRequests: 0,
      pendingApprovals: 0,
      departments: [],
      managers: [],
      workforce: [],
      queues: []
    }
  );
}

export async function fixtureGetQueueTrend(session: FixtureSession) {
  return state().reportingByTenant[session.tenantId]?.queueTrend ?? [];
}

export async function fixtureGetApprovalAnalytics(session: FixtureSession) {
  return (
    state().reportingByTenant[session.tenantId]?.approvalAnalytics ?? {
      totalRequests: 0,
      pendingRequests: 0,
      activeAssignments: 0,
      reassignedAssignments: 0,
      averageResolutionHours: 0,
      averageStepActionHours: 0,
      pendingAges: [],
      targets: [],
      executionModes: []
    }
  );
}

export async function fixtureListReportingSavedPresets(session: FixtureSession) {
  return state().reportingSavedPresets
    .filter(
      (preset) =>
        preset.tenantId === session.tenantId && preset.userId === session.userId
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((preset) => ({
      id: preset.id,
      name: preset.name,
      scopeSummary: preset.scopeSummary,
      window: preset.window,
      branchId: "",
      departmentId: "",
      managerId: "",
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt
    }));
}

export async function fixtureUpsertReportingSavedPreset(
  session: FixtureSession,
  input: {
    name: string;
    scopeSummary: string;
    window?: FixtureReportingWindow;
  }
) {
  const name = normalizeFixtureReportingName(input.name) || "All time view";
  const normalizedName = name.toLowerCase();
  const scopeSummary =
    normalizeFixtureScopeSummary(input.scopeSummary) || "Current tenant snapshot";
  const now = new Date().toISOString();
  const existingIndex = state().reportingSavedPresets.findIndex(
    (preset) =>
      preset.tenantId === session.tenantId &&
      preset.userId === session.userId &&
      preset.normalizedName === normalizedName
  );

  const nextPreset: FixtureReportingSavedPreset = {
    id:
      existingIndex >= 0
        ? state().reportingSavedPresets[existingIndex]!.id
        : `reporting_preset_${Date.now()}`,
    tenantId: session.tenantId,
    userId: session.userId,
    name,
    normalizedName,
    scopeSummary,
    window: input.window ?? "REPORTING_WINDOW_ALL_TIME",
    createdAt:
      existingIndex >= 0
        ? state().reportingSavedPresets[existingIndex]!.createdAt
        : now,
    updatedAt: now
  };

  const retained = state().reportingSavedPresets.filter((preset, index) => {
    if (index === existingIndex) {
      return false;
    }

    return !(
      preset.tenantId === session.tenantId &&
      preset.userId === session.userId &&
      preset.normalizedName === normalizedName
    );
  });

  const nextUserPresets = [
    nextPreset,
    ...retained.filter(
      (preset) =>
        preset.tenantId === session.tenantId && preset.userId === session.userId
    )
  ].slice(0, 6);
  const otherPresets = retained.filter(
    (preset) =>
      preset.tenantId !== session.tenantId || preset.userId !== session.userId
  );
  state().reportingSavedPresets = [...otherPresets, ...nextUserPresets];

  return {
    id: nextPreset.id,
    name: nextPreset.name,
    scopeSummary: nextPreset.scopeSummary,
    window: nextPreset.window,
    branchId: "",
    departmentId: "",
    managerId: "",
    createdAt: nextPreset.createdAt,
    updatedAt: nextPreset.updatedAt
  };
}

export async function fixtureDeleteReportingSavedPreset(
  session: FixtureSession,
  presetId: string
) {
  const before = state().reportingSavedPresets.length;

  state().reportingSavedPresets = state().reportingSavedPresets.filter(
    (preset) =>
      !(
        preset.id === presetId &&
        preset.tenantId === session.tenantId &&
        preset.userId === session.userId
      )
  );

  return state().reportingSavedPresets.length < before;
}
