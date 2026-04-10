import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAdminAccessErrorMessage,
  isAllowedAdminUserId
} from "@/lib/env";
import { refreshSession, type AuthSession } from "@/lib/grpc/auth-client";
import { GrpcBusinessError, isGrpcUnauthenticatedError } from "@/lib/grpc/errors";
import { buildHomePath } from "@/lib/session-core";

export const SESSION_COOKIE_NAMES = {
  userId: "hz_admin_user_id",
  accessToken: "hz_admin_access_token",
  refreshToken: "hz_admin_refresh_token",
  tenantId: "hz_admin_tenant_id",
  accessTokenExpiresAt: "hz_admin_access_expires_at",
  refreshTokenExpiresAt: "hz_admin_refresh_expires_at"
} as const;

export type SessionState = AuthSession;

type CookieValue = {
  value: string;
};

type CookieReader = {
  get(name: string): CookieValue | undefined;
};

export type MutableCookieStore = CookieReader & {
  set(
    name: string,
    value: string,
    options?: {
      expires?: Date;
      httpOnly?: boolean;
      path?: string;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
    }
  ): unknown;
  delete(name: string): unknown;
};

type RefreshSessionState = {
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

function parseIsoDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cookieOptions(expiresAt: string) {
  const expires = parseIsoDate(expiresAt);

  return {
    expires: expires ?? undefined,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (
    value === "/" ||
    value.startsWith("/approval-flows") ||
    value.startsWith("/plans") ||
    value.startsWith("/subscriptions") ||
    value.startsWith("/reporting")
  ) {
    return value;
  }

  return "/";
}

export function buildRefreshPath(nextPath: string) {
  return `/auth/refresh?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}

export function buildLoginPath(message?: string) {
  if (!message) {
    return "/login";
  }

  const search = new URLSearchParams({ error: message });
  return `/login?${search.toString()}`;
}

export function readSessionFromStore(store: CookieReader): SessionState | null {
  const userId = store.get(SESSION_COOKIE_NAMES.userId)?.value;
  const accessToken = store.get(SESSION_COOKIE_NAMES.accessToken)?.value;
  const refreshToken = store.get(SESSION_COOKIE_NAMES.refreshToken)?.value;
  const tenantId = store.get(SESSION_COOKIE_NAMES.tenantId)?.value;
  const accessTokenExpiresAt =
    store.get(SESSION_COOKIE_NAMES.accessTokenExpiresAt)?.value;
  const refreshTokenExpiresAt =
    store.get(SESSION_COOKIE_NAMES.refreshTokenExpiresAt)?.value;

  if (
    !userId ||
    !accessToken ||
    !refreshToken ||
    !tenantId ||
    !accessTokenExpiresAt ||
    !refreshTokenExpiresAt
  ) {
    return null;
  }

  return {
    userId,
    tenantId,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt
  };
}

function readRefreshSessionFromStore(store: CookieReader): RefreshSessionState | null {
  const refreshToken = store.get(SESSION_COOKIE_NAMES.refreshToken)?.value;
  const refreshTokenExpiresAt =
    store.get(SESSION_COOKIE_NAMES.refreshTokenExpiresAt)?.value;

  if (!refreshToken || !refreshTokenExpiresAt) {
    return null;
  }

  return {
    refreshToken,
    refreshTokenExpiresAt
  };
}

export function hasAdminSessionAccess(session: SessionState | null): session is SessionState {
  return Boolean(session && isAllowedAdminUserId(session.userId));
}

export function isExpired(expiresAt: string | undefined | null) {
  const parsed = parseIsoDate(expiresAt ?? undefined);

  if (!parsed) {
    return true;
  }

  return parsed.getTime() <= Date.now();
}

export function hasRefreshableSession(session: SessionState | null): session is SessionState {
  return Boolean(session && !isExpired(session.refreshTokenExpiresAt));
}

export function sessionNeedsAccessRefresh(session: SessionState) {
  return isExpired(session.accessTokenExpiresAt);
}

export async function readSession() {
  const store = (await cookies()) as unknown as CookieReader;
  return readSessionFromStore(store);
}

export function persistSessionToStore(store: MutableCookieStore, session: SessionState) {
  store.set(
    SESSION_COOKIE_NAMES.userId,
    session.userId,
    cookieOptions(session.refreshTokenExpiresAt)
  );
  store.set(
    SESSION_COOKIE_NAMES.accessToken,
    session.accessToken,
    cookieOptions(session.accessTokenExpiresAt)
  );
  store.set(
    SESSION_COOKIE_NAMES.refreshToken,
    session.refreshToken,
    cookieOptions(session.refreshTokenExpiresAt)
  );
  store.set(
    SESSION_COOKIE_NAMES.tenantId,
    session.tenantId,
    cookieOptions(session.refreshTokenExpiresAt)
  );
  store.set(
    SESSION_COOKIE_NAMES.accessTokenExpiresAt,
    session.accessTokenExpiresAt,
    cookieOptions(session.accessTokenExpiresAt)
  );
  store.set(
    SESSION_COOKIE_NAMES.refreshTokenExpiresAt,
    session.refreshTokenExpiresAt,
    cookieOptions(session.refreshTokenExpiresAt)
  );
}

export function clearSessionFromStore(store: MutableCookieStore) {
  store.delete(SESSION_COOKIE_NAMES.userId);
  store.delete(SESSION_COOKIE_NAMES.accessToken);
  store.delete(SESSION_COOKIE_NAMES.refreshToken);
  store.delete(SESSION_COOKIE_NAMES.tenantId);
  store.delete(SESSION_COOKIE_NAMES.accessTokenExpiresAt);
  store.delete(SESSION_COOKIE_NAMES.refreshTokenExpiresAt);
}

function shouldClearSessionOnRefreshError(error: unknown) {
  if (isGrpcUnauthenticatedError(error)) {
    return true;
  }

  if (!(error instanceof GrpcBusinessError)) {
    return false;
  }

  return (
    error.status === "STATUS_CODE_FORBIDDEN" ||
    error.status === "STATUS_CODE_INVALID_ARGUMENT" ||
    error.status === "STATUS_CODE_NOT_FOUND"
  );
}

export async function refreshSessionWithStore(store: MutableCookieStore) {
  const refreshState = readRefreshSessionFromStore(store);

  if (!refreshState || isExpired(refreshState.refreshTokenExpiresAt)) {
    clearSessionFromStore(store);
    return null;
  }

  try {
    const refreshed = await refreshSession({
      refreshToken: refreshState.refreshToken
    });

    if (!hasAdminSessionAccess(refreshed)) {
      clearSessionFromStore(store);
      return null;
    }

    persistSessionToStore(store, refreshed);
    return refreshed;
  } catch (error) {
    if (shouldClearSessionOnRefreshError(error)) {
      clearSessionFromStore(store);
      return null;
    }

    throw error;
  }
}

export async function requirePageSession(nextPath: string) {
  const store = (await cookies()) as unknown as CookieReader;
  const session = readSessionFromStore(store);

  if (!session) {
    const refreshState = readRefreshSessionFromStore(store);

    if (refreshState && !isExpired(refreshState.refreshTokenExpiresAt)) {
      redirect(buildRefreshPath(nextPath));
    }

    redirect(buildLoginPath());
  }

  if (!hasRefreshableSession(session)) {
    redirect(buildLoginPath());
  }

  if (!hasAdminSessionAccess(session)) {
    redirect(buildLoginPath(getAdminAccessErrorMessage()));
  }

  if (sessionNeedsAccessRefresh(session)) {
    redirect(buildRefreshPath(nextPath));
  }

  return session;
}

export async function executeProtectedPageCall<T>(
  nextPath: string,
  operation: (session: SessionState) => Promise<T>
) {
  const session = await requirePageSession(nextPath);

  try {
    return await operation(session);
  } catch (error) {
    if (isGrpcUnauthenticatedError(error) && !isExpired(session.refreshTokenExpiresAt)) {
      redirect(buildRefreshPath(nextPath));
    }

    if (error instanceof GrpcBusinessError && error.status === "STATUS_CODE_FORBIDDEN") {
      redirect(buildHomePath(error.message || "You do not have access to that module."));
    }

    throw error;
  }
}

export async function executeProtectedMutation<T>(
  operation: (session: SessionState, cookieStore: MutableCookieStore) => Promise<T>
) {
  const cookieStore = (await cookies()) as unknown as MutableCookieStore;
  let session = readSessionFromStore(cookieStore);

  if (!session) {
    const refreshed = await refreshSessionWithStore(cookieStore);

    if (!refreshed) {
      clearSessionFromStore(cookieStore);
      redirect(buildLoginPath("Please sign in again."));
    }

    session = refreshed;
  }

  if (!hasRefreshableSession(session)) {
    clearSessionFromStore(cookieStore);
    redirect(buildLoginPath("Please sign in again."));
  }

  if (!hasAdminSessionAccess(session)) {
    clearSessionFromStore(cookieStore);
    redirect(buildLoginPath(getAdminAccessErrorMessage()));
  }

  if (sessionNeedsAccessRefresh(session)) {
    const refreshed = await refreshSessionWithStore(cookieStore);

    if (!refreshed) {
      redirect(buildLoginPath("Your session expired. Please sign in again."));
    }

    session = refreshed;
  }

  try {
    return await operation(session, cookieStore);
  } catch (error) {
    if (!isGrpcUnauthenticatedError(error)) {
      throw error;
    }

    const refreshed = await refreshSessionWithStore(cookieStore);

    if (!refreshed) {
      redirect(buildLoginPath("Your session expired. Please sign in again."));
    }

    return operation(refreshed, cookieStore);
  }
}
