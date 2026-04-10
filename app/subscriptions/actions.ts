"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import {
  cancelSubscription,
  changeSubscriptionPlan,
  createSubscription
} from "@/lib/grpc/tenant-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import { parseSeatCount, sanitizeSubscriptionReturnPath } from "@/lib/subscriptions";
import { executeProtectedMutation } from "@/lib/session";

const CreateSubscriptionSchema = z.object({
  planId: z.string().trim().min(1, "Choose an active plan before launching a subscription."),
  seatCount: z.string().trim().min(1, "Seat count is required."),
  returnTo: z.string().optional().default("")
});

const ChangeSubscriptionPlanSchema = z.object({
  subscriptionId: z.string().trim().min(1, "Subscription ID is required."),
  currentPlanId: z.string().trim().min(1, "Current plan ID is required."),
  newPlanId: z.string().trim().min(1, "Choose a replacement plan."),
  returnTo: z.string().optional().default("")
});

const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string().trim().min(1, "Subscription ID is required."),
  returnTo: z.string().optional().default("")
});

function appendMessageToPath(path: string, key: "error" | "message", value: string) {
  const [pathname, query = ""] = path.split("?");
  const search = new URLSearchParams(query);
  search.set(key, value);
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

  return "The subscription workspace could not complete this request.";
}

export async function createSubscriptionAction(formData: FormData) {
  const parsed = CreateSubscriptionSchema.safeParse({
    planId: formData.get("planId"),
    seatCount: formData.get("seatCount"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeSubscriptionReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      appendMessageToPath(
        returnTo,
        "error",
        issue?.message ?? "Subscription payload is incomplete."
      )
    );
  }

  const seatCount = parseSeatCount(parsed.data.seatCount);

  if (seatCount === null) {
    redirect(
      appendMessageToPath(
        returnTo,
        "error",
        "Seat count must be a whole number greater than zero."
      )
    );
  }

  try {
    await executeProtectedMutation((session) =>
      createSubscription(session, {
        tenantId: session.tenantId,
        planId: parsed.data.planId,
        seatCount
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      appendMessageToPath(returnTo, "error", resolveUnexpectedMessage(error))
    );
  }

  redirect(appendMessageToPath(returnTo, "message", "Tenant subscription launched."));
}

export async function changeSubscriptionPlanAction(formData: FormData) {
  const parsed = ChangeSubscriptionPlanSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    currentPlanId: formData.get("currentPlanId"),
    newPlanId: formData.get("newPlanId"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeSubscriptionReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      appendMessageToPath(
        returnTo,
        "error",
        issue?.message ?? "Plan change payload is incomplete."
      )
    );
  }

  if (parsed.data.currentPlanId === parsed.data.newPlanId) {
    redirect(
      appendMessageToPath(
        returnTo,
        "error",
        "Choose a different active plan before submitting a change."
      )
    );
  }

  try {
    await executeProtectedMutation((session) =>
      changeSubscriptionPlan(session, {
        subscriptionId: parsed.data.subscriptionId,
        newPlanId: parsed.data.newPlanId
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      appendMessageToPath(returnTo, "error", resolveUnexpectedMessage(error))
    );
  }

  redirect(appendMessageToPath(returnTo, "message", "Subscription plan changed."));
}

export async function cancelSubscriptionAction(formData: FormData) {
  const parsed = CancelSubscriptionSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeSubscriptionReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      appendMessageToPath(
        returnTo,
        "error",
        issue?.message ?? "Subscription ID is required."
      )
    );
  }

  try {
    await executeProtectedMutation((session) =>
      cancelSubscription(session, parsed.data.subscriptionId)
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      appendMessageToPath(returnTo, "error", resolveUnexpectedMessage(error))
    );
  }

  redirect(appendMessageToPath(returnTo, "message", "Subscription cancelled."));
}
