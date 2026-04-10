import "server-only";

import { z } from "zod";

import {
  fixtureDeleteReportingSavedPreset,
  fixtureGetApprovalAnalytics,
  fixtureGetOverview,
  fixtureGetQueueTrend,
  fixtureListReportingSavedPresets,
  fixtureUpsertReportingSavedPreset,
  isE2EFixtureMode
} from "@/lib/e2e-fixtures";
import {
  createAuthenticatedMetadata,
  getReportingClient,
  invokeUnary
} from "@/lib/grpc/client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import type { AuthSession } from "@/lib/grpc/auth-client";

const BaseResponseSchema = z
  .object({
    status: z.string().default("STATUS_CODE_UNSPECIFIED"),
    message: z.string().default("")
  })
  .default({
    status: "STATUS_CODE_UNSPECIFIED",
    message: ""
  });

const ReportingWindowSchema = z.enum([
  "REPORTING_WINDOW_UNSPECIFIED",
  "REPORTING_WINDOW_ALL_TIME",
  "REPORTING_WINDOW_LAST_7_DAYS",
  "REPORTING_WINDOW_LAST_30_DAYS",
  "REPORTING_WINDOW_LAST_90_DAYS"
]);

const DepartmentOverviewSchema = z.object({
  departmentId: z.string(),
  code: z.string(),
  name: z.string(),
  employeeCount: z.coerce.number().nonnegative().default(0),
  coverageRatio: z.coerce.number().nonnegative().default(0)
});

const ManagerApprovalOverviewSchema = z.object({
  managerId: z.string(),
  managerName: z.string(),
  pendingApprovals: z.coerce.number().nonnegative().default(0),
  queueShare: z.coerce.number().nonnegative().default(0)
});

const WorkforceBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.coerce.number().nonnegative().default(0),
  shareRatio: z.coerce.number().nonnegative().default(0),
  note: z.string().default("")
});

const QueueBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  pending: z.coerce.number().nonnegative().default(0),
  approved: z.coerce.number().nonnegative().default(0),
  rejected: z.coerce.number().nonnegative().default(0)
});

const QueueTrendBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  leaveRequests: z.coerce.number().nonnegative().default(0),
  claimRequests: z.coerce.number().nonnegative().default(0),
  approvalRequests: z.coerce.number().nonnegative().default(0),
  totalRequests: z.coerce.number().nonnegative().default(0)
});

const ApprovalTargetAnalyticsBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  totalRequests: z.coerce.number().nonnegative().default(0),
  pendingRequests: z.coerce.number().nonnegative().default(0),
  approvedRequests: z.coerce.number().nonnegative().default(0),
  rejectedRequests: z.coerce.number().nonnegative().default(0),
  reassignedRequests: z.coerce.number().nonnegative().default(0),
  skippedRequests: z.coerce.number().nonnegative().default(0)
});

const ApprovalExecutionAnalyticsBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  pendingAssignments: z.coerce.number().nonnegative().default(0),
  activeRequests: z.coerce.number().nonnegative().default(0),
  requiredApprovals: z.coerce.number().nonnegative().default(0),
  approvedProgress: z.coerce.number().nonnegative().default(0)
});

const ApprovalPendingAgeBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  pendingRequests: z.coerce.number().nonnegative().default(0)
});

const OverviewSchema = z.object({
  totalDepartments: z.coerce.number().nonnegative().default(0),
  activeDepartments: z.coerce.number().nonnegative().default(0),
  totalEmployees: z.coerce.number().nonnegative().default(0),
  activeEmployees: z.coerce.number().nonnegative().default(0),
  probationEmployees: z.coerce.number().nonnegative().default(0),
  inactiveEmployees: z.coerce.number().nonnegative().default(0),
  pendingLeaveRequests: z.coerce.number().nonnegative().default(0),
  approvedLeaveRequests: z.coerce.number().nonnegative().default(0),
  rejectedLeaveRequests: z.coerce.number().nonnegative().default(0),
  pendingClaimRequests: z.coerce.number().nonnegative().default(0),
  approvedClaimRequests: z.coerce.number().nonnegative().default(0),
  rejectedClaimRequests: z.coerce.number().nonnegative().default(0),
  pendingApprovals: z.coerce.number().nonnegative().default(0),
  departments: z.array(DepartmentOverviewSchema).default([]),
  managers: z.array(ManagerApprovalOverviewSchema).default([]),
  workforce: z.array(WorkforceBucketSchema).default([]),
  queues: z.array(QueueBucketSchema).default([])
});

const ApprovalAnalyticsSchema = z.object({
  totalRequests: z.coerce.number().nonnegative().default(0),
  pendingRequests: z.coerce.number().nonnegative().default(0),
  activeAssignments: z.coerce.number().nonnegative().default(0),
  reassignedAssignments: z.coerce.number().nonnegative().default(0),
  averageResolutionHours: z.coerce.number().nonnegative().default(0),
  averageStepActionHours: z.coerce.number().nonnegative().default(0),
  pendingAges: z.array(ApprovalPendingAgeBucketSchema).default([]),
  targets: z.array(ApprovalTargetAnalyticsBucketSchema).default([]),
  executionModes: z.array(ApprovalExecutionAnalyticsBucketSchema).default([])
});

const FrontendGetOverviewResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      overview: OverviewSchema.optional()
    })
    .optional()
});

const FrontendGetQueueTrendResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      buckets: z.array(QueueTrendBucketSchema).default([])
    })
    .optional()
});

const FrontendGetApprovalAnalyticsResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      analytics: ApprovalAnalyticsSchema.optional()
    })
    .optional()
});

const ReportingSavedPresetSchema = z.object({
  id: z.string().default(""),
  name: z.string().default(""),
  scopeSummary: z.string().default(""),
  window: ReportingWindowSchema.default("REPORTING_WINDOW_ALL_TIME"),
  branchId: z.string().default(""),
  departmentId: z.string().default(""),
  managerId: z.string().default(""),
  createdAt: z.string().default(""),
  updatedAt: z.string().default("")
});

const FrontendListSavedPresetsResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      presets: z.array(ReportingSavedPresetSchema).default([])
    })
    .optional()
});

const FrontendUpsertSavedPresetResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      preset: ReportingSavedPresetSchema.optional()
    })
    .optional()
});

const FrontendDeleteSavedPresetResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      deleted: z.boolean().default(false)
    })
    .optional()
});

export type ReportingWindow = z.infer<typeof ReportingWindowSchema>;
export type ReportingOverview = z.infer<typeof OverviewSchema>;
export type ReportingQueueTrendBucket = z.infer<typeof QueueTrendBucketSchema>;
export type ReportingApprovalAnalytics = z.infer<typeof ApprovalAnalyticsSchema>;
export type ReportingSavedPreset = z.infer<typeof ReportingSavedPresetSchema>;

function ensureSuccess(
  payload: { baseResponse?: { status: string; message: string } },
  fallbackMessage: string
) {
  const baseResponse = payload.baseResponse ?? {
    status: "STATUS_CODE_UNSPECIFIED",
    message: fallbackMessage
  };

  if (baseResponse.status !== "STATUS_CODE_SUCCESS") {
    throw new GrpcBusinessError(
      baseResponse.message || fallbackMessage,
      baseResponse.status
    );
  }
}

function metadata(session: AuthSession) {
  return createAuthenticatedMetadata(session.accessToken);
}

function buildReportingRequest(
  input: { window?: ReportingWindow } | undefined
) {
  return {
    window: input?.window ?? "REPORTING_WINDOW_ALL_TIME",
    departmentId: "",
    managerId: ""
  };
}

export async function frontendGetOverview(
  session: AuthSession,
  input?: { window?: ReportingWindow }
) {
  if (isE2EFixtureMode()) {
    return fixtureGetOverview(session);
  }

  const response = await invokeUnary<unknown>(
    getReportingClient(),
    "frontendGetOverview",
    buildReportingRequest(input),
    metadata(session)
  );
  const parsed = FrontendGetOverviewResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load reporting overview.");

  return (
    parsed.data?.overview ?? {
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

export async function frontendGetQueueTrend(
  session: AuthSession,
  input?: { window?: ReportingWindow }
) {
  if (isE2EFixtureMode()) {
    return fixtureGetQueueTrend(session);
  }

  const response = await invokeUnary<unknown>(
    getReportingClient(),
    "frontendGetQueueTrend",
    buildReportingRequest(input),
    metadata(session)
  );
  const parsed = FrontendGetQueueTrendResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load reporting trend.");

  return parsed.data?.buckets ?? [];
}

export async function frontendGetApprovalAnalytics(
  session: AuthSession,
  input?: { window?: ReportingWindow }
) {
  if (isE2EFixtureMode()) {
    return fixtureGetApprovalAnalytics(session);
  }

  const response = await invokeUnary<unknown>(
    getReportingClient(),
    "frontendGetApprovalAnalytics",
    buildReportingRequest(input),
    metadata(session)
  );
  const parsed = FrontendGetApprovalAnalyticsResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load approval analytics.");

  return (
    parsed.data?.analytics ?? {
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

export async function frontendListSavedPresets(session: AuthSession) {
  if (isE2EFixtureMode()) {
    return fixtureListReportingSavedPresets(session);
  }

  const response = await invokeUnary<unknown>(
    getReportingClient(),
    "frontendListSavedPresets",
    {},
    metadata(session)
  );
  const parsed = FrontendListSavedPresetsResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load saved reporting views.");

  return parsed.data?.presets ?? [];
}

export async function frontendUpsertSavedPreset(
  session: AuthSession,
  input: {
    name: string;
    scopeSummary: string;
    window?: ReportingWindow;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureUpsertReportingSavedPreset(session, input);
  }

  const response = await invokeUnary<unknown>(
    getReportingClient(),
    "frontendUpsertSavedPreset",
    {
      name: input.name,
      scopeSummary: input.scopeSummary,
      window: input.window ?? "REPORTING_WINDOW_ALL_TIME",
      branchId: "",
      departmentId: "",
      managerId: ""
    },
    metadata(session)
  );
  const parsed = FrontendUpsertSavedPresetResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to save reporting view.");

  return parsed.data?.preset ?? null;
}

export async function frontendDeleteSavedPreset(
  session: AuthSession,
  presetId: string
) {
  if (isE2EFixtureMode()) {
    return fixtureDeleteReportingSavedPreset(session, presetId);
  }

  const response = await invokeUnary<unknown>(
    getReportingClient(),
    "frontendDeleteSavedPreset",
    {
      presetId
    },
    metadata(session)
  );
  const parsed = FrontendDeleteSavedPresetResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to remove saved reporting view.");

  return parsed.data?.deleted ?? false;
}
