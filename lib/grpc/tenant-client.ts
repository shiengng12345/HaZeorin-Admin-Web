import "server-only";

import { z } from "zod";

import {
  fixtureCancelSubscription,
  fixtureChangeSubscriptionPlan,
  fixtureCreateSubscription,
  fixtureGetSubscription,
  fixtureListSubscriptions,
  isE2EFixtureMode
} from "@/lib/e2e-fixtures";
import {
  createAuthenticatedMetadata,
  getTenantClient,
  invokeUnary
} from "@/lib/grpc/client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import type { AuthSession } from "@/lib/grpc/auth-client";
import type { SortDirection } from "@/lib/plans";
import type { SubscriptionStatusValue } from "@/lib/subscriptions";

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

const SubscriptionStatusSchema = z.enum([
  "SUBSCRIPTION_STATUS_UNSPECIFIED",
  "SUBSCRIPTION_STATUS_ACTIVE",
  "SUBSCRIPTION_STATUS_CANCELLED"
]);

const TenantSubscriptionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  planId: z.string(),
  status: SubscriptionStatusSchema,
  seatCount: z.number(),
  startedAt: z.string(),
  cancelledAt: z.string().default("")
});

const PaginationMetaSchema = z.object({
  total: z.number(),
  totalPage: z.number(),
  page: z.number(),
  limit: z.number()
});

const SingleSubscriptionResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      subscription: TenantSubscriptionSchema.optional()
    })
    .optional()
});

const PaginatedSubscriptionsResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      list: z.array(TenantSubscriptionSchema).default([]),
      pagination: PaginationMetaSchema.optional()
    })
    .optional()
});

export type TenantSubscription = z.infer<typeof TenantSubscriptionSchema>;

export type PaginatedSubscriptions = {
  list: TenantSubscription[];
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

function requireSubscription(
  payload: z.infer<typeof SingleSubscriptionResponseSchema>,
  fallbackMessage: string
) {
  ensureSuccess(payload, fallbackMessage);

  if (!payload.data?.subscription) {
    throw new GrpcBusinessError(fallbackMessage, "STATUS_CODE_INTERNAL");
  }

  return payload.data.subscription;
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

function buildSubscriptionOtherParams(input: {
  status?: SubscriptionStatusValue;
  planId?: string;
}) {
  const otherParams: Record<string, unknown> = {};

  if (input.status) {
    otherParams.status = input.status;
  }

  if (input.planId?.trim()) {
    otherParams.planId = input.planId.trim();
  }

  return Object.keys(otherParams).length > 0 ? otherParams : undefined;
}

export async function listSubscriptions(
  session: AuthSession,
  input: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortType?: SortDirection;
    status?: SubscriptionStatusValue;
    planId?: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureListSubscriptions(session, input);
  }

  const response = await invokeUnary<unknown>(
    getTenantClient(),
    "frontendPaginationSubscription",
    {
      pagination: buildPaginationRequest(input),
      otherParams: buildSubscriptionOtherParams(input)
    },
    metadata(session)
  );

  const parsed = PaginatedSubscriptionsResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load tenant subscriptions.");

  return {
    list: parsed.data?.list ?? [],
    pagination: parsed.data?.pagination ?? {
      total: 0,
      totalPage: 0,
      page: input.page,
      limit: input.limit
    }
  } satisfies PaginatedSubscriptions;
}

export async function getSubscription(session: AuthSession, subscriptionId: string) {
  if (isE2EFixtureMode()) {
    return fixtureGetSubscription(session, subscriptionId);
  }

  const response = await invokeUnary<unknown>(
    getTenantClient(),
    "frontendGetSubscription",
    { subscriptionId },
    metadata(session)
  );

  return requireSubscription(
    SingleSubscriptionResponseSchema.parse(response),
    "Unable to load the selected subscription."
  );
}

export async function createSubscription(
  session: AuthSession,
  payload: {
    tenantId: string;
    planId: string;
    seatCount: number;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureCreateSubscription(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getTenantClient(),
    "frontendCreateSubscription",
    {
      tenantId: payload.tenantId,
      planId: payload.planId,
      seatCount: payload.seatCount
    },
    metadata(session)
  );

  return requireSubscription(
    SingleSubscriptionResponseSchema.parse(response),
    "Unable to create the tenant subscription."
  );
}

export async function changeSubscriptionPlan(
  session: AuthSession,
  payload: {
    subscriptionId: string;
    newPlanId: string;
  }
) {
  if (isE2EFixtureMode()) {
    return fixtureChangeSubscriptionPlan(session, payload);
  }

  const response = await invokeUnary<unknown>(
    getTenantClient(),
    "changeSubscriptionPlan",
    {
      subscriptionId: payload.subscriptionId,
      newPlanId: payload.newPlanId
    },
    metadata(session)
  );

  return requireSubscription(
    SingleSubscriptionResponseSchema.parse(response),
    "Unable to change the subscription plan."
  );
}

export async function cancelSubscription(session: AuthSession, subscriptionId: string) {
  if (isE2EFixtureMode()) {
    return fixtureCancelSubscription(session, subscriptionId);
  }

  const response = await invokeUnary<unknown>(
    getTenantClient(),
    "cancelSubscription",
    { subscriptionId },
    metadata(session)
  );

  return requireSubscription(
    SingleSubscriptionResponseSchema.parse(response),
    "Unable to cancel the tenant subscription."
  );
}
