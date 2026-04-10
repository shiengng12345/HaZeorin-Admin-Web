"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { deletePlan, createPlan, updatePlan } from "@/lib/grpc/subscription-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import {
  normalizeCurrency,
  parsePriceToCents,
  sanitizePlanReturnPath
} from "@/lib/plans";
import {
  executeProtectedMutation,
} from "@/lib/session";

const PlanIntervalSchema = z.enum(["PLAN_INTERVAL_MONTHLY", "PLAN_INTERVAL_YEARLY"]);

const CreatePlanSchema = z.object({
  code: z.string().trim().min(1, "Plan code is required."),
  name: z.string().trim().min(1, "Plan name is required."),
  description: z.string().optional().default(""),
  price: z.string().trim().min(1, "Price is required."),
  currency: z.string().trim().min(1, "Currency is required."),
  interval: PlanIntervalSchema
});

const UpdatePlanSchema = z.object({
  planId: z.string().trim().min(1, "Plan ID is required."),
  name: z.string().trim().min(1, "Plan name is required."),
  description: z.string().optional().default(""),
  price: z.string().trim().min(1, "Price is required."),
  currency: z.string().trim().min(1, "Currency is required."),
  interval: PlanIntervalSchema,
  isActive: z.boolean(),
  returnTo: z.string().optional().default("")
});

const DeletePlanSchema = z.object({
  planId: z.string().trim().min(1, "Plan ID is required."),
  returnTo: z.string().optional().default(""),
  planName: z.string().optional().default("")
});

function buildNewPlanPath(input: {
  error?: string;
  code?: string;
  name?: string;
  description?: string;
  price?: string;
  currency?: string;
  interval?: string;
}) {
  const search = new URLSearchParams();

  if (input.error) {
    search.set("error", input.error);
  }
  if (input.code) {
    search.set("code", input.code);
  }
  if (input.name) {
    search.set("name", input.name);
  }
  if (input.description) {
    search.set("description", input.description);
  }
  if (input.price) {
    search.set("price", input.price);
  }
  if (input.currency) {
    search.set("currency", input.currency);
  }
  if (input.interval) {
    search.set("interval", input.interval);
  }

  const query = search.toString();
  return query ? `/plans/new?${query}` : "/plans/new";
}

function buildPlanDetailPath(
  planId: string,
  input: {
    error?: string;
    message?: string;
    name?: string;
    description?: string;
    price?: string;
    currency?: string;
    interval?: string;
    isActive?: string;
    returnTo?: string;
  } = {}
) {
  const search = new URLSearchParams();

  if (input.error) {
    search.set("error", input.error);
  }
  if (input.message) {
    search.set("message", input.message);
  }
  if (input.name) {
    search.set("name", input.name);
  }
  if (input.description) {
    search.set("description", input.description);
  }
  if (input.price) {
    search.set("price", input.price);
  }
  if (input.currency) {
    search.set("currency", input.currency);
  }
  if (input.interval) {
    search.set("interval", input.interval);
  }
  if (input.isActive) {
    search.set("isActive", input.isActive);
  }
  if (input.returnTo) {
    search.set("returnTo", input.returnTo);
  }

  const query = search.toString();
  return query ? `/plans/${planId}?${query}` : `/plans/${planId}`;
}

function resolveUnexpectedMessage(error: unknown) {
  if (error instanceof GrpcBusinessError) {
    return error.message;
  }

  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return `${error.name}: ${error.message}`;
  }

  return "The admin portal could not complete this request.";
}

function parsePriceOrRedirect(
  price: string,
  onInvalid: () => never
) {
  const cents = parsePriceToCents(price);

  if (cents === null) {
    onInvalid();
  }

  return cents;
}

export async function createPlanAction(formData: FormData) {
  const parsed = CreatePlanSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    currency: formData.get("currency"),
    interval: formData.get("interval")
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildNewPlanPath({
        error: issue?.message ?? "Plan payload is incomplete.",
        code: String(formData.get("code") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        currency: String(formData.get("currency") ?? ""),
        interval: String(formData.get("interval") ?? "")
      })
    );
  }

  const priceCents = parsePriceOrRedirect(parsed.data.price, () =>
    redirect(
      buildNewPlanPath({
        error: "Price must be a non-negative amount with up to 2 decimals.",
        ...parsed.data
      })
    )
  );

  const currency = normalizeCurrency(parsed.data.currency);
  if (currency.length !== 3) {
    redirect(
      buildNewPlanPath({
        error: "Currency must be a 3-letter code.",
        ...parsed.data,
        currency
      })
    );
  }

  try {
    const plan = await executeProtectedMutation((session) =>
      createPlan(session, {
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        description: parsed.data.description.trim(),
        priceCents,
        currency,
        interval: parsed.data.interval
      })
    );

    redirect(buildPlanDetailPath(plan.id, { message: "Subscription plan created." }));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildNewPlanPath({
        error: resolveUnexpectedMessage(error),
        ...parsed.data,
        currency
      })
    );
  }
}

export async function updatePlanAction(formData: FormData) {
  const parsed = UpdatePlanSchema.safeParse({
    planId: formData.get("planId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    currency: formData.get("currency"),
    interval: formData.get("interval"),
    isActive: formData.get("isActive") === "on",
    returnTo: formData.get("returnTo") ?? ""
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const planId = String(formData.get("planId") ?? "");
    redirect(
      buildPlanDetailPath(planId, {
        error: issue?.message ?? "Plan payload is incomplete.",
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        currency: String(formData.get("currency") ?? ""),
        interval: String(formData.get("interval") ?? ""),
        isActive: formData.get("isActive") === "on" ? "true" : "false",
        returnTo: sanitizePlanReturnPath(String(formData.get("returnTo") ?? ""))
      })
    );
  }

  const priceCents = parsePriceOrRedirect(parsed.data.price, () =>
    redirect(
      buildPlanDetailPath(parsed.data.planId, {
        error: "Price must be a non-negative amount with up to 2 decimals.",
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        currency: parsed.data.currency,
        interval: parsed.data.interval,
        isActive: parsed.data.isActive ? "true" : "false",
        returnTo: sanitizePlanReturnPath(parsed.data.returnTo)
      })
    )
  );

  const currency = normalizeCurrency(parsed.data.currency);
  if (currency.length !== 3) {
    redirect(
      buildPlanDetailPath(parsed.data.planId, {
        error: "Currency must be a 3-letter code.",
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        currency,
        interval: parsed.data.interval,
        isActive: parsed.data.isActive ? "true" : "false",
        returnTo: sanitizePlanReturnPath(parsed.data.returnTo)
      })
    );
  }

  try {
    await executeProtectedMutation((session) =>
      updatePlan(session, {
        planId: parsed.data.planId,
        name: parsed.data.name.trim(),
        description: parsed.data.description.trim(),
        priceCents,
        currency,
        interval: parsed.data.interval,
        isActive: parsed.data.isActive
      })
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildPlanDetailPath(parsed.data.planId, {
        error: resolveUnexpectedMessage(error),
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        currency,
        interval: parsed.data.interval,
        isActive: parsed.data.isActive ? "true" : "false",
        returnTo: sanitizePlanReturnPath(parsed.data.returnTo)
      })
    );
  }

  const returnTo = sanitizePlanReturnPath(parsed.data.returnTo);
  redirect(
    buildPlanDetailPath(parsed.data.planId, {
      message: "Subscription plan updated.",
      returnTo
    })
  );
}

export async function deletePlanAction(formData: FormData) {
  const parsed = DeletePlanSchema.safeParse({
    planId: formData.get("planId"),
    returnTo: formData.get("returnTo") ?? "",
    planName: formData.get("planName") ?? ""
  });

  const returnTo = sanitizePlanReturnPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      appendMessageToPath(
        returnTo,
        "error",
        issue?.message ?? "Plan ID is required before deletion."
      )
    );
  }

  try {
    const deletedPlan = await executeProtectedMutation((session) =>
      deletePlan(session, parsed.data.planId)
    );
    redirect(
      appendMessageToPath(
        returnTo,
        "message",
        `Deleted ${deletedPlan.name || parsed.data.planName || "subscription plan"}.`
      )
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      appendMessageToPath(returnTo, "error", resolveUnexpectedMessage(error))
    );
  }
}

function appendMessageToPath(path: string, key: "error" | "message", value: string) {
  const [pathname, query = ""] = path.split("?");
  const search = new URLSearchParams(query);
  search.set(key, value);
  const serialized = search.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
