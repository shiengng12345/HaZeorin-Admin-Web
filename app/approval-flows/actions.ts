"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import {
  buildApprovalFlowDetailPath,
  buildNewApprovalFlowPath,
  sanitizeApprovalFlowReturnPath
} from "@/lib/approval-flows";
import {
  archiveApprovalFlow,
  createApprovalFlow,
  publishApprovalFlow,
  type ApprovalFlowTargetType,
  updateApprovalFlowDraft,
  upsertApprovalFlowBinding
} from "@/lib/grpc/approvalflow-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import { executeProtectedMutation } from "@/lib/session";

const ApprovalFlowTargetTypeSchema = z.enum([
  "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
  "APPROVAL_FLOW_TARGET_TYPE_CLAIM",
  "APPROVAL_FLOW_TARGET_TYPE_OVERTIME",
  "APPROVAL_FLOW_TARGET_TYPE_EMPLOYEE_CHANGE"
]);

const CreateApprovalFlowSchema = z.object({
  code: z.string().trim().min(1, "Flow code is required."),
  name: z.string().trim().min(1, "Flow name is required."),
  description: z.string().optional().default(""),
  targetType: ApprovalFlowTargetTypeSchema,
  graphJson: z.string().trim().min(1, "Graph JSON is required.")
});

const UpdateApprovalFlowDraftSchema = z.object({
  templateId: z.string().trim().min(1, "Template ID is required."),
  name: z.string().trim().min(1, "Flow name is required."),
  description: z.string().optional().default(""),
  graphJson: z.string().trim().min(1, "Graph JSON is required."),
  returnTo: z.string().optional().default("")
});

const FlowActionSchema = z.object({
  templateId: z.string().trim().min(1, "Template ID is required."),
  returnTo: z.string().optional().default("")
});

const UpsertApprovalFlowBindingSchema = z.object({
  templateId: z.string().trim().min(1, "Template ID is required."),
  returnTo: z.string().optional().default(""),
  bindingId: z.string().optional().default(""),
  name: z.string().trim().min(1, "Binding name is required."),
  targetType: ApprovalFlowTargetTypeSchema,
  priority: z.coerce.number().int().min(0, "Priority must be 0 or greater."),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  conditionsJson: z.string().optional().default("")
});

function resolveUnexpectedMessage(error: unknown) {
  if (error instanceof GrpcBusinessError) {
    return error.message;
  }

  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return `${error.name}: ${error.message}`;
  }

  return "The admin portal could not complete this request.";
}

function buildDetailErrorPath(
  templateId: string,
  input: {
    error: string;
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
  }
) {
  return buildApprovalFlowDetailPath(templateId, {
    ...input,
    returnTo: sanitizeApprovalFlowReturnPath(input.returnTo)
  });
}

export async function createApprovalFlowAction(formData: FormData) {
  const parsed = CreateApprovalFlowSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    targetType: formData.get("targetType"),
    graphJson: formData.get("graphJson")
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildNewApprovalFlowPath({
        error: issue?.message ?? "Approval flow payload is incomplete.",
        code: String(formData.get("code") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        targetType:
          (String(formData.get("targetType") ?? "") as ApprovalFlowTargetType) ||
          "APPROVAL_FLOW_TARGET_TYPE_LEAVE_REQUEST",
        graphJson: String(formData.get("graphJson") ?? "")
      })
    );
  }

  try {
    const record = await executeProtectedMutation((session) =>
      createApprovalFlow(session, {
        tenantId: session.tenantId,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description,
        targetType: parsed.data.targetType,
        graphJson: parsed.data.graphJson
      })
    );

    redirect(
      buildApprovalFlowDetailPath(record.template.id, {
        message: "Approval flow created."
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildNewApprovalFlowPath({
        error: resolveUnexpectedMessage(error),
        ...parsed.data
      })
    );
  }
}

export async function updateApprovalFlowDraftAction(formData: FormData) {
  const parsed = UpdateApprovalFlowDraftSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    graphJson: formData.get("graphJson"),
    returnTo: formData.get("returnTo") ?? ""
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const templateId = String(formData.get("templateId") ?? "");
    redirect(
      buildDetailErrorPath(templateId, {
        error: issue?.message ?? "Approval flow payload is incomplete.",
        returnTo: String(formData.get("returnTo") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        graphJson: String(formData.get("graphJson") ?? "")
      })
    );
  }

  try {
    await executeProtectedMutation((session) =>
      updateApprovalFlowDraft(session, {
        tenantId: session.tenantId,
        templateId: parsed.data.templateId,
        name: parsed.data.name,
        description: parsed.data.description,
        graphJson: parsed.data.graphJson
      })
    );

    redirect(
      buildApprovalFlowDetailPath(parsed.data.templateId, {
        message: "Draft updated.",
        returnTo: sanitizeApprovalFlowReturnPath(parsed.data.returnTo)
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildDetailErrorPath(parsed.data.templateId, {
        error: resolveUnexpectedMessage(error),
        returnTo: parsed.data.returnTo,
        name: parsed.data.name,
        description: parsed.data.description,
        graphJson: parsed.data.graphJson
      })
    );
  }
}

export async function publishApprovalFlowAction(formData: FormData) {
  const parsed = FlowActionSchema.safeParse({
    templateId: formData.get("templateId"),
    returnTo: formData.get("returnTo") ?? ""
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildDetailErrorPath(String(formData.get("templateId") ?? ""), {
        error: issue?.message ?? "Template ID is required.",
        returnTo: String(formData.get("returnTo") ?? "")
      })
    );
  }

  try {
    const published = await executeProtectedMutation((session) =>
      publishApprovalFlow(session, {
        tenantId: session.tenantId,
        templateId: parsed.data.templateId
      })
    );
    const issueCount = published.issues.length;
    const message =
      issueCount > 0
        ? `Approval flow published with ${issueCount} validation issue${issueCount === 1 ? "" : "s"}.`
        : "Approval flow published.";

    redirect(
      buildApprovalFlowDetailPath(parsed.data.templateId, {
        message,
        returnTo: sanitizeApprovalFlowReturnPath(parsed.data.returnTo)
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildDetailErrorPath(parsed.data.templateId, {
        error: resolveUnexpectedMessage(error),
        returnTo: parsed.data.returnTo
      })
    );
  }
}

export async function archiveApprovalFlowAction(formData: FormData) {
  const parsed = FlowActionSchema.safeParse({
    templateId: formData.get("templateId"),
    returnTo: formData.get("returnTo") ?? ""
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildDetailErrorPath(String(formData.get("templateId") ?? ""), {
        error: issue?.message ?? "Template ID is required.",
        returnTo: String(formData.get("returnTo") ?? "")
      })
    );
  }

  try {
    await executeProtectedMutation((session) =>
      archiveApprovalFlow(session, {
        tenantId: session.tenantId,
        templateId: parsed.data.templateId
      })
    );

    redirect(
      buildApprovalFlowDetailPath(parsed.data.templateId, {
        message: "Approval flow archived.",
        returnTo: sanitizeApprovalFlowReturnPath(parsed.data.returnTo)
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildDetailErrorPath(parsed.data.templateId, {
        error: resolveUnexpectedMessage(error),
        returnTo: parsed.data.returnTo
      })
    );
  }
}

export async function upsertApprovalFlowBindingAction(formData: FormData) {
  const parsed = UpsertApprovalFlowBindingSchema.safeParse({
    templateId: formData.get("templateId"),
    returnTo: formData.get("returnTo") ?? "",
    bindingId: formData.get("bindingId") ?? "",
    name: formData.get("name"),
    targetType: formData.get("targetType"),
    priority: formData.get("priority"),
    isDefault: formData.get("isDefault") === "on",
    isActive: formData.get("isActive") === "on",
    conditionsJson: formData.get("conditionsJson") ?? ""
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const templateId = String(formData.get("templateId") ?? "");
    redirect(
      buildDetailErrorPath(templateId, {
        error: issue?.message ?? "Binding payload is incomplete.",
        returnTo: String(formData.get("returnTo") ?? ""),
        bindingId: String(formData.get("bindingId") ?? ""),
        bindingName: String(formData.get("name") ?? ""),
        bindingPriority: String(formData.get("priority") ?? ""),
        bindingIsDefault: formData.get("isDefault") === "on" ? "true" : "false",
        bindingIsActive: formData.get("isActive") === "on" ? "true" : "false",
        bindingConditionsJson: String(formData.get("conditionsJson") ?? "")
      })
    );
  }

  try {
    const binding = await executeProtectedMutation((session) =>
      upsertApprovalFlowBinding(session, {
        tenantId: session.tenantId,
        bindingId: parsed.data.bindingId || undefined,
        name: parsed.data.name,
        targetType: parsed.data.targetType,
        templateId: parsed.data.templateId,
        priority: parsed.data.priority,
        isDefault: parsed.data.isDefault,
        isActive: parsed.data.isActive,
        conditionsJson: parsed.data.conditionsJson
      })
    );

    redirect(
      buildApprovalFlowDetailPath(parsed.data.templateId, {
        message: parsed.data.bindingId ? "Binding updated." : "Binding created.",
        returnTo: sanitizeApprovalFlowReturnPath(parsed.data.returnTo),
        bindingId: binding.id
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildDetailErrorPath(parsed.data.templateId, {
        error: resolveUnexpectedMessage(error),
        returnTo: parsed.data.returnTo,
        bindingId: parsed.data.bindingId,
        bindingName: parsed.data.name,
        bindingPriority: String(parsed.data.priority),
        bindingIsDefault: parsed.data.isDefault ? "true" : "false",
        bindingIsActive: parsed.data.isActive ? "true" : "false",
        bindingConditionsJson: parsed.data.conditionsJson
      })
    );
  }
}
