import "server-only";

import { z } from "zod";

import { filterActiveTenantMemberships } from "@/lib/auth-memberships";
import {
  fixtureListMyTenantMemberships,
  fixtureLogin,
  fixtureRefreshSession,
  fixtureSwitchTenant,
  isE2EFixtureMode
} from "@/lib/e2e-fixtures";
import {
  createAuthenticatedMetadata,
  getAuthClient,
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

const SessionSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshTokenExpiresAt: z.string()
});

const SessionResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      session: SessionSchema.optional()
    })
    .optional()
});

const TenantMembershipSchema = z.object({
  tenantId: z.string(),
  tenantName: z.string(),
  tenantSlug: z.string(),
  tenantStatus: z.string(),
  role: z.string()
});

const MembershipListResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      list: z.array(TenantMembershipSchema).default([])
    })
    .optional()
});

const LogoutSessionResponseSchema = z.object({
  baseResponse: BaseResponseSchema.optional(),
  data: z
    .object({
      revoked: z.boolean().default(false)
    })
    .optional()
});

export type AuthSession = z.infer<typeof SessionSchema>;
export type TenantMembership = z.infer<typeof TenantMembershipSchema>;

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

function requireSession(
  payload: z.infer<typeof SessionResponseSchema>,
  fallbackMessage: string
) {
  ensureSuccess(payload, fallbackMessage);

  if (!payload.data?.session) {
    throw new GrpcBusinessError(fallbackMessage, "STATUS_CODE_INTERNAL");
  }

  return payload.data.session;
}

export async function login(payload: {
  email: string;
  password: string;
  tenantId?: string;
}) {
  if (isE2EFixtureMode()) {
    return fixtureLogin(payload);
  }

  const response = await invokeUnary<unknown>(getAuthClient(), "login", payload);
  return requireSession(SessionResponseSchema.parse(response), "Unable to create a session.");
}

export async function refreshSession(payload: { refreshToken: string }) {
  if (isE2EFixtureMode()) {
    return fixtureRefreshSession(payload);
  }

  const response = await invokeUnary<unknown>(
    getAuthClient(),
    "refreshSession",
    payload
  );

  return requireSession(
    SessionResponseSchema.parse(response),
    "Unable to refresh the current session."
  );
}

export async function logoutSession(payload: {
  accessToken: string;
  refreshToken: string;
}) {
  if (isE2EFixtureMode()) {
    return true;
  }

  const response = await invokeUnary<unknown>(
    getAuthClient(),
    "logoutSession",
    {},
    createAuthenticatedMetadata(payload.accessToken, {
      "x-refresh-token": payload.refreshToken
    })
  );
  const parsed = LogoutSessionResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to revoke the current session.");
  return parsed.data?.revoked ?? false;
}

export async function switchTenant(payload: {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
}) {
  if (isE2EFixtureMode()) {
    const [prefix, userId, tenantId] = payload.refreshToken.split(":");

    if (prefix !== "fixture-admin-refresh" || !userId || !tenantId) {
      throw new GrpcBusinessError(
        "Unable to switch the active tenant.",
        "STATUS_CODE_UNAUTHENTICATED"
      );
    }

    return fixtureSwitchTenant(
      {
        userId,
        tenantId,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      payload.tenantId
    );
  }

  const response = await invokeUnary<unknown>(
    getAuthClient(),
    "switchTenant",
    { tenantId: payload.tenantId },
    createAuthenticatedMetadata(payload.accessToken, {
      "x-refresh-token": payload.refreshToken
    })
  );

  return requireSession(
    SessionResponseSchema.parse(response),
    "Unable to switch the active tenant."
  );
}

export async function listMyTenantMemberships(session: AuthSession) {
  if (isE2EFixtureMode()) {
    return filterActiveTenantMemberships(await fixtureListMyTenantMemberships(session));
  }

  const response = await invokeUnary<unknown>(
    getAuthClient(),
    "listMyTenantMemberships",
    {},
    createAuthenticatedMetadata(session.accessToken)
  );
  const parsed = MembershipListResponseSchema.parse(response);
  ensureSuccess(parsed, "Unable to load tenant memberships.");
  return filterActiveTenantMemberships(parsed.data?.list ?? []);
}

export function formatMembershipRole(role: string) {
  return role
    .replace("TENANT_MEMBERSHIP_ROLE_", "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatTenantStatus(status: string) {
  return status
    .replace("TENANT_MEMBERSHIP_STATUS_", "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
