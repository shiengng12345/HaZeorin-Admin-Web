"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import {
  DEFAULT_REPORTING_STATE,
  parseReportingState,
  sanitizeReportingReturnPath
} from "@/lib/reporting";
import { normalizeReportingPresetName } from "@/lib/reporting-presets";
import {
  frontendDeleteSavedPreset,
  frontendUpsertSavedPreset
} from "@/lib/grpc/reporting-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import { executeProtectedMutation } from "@/lib/session";

const SaveReportingPresetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Saved view name is required.")
    .max(60, "Saved view name must stay within 60 characters."),
  scopeSummary: z
    .string()
    .trim()
    .min(1, "Scope summary is required.")
    .max(120, "Scope summary must stay within 120 characters."),
  returnTo: z.string().optional().default("")
});

const DeleteReportingPresetSchema = z.object({
  presetId: z.string().trim().min(1, "Saved preset ID is required."),
  returnTo: z.string().optional().default("")
});

const RenameReportingPresetSchema = z.object({
  presetId: z.string().trim().min(1, "Saved preset ID is required."),
  previousName: z.string().optional().default(""),
  name: z
    .string()
    .trim()
    .min(1, "Saved view name is required.")
    .max(60, "Saved view name must stay within 60 characters."),
  scopeSummary: z
    .string()
    .trim()
    .min(1, "Scope summary is required.")
    .max(120, "Scope summary must stay within 120 characters."),
  returnTo: z.string().optional().default("")
});

function buildReportingReturnPath(
  returnTo: string,
  input: {
    error?: string;
    message?: string;
  } = {}
) {
  const safePath = sanitizeReportingReturnPath(returnTo);
  const [pathname, query = ""] = safePath.split("?");
  const search = new URLSearchParams(query);

  if (input.error) {
    search.set("error", input.error);
  }

  if (input.message) {
    search.set("message", input.message);
  }

  const serialized = search.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function resolveUnexpectedMessage(error: unknown) {
  if (error instanceof GrpcBusinessError) {
    return error.message;
  }

  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return `${error.name}: ${error.message}`;
  }

  return "The admin workspace could not complete this reporting action.";
}

export async function saveReportingPresetAction(formData: FormData) {
  const parsed = SaveReportingPresetSchema.safeParse({
    name: formData.get("name"),
    scopeSummary: formData.get("scopeSummary"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeReportingReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );
  const state = parseReportingState({
    window: String(formData.get("window") ?? DEFAULT_REPORTING_STATE.window)
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildReportingReturnPath(returnTo, {
        error: issue?.message ?? "Saved view payload is incomplete."
      })
    );
  }

  try {
    await executeProtectedMutation((session) =>
      frontendUpsertSavedPreset(session, {
        name: parsed.data.name,
        scopeSummary: parsed.data.scopeSummary,
        window: state.window
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildReportingReturnPath(returnTo, {
        error: resolveUnexpectedMessage(error)
      })
    );
  }

  redirect(
    buildReportingReturnPath(returnTo, {
      message: "Reporting view saved."
    })
  );
}

export async function deleteReportingPresetAction(formData: FormData) {
  const parsed = DeleteReportingPresetSchema.safeParse({
    presetId: formData.get("presetId"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeReportingReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildReportingReturnPath(returnTo, {
        error: issue?.message ?? "Saved preset ID is required."
      })
    );
  }

  try {
    await executeProtectedMutation((session) =>
      frontendDeleteSavedPreset(session, parsed.data.presetId)
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildReportingReturnPath(returnTo, {
        error: resolveUnexpectedMessage(error)
      })
    );
  }

  redirect(
    buildReportingReturnPath(returnTo, {
      message: "Saved view removed."
    })
  );
}

export async function renameReportingPresetAction(formData: FormData) {
  const parsed = RenameReportingPresetSchema.safeParse({
    presetId: formData.get("presetId"),
    previousName: formData.get("previousName") ?? "",
    name: formData.get("name"),
    scopeSummary: formData.get("scopeSummary"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeReportingReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );
  const state = parseReportingState({
    window: String(formData.get("window") ?? DEFAULT_REPORTING_STATE.window)
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildReportingReturnPath(returnTo, {
        error: issue?.message ?? "Saved view rename payload is incomplete."
      })
    );
  }

  try {
    await executeProtectedMutation(async (session) => {
      const renamedPreset = await frontendUpsertSavedPreset(session, {
        name: parsed.data.name,
        scopeSummary: parsed.data.scopeSummary,
        window: state.window
      });

      if (
        normalizeReportingPresetName(parsed.data.name).toLowerCase() !==
        normalizeReportingPresetName(parsed.data.previousName).toLowerCase()
      ) {
        try {
          await frontendDeleteSavedPreset(session, parsed.data.presetId);
        } catch (error) {
          if (
            renamedPreset?.id &&
            renamedPreset.id !== parsed.data.presetId
          ) {
            await frontendDeleteSavedPreset(session, renamedPreset.id).catch(() => false);
          }

          throw error;
        }
      }
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildReportingReturnPath(returnTo, {
        error: resolveUnexpectedMessage(error)
      })
    );
  }

  redirect(
    buildReportingReturnPath(returnTo, {
      message: "Saved view renamed."
    })
  );
}
