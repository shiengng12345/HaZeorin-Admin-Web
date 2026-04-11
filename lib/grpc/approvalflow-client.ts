import "server-only";

import { z } from "zod";

import type { AuthSession } from "@/lib/grpc/auth-client";
import {
  fixtureArchiveApprovalFlow,
  fixtureCreateApprovalFlow,
  fixtureGetApprovalFlow,
  fixtureListApprovalFlowBindings,
  fixtureListApprovalFlows,
  fixtureListApprovalFlowVersionHistory,
  fixturePublishApprovalFlow,
  fixtureSimulateApprovalFlow,
  fixtureUpdateApprovalFlowDraft,
  fixtureUpsertApprovalFlowBinding,
  fixtureValidateApprovalFlow,
  isE2EFixtureMode
} from "@/lib/e2e-fixtures";
import {
  createAuthenticatedMetadata,
  getApprovalFlowClient,
  invokeUnary
} from "@/lib/grpc/client";
import { GrpcBusinessError } from "@/lib/grpc/errors";

const StatusCodeSchema = z.enum([
  "STATUS_CODE_UNSPECIFIED",
  "STATUS_CODE_SUCCESS",
  "STATUS_CODE_INVALID_ARGUMENT",
  "STATUS_CODE_NOT_FOUND",
  "STATUS_CODE_CONFLICT",
  "STATUS_CODE_FORBIDDEN",
  "STATUS_CODE_INTERNAL"
]);

const BaseResponseSchema = z
  .object({
    status: StatusCodeSchema.default("STATUS_CODE_UNSPECIFIED"),
    message: z.string().default("")
  })
  .default({
    status: "STATUS_CODE_UNSPECIFIED",
    message: ""
  });

const PaginationMetaSchema = z.object({
  total: z.coerce.number().nonnegative().default(0),
  totalPage: z.coerce.number().nonnegative().default(0),
  page: z.coerce.number().nonnegative().default(1),
  limit: z.coerce.number().nonnegative().default(10)
});

const ApprovalFlowTargetTypeSchema = z.enum([
  "APPROVAL_FLOW_TARGET_TYPE_UNSPECIFIED",
  "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
  "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
  "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
  "APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE"
]);

const ApprovalFlowTemplateStatusSchema = z.enum([
  "APPROVAL_FLOW_TEMPLATE_STATUS_UNSPECIFIED",
  "APPROVAL_FLOW_TEMPLATE_STATUS_DRAFT",
  "APPROVAL_FLOW_TEMPLATE_STATUS_PUBLISHED",
  "APPROVAL_FLOW_TEMPLATE_STATUS_ARCHIVED"
]);

const ApprovalNodeExecutionModeSchema = z.enum([
  "APPROVAL_NODE_EXECUTION_MODE_UNSPECIFIED",
  "APPROVAL_NODE_EXECUTION_MODE_ALL_APPROVE",
  "APPROVAL_NODE_EXECUTION_MODE_ANY_ONE_APPROVE"
]);

const ApprovalFlowTemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().default(""),
  targetType: ApprovalFlowTargetTypeSchema,
  status: ApprovalFlowTemplateStatusSchema,
  latestVersionNo: z.coerce.number().nonnegative().default(0),
  publishedVersionId: z.string().default("")
});

const ApprovalFlowVersionSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  versionNo: z.coerce.number().nonnegative().default(0),
  isPublished: z.boolean().default(false),
  graphJson: z.string().default(""),
  compiledJson: z.string().default("")
});

const ApprovalFlowVersionHistoryEntrySchema = z.object({
  version: ApprovalFlowVersionSchema.optional(),
  createdBy: z.string().default(""),
  createdAt: z.string().default(""),
  publishedBy: z.string().default(""),
  publishedAt: z.string().default("")
});

const ApprovalFlowBindingSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  targetType: ApprovalFlowTargetTypeSchema,
  templateId: z.string(),
  versionId: z.string().default(""),
  priority: z.coerce.number().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(false),
  conditionsJson: z.string().default("")
});

const ApprovalFlowValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  nodeId: z.string().default(""),
  edgeId: z.string().default("")
});

const ApprovalFlowSimulationStepSchema = z.object({
  stepNo: z.coerce.number().nonnegative().default(0),
  nodeId: z.string(),
  executionMode: ApprovalNodeExecutionModeSchema,
  approverIds: z.array(z.string()).default([])
});

const ApprovalFlowSimulationResultSchema = z.object({
  matchedBindingId: z.string().default(""),
  templateId: z.string().default(""),
  versionId: z.string().default(""),
  visitedNodeIds: z.array(z.string()).default([]),
  steps: z.array(ApprovalFlowSimulationStepSchema).default([]),
  issues: z.array(ApprovalFlowValidationIssueSchema).default([])
});

const ApprovalFlowRecordSchema = z.object({
  template: ApprovalFlowTemplateSchema.optional(),
  draftVersion: ApprovalFlowVersionSchema.optional(),
  publishedVersion: ApprovalFlowVersionSchema.optional()
});

const PaginatedApprovalFlowsResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      list: z.array(ApprovalFlowTemplateSchema).default([]),
      pagination: PaginationMetaSchema.optional()
    })
    .optional()
});

const SingleApprovalFlowResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: ApprovalFlowRecordSchema.optional()
});

const ListApprovalFlowVersionHistoryResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      list: z.array(ApprovalFlowVersionHistoryEntrySchema).default([])
    })
    .optional()
});

const CreateApprovalFlowResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      template: ApprovalFlowTemplateSchema.optional(),
      draftVersion: ApprovalFlowVersionSchema.optional()
    })
    .optional()
});

const UpdateApprovalFlowDraftResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      template: ApprovalFlowTemplateSchema.optional(),
      draftVersion: ApprovalFlowVersionSchema.optional()
    })
    .optional()
});

const PublishApprovalFlowResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      template: ApprovalFlowTemplateSchema.optional(),
      publishedVersion: ApprovalFlowVersionSchema.optional(),
      draftVersion: ApprovalFlowVersionSchema.optional(),
      issues: z.array(ApprovalFlowValidationIssueSchema).default([])
    })
    .optional()
});

const ArchiveApprovalFlowResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      template: ApprovalFlowTemplateSchema.optional()
    })
    .optional()
});

const ValidateApprovalFlowResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      isValid: z.boolean().default(false),
      compiledJson: z.string().default(""),
      issues: z.array(ApprovalFlowValidationIssueSchema).default([])
    })
    .optional()
});

const SimulateApprovalFlowResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      result: ApprovalFlowSimulationResultSchema.optional()
    })
    .optional()
});

const PaginatedApprovalFlowBindingsResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      list: z.array(ApprovalFlowBindingSchema).default([]),
      pagination: PaginationMetaSchema.optional()
    })
    .optional()
});

const UpsertApprovalFlowBindingResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      binding: ApprovalFlowBindingSchema.optional()
    })
    .optional()
});

export type ApprovalFlowTargetType = z.infer<typeof ApprovalFlowTargetTypeSchema>;
export type ApprovalFlowTemplateStatus = z.infer<typeof ApprovalFlowTemplateStatusSchema>;
export type ApprovalFlowTemplate = z.infer<typeof ApprovalFlowTemplateSchema>;
export type ApprovalFlowVersion = z.infer<typeof ApprovalFlowVersionSchema>;
export type ApprovalFlowVersionHistoryEntry = z.infer<
  typeof ApprovalFlowVersionHistoryEntrySchema
>;
export type ApprovalFlowBinding = z.infer<typeof ApprovalFlowBindingSchema>;
export type ApprovalFlowValidationIssue = z.infer<typeof ApprovalFlowValidationIssueSchema>;
export type ApprovalFlowValidationResult = NonNullable<
  z.infer<typeof ValidateApprovalFlowResponseSchema>["data"]
>;
export type ApprovalFlowSimulationResult = z.infer<typeof ApprovalFlowSimulationResultSchema>;
export type ApprovalFlowRecord = {
  template: ApprovalFlowTemplate;
  draftVersion: ApprovalFlowVersion | null;
  publishedVersion: ApprovalFlowVersion | null;
};
export type SortDirection = "SORT_TYPE_ASC" | "SORT_TYPE_DESC";

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

function buildPaginationRequest(input: {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortType?: SortDirection;
}) {
  return {
    page: input.page,
    limit: input.limit,
    search: input.search ?? "",
    sortBy: input.sortBy ?? "",
    sortType: input.sortBy ? input.sortType ?? "SORT_TYPE_ASC" : "SORT_TYPE_UNSPECIFIED"
  };
}

function requireTemplate(
  template: ApprovalFlowTemplate | undefined,
  fallbackMessage: string
) {
  if (!template) {
    throw new GrpcBusinessError(fallbackMessage, "STATUS_CODE_INTERNAL");
  }

  return template;
}

function buildRecord(
  payload: {
    data?: {
      template?: ApprovalFlowTemplate;
      draftVersion?: ApprovalFlowVersion;
      publishedVersion?: ApprovalFlowVersion;
    };
  },
  fallbackMessage: string
): ApprovalFlowRecord {
  const template = requireTemplate(payload.data?.template, fallbackMessage);

  return {
    template,
    draftVersion: payload.data?.draftVersion ?? null,
    publishedVersion: payload.data?.publishedVersion ?? null
  };
}

export async function listApprovalFlows(
  session: AuthSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    targetType?: ApprovalFlowTargetType;
    includeArchived?: boolean;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureListApprovalFlows(session, input);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendPaginationApprovalFlow",
    {
      pagination: buildPaginationRequest(input),
      otherParams: {
        targetType:
          input.targetType ?? "APPROVAL_FLOW_TARGET_TYPE_UNSPECIFIED",
        includeArchived: input.includeArchived ?? false
      }
    },
    metadata(session)
  );

  const parsed = PaginatedApprovalFlowsResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load approval flows.");

  return {
    list: parsed.data?.list ?? [],
    pagination: parsed.data?.pagination ?? {
      total: 0,
      totalPage: 0,
      page: input.page,
      limit: input.limit
    }
  };
}

export async function getApprovalFlow(session: AuthSession, templateId: string) {
  if (isE2EFixtureMode()) {
    const record = await fixtureGetApprovalFlow(session, templateId);

    if (!record) {
      throw new GrpcBusinessError(
        "Unable to load the selected approval flow.",
        "STATUS_CODE_NOT_FOUND"
      );
    }

    return record;
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendGetApprovalFlow",
    { templateId },
    metadata(session)
  );
  const parsed = SingleApprovalFlowResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load the selected approval flow.");

  return buildRecord(parsed, "Unable to load the selected approval flow.");
}

export async function listApprovalFlowVersionHistory(
  session: AuthSession,
  templateId: string
) {
  if (isE2EFixtureMode()) {
    return fixtureListApprovalFlowVersionHistory(session, templateId);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendListApprovalFlowVersionHistory",
    { templateId },
    metadata(session)
  );
  const parsed = ListApprovalFlowVersionHistoryResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load approval flow version history.");

  return parsed.data?.list ?? [];
}

export async function createApprovalFlow(
  session: AuthSession,
  payload: {
    tenantId: string;
    code: string;
    name: string;
    description?: string;
    targetType: ApprovalFlowTargetType;
    graphJson: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureCreateApprovalFlow(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendCreateApprovalFlow",
    {
      tenantId: payload.tenantId,
      code: payload.code,
      name: payload.name,
      description: payload.description ?? "",
      targetType: payload.targetType,
      graphJson: payload.graphJson
    },
    metadata(session)
  );
  const parsed = CreateApprovalFlowResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to create the approval flow.");

  return buildRecord(parsed, "Unable to create the approval flow.");
}

export async function updateApprovalFlowDraft(
  session: AuthSession,
  payload: {
    tenantId: string;
    templateId: string;
    name: string;
    description?: string;
    graphJson: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureUpdateApprovalFlowDraft(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendUpdateApprovalFlowDraft",
    {
      tenantId: payload.tenantId,
      templateId: payload.templateId,
      name: payload.name,
      description: payload.description ?? "",
      graphJson: payload.graphJson
    },
    metadata(session)
  );
  const parsed = UpdateApprovalFlowDraftResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to update the approval flow draft.");

  return buildRecord(parsed, "Unable to update the approval flow draft.");
}

export async function publishApprovalFlow(
  session: AuthSession,
  payload: {
    tenantId: string;
    templateId: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixturePublishApprovalFlow(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendPublishApprovalFlow",
    {
      tenantId: payload.tenantId,
      templateId: payload.templateId
    },
    metadata(session)
  );
  const parsed = PublishApprovalFlowResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to publish the approval flow.");

  return {
    template: requireTemplate(parsed.data?.template, "Unable to publish the approval flow."),
    publishedVersion: parsed.data?.publishedVersion ?? null,
    draftVersion: parsed.data?.draftVersion ?? null,
    issues: parsed.data?.issues ?? []
  };
}

export async function archiveApprovalFlow(
  session: AuthSession,
  payload: {
    tenantId: string;
    templateId: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureArchiveApprovalFlow(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendArchiveApprovalFlow",
    {
      tenantId: payload.tenantId,
      templateId: payload.templateId
    },
    metadata(session)
  );
  const parsed = ArchiveApprovalFlowResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to archive the approval flow.");

  return requireTemplate(parsed.data?.template, "Unable to archive the approval flow.");
}

export async function validateApprovalFlow(
  session: AuthSession,
  payload: {
    tenantId: string;
    targetType: ApprovalFlowTargetType;
    graphJson: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureValidateApprovalFlow(payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendValidateApprovalFlow",
    {
      tenantId: payload.tenantId,
      targetType: payload.targetType,
      graphJson: payload.graphJson
    },
    metadata(session)
  );
  const parsed = ValidateApprovalFlowResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to validate the approval flow.");

  return {
    isValid: parsed.data?.isValid ?? false,
    compiledJson: parsed.data?.compiledJson ?? "",
    issues: parsed.data?.issues ?? []
  };
}

export async function simulateApprovalFlow(
  session: AuthSession,
  payload: {
    tenantId: string;
    templateId: string;
    fieldsJson: string;
    requesterId: string;
    requesterEmployeeId?: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureSimulateApprovalFlow(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendSimulateApprovalFlow",
    {
      tenantId: payload.tenantId,
      templateId: payload.templateId,
      fieldsJson: payload.fieldsJson,
      requesterId: payload.requesterId,
      requesterEmployeeId: payload.requesterEmployeeId ?? ""
    },
    metadata(session)
  );
  const parsed = SimulateApprovalFlowResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to simulate the approval flow.");

  return (
    parsed.data?.result ?? {
      matchedBindingId: "",
      templateId: "",
      versionId: "",
      visitedNodeIds: [],
      steps: [],
      issues: []
    }
  );
}

export async function listApprovalFlowBindings(
  session: AuthSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    targetType?: ApprovalFlowTargetType;
    includeInactive?: boolean;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureListApprovalFlowBindings(session, input);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendPaginationApprovalFlowBinding",
    {
      pagination: buildPaginationRequest(input),
      otherParams: {
        targetType:
          input.targetType ?? "APPROVAL_FLOW_TARGET_TYPE_UNSPECIFIED",
        includeInactive: input.includeInactive ?? false
      }
    },
    metadata(session)
  );
  const parsed = PaginatedApprovalFlowBindingsResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load approval flow bindings.");

  return {
    list: parsed.data?.list ?? [],
    pagination: parsed.data?.pagination ?? {
      total: 0,
      totalPage: 0,
      page: input.page,
      limit: input.limit
    }
  };
}

export async function upsertApprovalFlowBinding(
  session: AuthSession,
  payload: {
    tenantId: string;
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
  if (isE2EFixtureMode()) {
    return fixtureUpsertApprovalFlowBinding(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getApprovalFlowClient(),
    "frontendUpsertApprovalFlowBinding",
    {
      tenantId: payload.tenantId,
      bindingId: payload.bindingId ?? "",
      name: payload.name,
      targetType: payload.targetType,
      templateId: payload.templateId,
      priority: payload.priority,
      isDefault: payload.isDefault,
      isActive: payload.isActive,
      conditionsJson: payload.conditionsJson ?? ""
    },
    metadata(session)
  );
  const parsed = UpsertApprovalFlowBindingResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to save the approval flow binding.");

  if (!parsed.data?.binding) {
    throw new GrpcBusinessError(
      "Unable to save the approval flow binding.",
      "STATUS_CODE_INTERNAL"
    );
  }

  return parsed.data.binding;
}
