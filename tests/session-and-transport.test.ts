import assert from "node:assert/strict";
import test from "node:test";

import { createAdminUserAccessLookup } from "../lib/admin-allowlist";
import { filterActiveTenantMemberships } from "../lib/auth-memberships";
import { GrpcTransportError } from "../lib/grpc/errors";
import {
  assertBackendGrpcTransportAllowed,
  isLoopbackGrpcTarget
} from "../lib/grpc/transport";
import {
  SESSION_COOKIE_NAMES,
  buildHomePath,
  hasRefreshableSession,
  loginSessionWithStore,
  logoutSessionWithStore,
  readSessionFromStore,
  refreshSessionWithStore,
  switchTenantSessionWithStore,
  type MutableCookieStore,
  type SessionState
} from "../lib/session-core";

class TestCookieStore implements MutableCookieStore {
  private readonly store = new Map<string, string>();

  get(name: string) {
    const value = this.store.get(name);
    return value ? { value } : undefined;
  }

  set(name: string, value: string) {
    this.store.set(name, value);
  }

  delete(name: string) {
    this.store.delete(name);
  }
}

function buildSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    userId: "admin_1",
    tenantId: "tenant_1",
    accessToken: "atk.v1.initial",
    refreshToken: "rtk.v1.initial",
    accessTokenExpiresAt: "2099-01-01T00:10:00Z",
    refreshTokenExpiresAt: "2099-01-01T01:00:00Z",
    ...overrides
  };
}

test("admin login -> switch tenant -> refresh keeps the protected session chain healthy", async () => {
  const store = new TestCookieStore();
  const loggedIn = buildSession();
  const switched = buildSession({
    tenantId: "tenant_2",
    accessToken: "atk.v1.switched",
    refreshToken: "rtk.v1.switched"
  });
  const refreshed = buildSession({
    tenantId: "tenant_2",
    accessToken: "atk.v1.refreshed",
    refreshToken: "rtk.v1.refreshed",
    accessTokenExpiresAt: "2099-01-01T00:20:00Z",
    refreshTokenExpiresAt: "2099-01-01T02:00:00Z"
  });

  await loginSessionWithStore(
    store,
    {
      email: "admin@hazeorin.test",
      password: "secret"
    },
    async (payload) => {
      assert.equal(payload.email, "admin@hazeorin.test");
      return loggedIn;
    }
  );
  assert.deepEqual(readSessionFromStore(store), loggedIn);

  const currentSession = readSessionFromStore(store);
  assert.ok(currentSession);

  await switchTenantSessionWithStore(
    store,
    currentSession,
    "tenant_2",
    async (payload) => {
      assert.equal(payload.accessToken, loggedIn.accessToken);
      assert.equal(payload.refreshToken, loggedIn.refreshToken);
      assert.equal(payload.tenantId, "tenant_2");
      return switched;
    }
  );
  assert.deepEqual(readSessionFromStore(store), switched);

  const nextSession = await refreshSessionWithStore(store, async (payload) => {
    assert.equal(payload.refreshToken, switched.refreshToken);
    return refreshed;
  });

  assert.deepEqual(nextSession, refreshed);
  assert.deepEqual(readSessionFromStore(store), refreshed);
  assert.equal(hasRefreshableSession(readSessionFromStore(store)), true);
});

test("admin refresh still works after the browser drops access cookies", async () => {
  const store = new TestCookieStore();
  const loggedIn = buildSession();
  const refreshed = buildSession({
    accessToken: "atk.v1.refreshed",
    refreshToken: "rtk.v1.refreshed",
    accessTokenExpiresAt: "2099-01-01T00:20:00Z",
    refreshTokenExpiresAt: "2099-01-01T02:00:00Z"
  });

  await loginSessionWithStore(
    store,
    {
      email: "admin@hazeorin.test",
      password: "secret"
    },
    async () => loggedIn
  );

  store.delete(SESSION_COOKIE_NAMES.accessToken);
  store.delete(SESSION_COOKIE_NAMES.accessTokenExpiresAt);
  assert.equal(readSessionFromStore(store), null);

  const nextSession = await refreshSessionWithStore(store, async (payload) => {
    assert.equal(payload.refreshToken, loggedIn.refreshToken);
    return refreshed;
  });

  assert.deepEqual(nextSession, refreshed);
  assert.deepEqual(readSessionFromStore(store), refreshed);
});

test("admin refresh preserves the existing session when transport fails", async () => {
  const store = new TestCookieStore();
  const loggedIn = buildSession();

  await loginSessionWithStore(
    store,
    {
      email: "admin@hazeorin.test",
      password: "secret"
    },
    async () => loggedIn
  );

  await assert.rejects(
    () =>
      refreshSessionWithStore(store, async () => {
        throw new GrpcTransportError("backend unavailable", 14);
      }),
    /backend unavailable/
  );

  assert.deepEqual(readSessionFromStore(store), loggedIn);
});

test("admin logout sends the current tokens to the backend before clearing local cookies", async () => {
  const store = new TestCookieStore();
  const loggedIn = buildSession();

  await loginSessionWithStore(
    store,
    {
      email: "admin@hazeorin.test",
      password: "secret"
    },
    async () => loggedIn
  );

  await logoutSessionWithStore(store, loggedIn, async (payload) => {
    assert.equal(payload.accessToken, loggedIn.accessToken);
    assert.equal(payload.refreshToken, loggedIn.refreshToken);
    return true;
  });

  assert.equal(readSessionFromStore(store), null);
});

test("admin membership filtering hides suspended tenant rows from the switcher", () => {
  const memberships = filterActiveTenantMemberships([
    { tenantId: "tenant_1", tenantStatus: "TENANT_MEMBERSHIP_STATUS_ACTIVE" },
    { tenantId: "tenant_2", tenantStatus: "TENANT_MEMBERSHIP_STATUS_SUSPENDED" }
  ]);

  assert.deepEqual(memberships, [
    { tenantId: "tenant_1", tenantStatus: "TENANT_MEMBERSHIP_STATUS_ACTIVE" }
  ]);
});

test("admin allowlist accepts users from global or capability-specific configuration", () => {
  const access = createAdminUserAccessLookup({
    HAZEORIN_ADMIN_USER_IDS: "global_admin",
    HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS: "subscription_admin",
    HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS: "flow_admin",
    HAZEORIN_ADMIN_REPORTING_USER_IDS: "reporting_admin"
  });

  assert.equal(access.hasConfiguredAdminUserAllowlist(), true);
  assert.equal(access.isAllowedAdminUserId("global_admin"), true);
  assert.equal(access.isAllowedAdminUserId("subscription_admin"), true);
  assert.equal(access.isAllowedAdminUserId("flow_admin"), true);
  assert.equal(access.isAllowedAdminUserId("reporting_admin"), true);
  assert.equal(access.isAllowedAdminUserId("outsider"), false);
});

test("admin allowlist resolves capability access independently", () => {
  const access = createAdminUserAccessLookup({
    HAZEORIN_ADMIN_USER_IDS: "",
    HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS: "subscription_admin",
    HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS: "flow_admin",
    HAZEORIN_ADMIN_REPORTING_USER_IDS: "reporting_admin"
  });

  assert.equal(access.isAllowedAdminCapability("subscription_admin", "manageSubscriptions"), true);
  assert.equal(access.isAllowedAdminCapability("subscription_admin", "manageApprovalFlows"), false);
  assert.equal(access.isAllowedAdminCapability("flow_admin", "manageApprovalFlows"), true);
  assert.equal(access.isAllowedAdminCapability("reporting_admin", "viewPlatformReporting"), true);
  assert.equal(access.isAllowedAdminCapability("outsider", "manageSubscriptions"), false);
});

test("admin home path keeps access-denied messages on the control hub", () => {
  assert.equal(buildHomePath(), "/");
  assert.equal(buildHomePath("You do not have access to that module."), "/?error=You+do+not+have+access+to+that+module.");
});

test("admin gRPC transport rejects remote insecure targets and accepts tls", () => {
  assert.equal(isLoopbackGrpcTarget("127.0.0.1:50051"), true);
  assert.equal(isLoopbackGrpcTarget("localhost:50051"), true);
  assert.equal(isLoopbackGrpcTarget("10.20.0.8:50051"), false);

  assert.doesNotThrow(() =>
    assertBackendGrpcTransportAllowed({
      address: "127.0.0.1:50051",
      transport: "insecure"
    })
  );

  assert.throws(
    () =>
      assertBackendGrpcTransportAllowed({
        address: "10.20.0.8:50051",
        transport: "insecure"
      }),
    /Remote insecure gRPC target is not allowed/
  );

  assert.doesNotThrow(() =>
    assertBackendGrpcTransportAllowed({
      address: "grpc.internal.example:50051",
      transport: "tls"
    })
  );
});
