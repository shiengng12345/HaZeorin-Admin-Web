import "server-only";

import { z } from "zod";

import {
  fixtureCreatePlan,
  fixtureDeletePlan,
  fixtureGetPlan,
  fixtureListPlans,
  fixtureUpdatePlan,
  isE2EFixtureMode
} from "@/lib/e2e-fixtures";
import {
  createAuthenticatedMetadata,
  getSubscriptionClient,
  invokeUnary
} from "@/lib/grpc/client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import type { AuthSession } from "@/lib/grpc/auth-client";
import type { PlanIntervalValue, SortDirection } from "@/lib/plans";

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

const PlanIntervalSchema = z.enum([
  "PLAN_INTERVAL_MONTHLY",
  "PLAN_INTERVAL_YEARLY"
]);

const PlanSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().default(""),
  priceCents: z.number(),
  currency: z.string(),
  interval: PlanIntervalSchema,
  isActive: z.boolean()
});

const PaginationMetaSchema = z.object({
  total: z.number(),
  totalPage: z.number(),
  page: z.number(),
  limit: z.number()
});

const SinglePlanResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      plan: PlanSchema.optional()
    })
    .optional()
});

const PaginatedPlansResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      list: z.array(PlanSchema).default([]),
      pagination: PaginationMetaSchema.optional()
    })
    .optional()
});

export type SubscriptionPlan = z.infer<typeof PlanSchema>;

export type PaginatedPlans = {
  list: SubscriptionPlan[];
  pagination: {
    total: number;
    totalPage: number;
    page: number;
    limit: number;
  };
};

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

function requirePlan(
  payload: z.infer<typeof SinglePlanResponseSchema>,
  fallbackMessage: string
) {
  ensureSuccess(payload, fallbackMessage);

  if (!payload.data?.plan) {
    throw new GrpcBusinessError(fallbackMessage, "STATUS_CODE_INTERNAL");
  }

  return payload.data.plan;
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

function buildPlanOtherParams(input: {
  isActive?: boolean;
  interval?: PlanIntervalValue;
}) {
  const otherParams: Record<string, unknown> = {};

  if (typeof input.isActive === "boolean") {
    otherParams.isActive = input.isActive;
  }

  if (input.interval) {
    otherParams.interval = input.interval;
  }

  return Object.keys(otherParams).length > 0 ? otherParams : undefined;
}

export async function listPlans(
  session: AuthSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortType?: SortDirection;
    isActive?: boolean;
    interval?: PlanIntervalValue;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureListPlans(input);
  }

  const response = await invokeUnary<unknown>(
    getSubscriptionClient(),
    "frontendPaginationPlan",
    {
      pagination: buildPaginationRequest(input),
      otherParams: buildPlanOtherParams(input)
    },
    metadata(session)
  );

  const parsed = PaginatedPlansResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load subscription plans.");

  return {
    list: parsed.data?.list ?? [],
    pagination: parsed.data?.pagination ?? {
      total: 0,
      totalPage: 0,
      page: input.page,
      limit: input.limit
    }
  } satisfies PaginatedPlans;
}

export async function getPlan(session: AuthSession, planId: string) {
  if (isE2EFixtureMode()) {
    return fixtureGetPlan(planId);
  }

  const response = await invokeUnary<unknown>(
    getSubscriptionClient(),
    "frontendGetPlan",
    { planId },
    metadata(session)
  );

  return requirePlan(
    SinglePlanResponseSchema.parse(response),
    "Unable to load the selected plan."
  );
}

export async function createPlan(
  session: AuthSession,
  payload: {
    code: string;
    name: string;
    description?: string;
    priceCents: number;
    currency: string;
    interval: PlanIntervalValue;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureCreatePlan(payload);
  }

  const response = await invokeUnary<unknown>(
    getSubscriptionClient(),
    "frontendCreatePlan",
    {
      code: payload.code,
      name: payload.name,
      description: payload.description ?? "",
      priceCents: payload.priceCents,
      currency: payload.currency,
      interval: payload.interval
    },
    metadata(session)
  );

  return requirePlan(
    SinglePlanResponseSchema.parse(response),
    "Unable to create the subscription plan."
  );
}

export async function updatePlan(
  session: AuthSession,
  payload: {
    planId: string;
    name: string;
    description?: string;
    priceCents: number;
    currency: string;
    interval: PlanIntervalValue;
    isActive: boolean;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureUpdatePlan(payload);
  }

  const response = await invokeUnary<unknown>(
    getSubscriptionClient(),
    "frontendUpdatePlan",
    {
      planId: payload.planId,
      name: payload.name,
      description: payload.description ?? "",
      priceCents: payload.priceCents,
      currency: payload.currency,
      interval: payload.interval,
      isActive: payload.isActive
    },
    metadata(session)
  );

  return requirePlan(
    SinglePlanResponseSchema.parse(response),
    "Unable to update the subscription plan."
  );
}

export async function deletePlan(session: AuthSession, planId: string) {
  if (isE2EFixtureMode()) {
    return fixtureDeletePlan(planId);
  }

  const response = await invokeUnary<unknown>(
    getSubscriptionClient(),
    "frontendDeletePlan",
    { planId },
    metadata(session)
  );

  return requirePlan(
    SinglePlanResponseSchema.parse(response),
    "Unable to delete the subscription plan."
  );
}
