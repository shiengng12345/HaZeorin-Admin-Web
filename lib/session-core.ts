import { GrpcBusinessError, isGrpcUnauthenticatedError } from "./grpc/errors";

export const SESSION_COOKIE_NAMES = {
  userId: "hz_admin_user_id",
  accessToken: "hz_admin_access_token",
  refreshToken: "hz_admin_refresh_token",
  tenantId: "hz_admin_tenant_id",
  accessTokenExpiresAt: "hz_admin_access_expires_at",
  refreshTokenExpiresAt: "hz_admin_refresh_expires_at"
} as const;

export type SessionState = {
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

type CookieValue = {
  value: string;
};

export type CookieReader = {
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

export type LoginFn = (payload: {
  email: string;
  password: string;
  tenantId?: string;
}) => Promise<SessionState>;

export type SwitchTenantFn = (payload: {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
}) => Promise<SessionState>;

export type RefreshSessionFn = (payload: {
  refreshToken: string;
}) => Promise<SessionState>;

export type LogoutSessionFn = (payload: {
  accessToken: string;
  refreshToken: string;
}) => Promise<unknown>;

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

export function buildHomePath(message?: string) {
  if (!message) {
    return "/";
  }

  const search = new URLSearchParams({ error: message });
  return `/?${search.toString()}`;
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

export function persistSessionToStore(
  store: MutableCookieStore,
  session: SessionState
) {
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

export async function loginSessionWithStore(
  store: MutableCookieStore,
  payload: Parameters<LoginFn>[0],
  login: LoginFn
) {
  const session = await login(payload);
  persistSessionToStore(store, session);
  return session;
}

export async function switchTenantSessionWithStore(
  store: MutableCookieStore,
  session: SessionState,
  tenantId: string,
  switchTenant: SwitchTenantFn
) {
  const nextSession = await switchTenant({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    tenantId
  });
  persistSessionToStore(store, nextSession);
  return nextSession;
}

export async function refreshSessionWithStore(
  store: MutableCookieStore,
  refreshSession: RefreshSessionFn
) {
  const refreshState = readRefreshSessionFromStore(store);

  if (!refreshState || isExpired(refreshState.refreshTokenExpiresAt)) {
    clearSessionFromStore(store);
    return null;
  }

  try {
    const refreshed = await refreshSession({
      refreshToken: refreshState.refreshToken
    });
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

export async function logoutSessionWithStore(
  store: MutableCookieStore,
  session: SessionState,
  logoutSession: LogoutSessionFn
) {
  await logoutSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken
  });

  clearSessionFromStore(store);
}
