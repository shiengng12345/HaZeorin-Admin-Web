type AdminAllowlistEnv = {
  HAZEORIN_ADMIN_USER_IDS: string;
  HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS: string;
  HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS: string;
  HAZEORIN_ADMIN_REPORTING_USER_IDS: string;
};

export type AdminCapability = "manageSubscriptions" | "manageApprovalFlows" | "viewPlatformReporting";

function parseCsvAllowlist(value: string) {
  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function createAdminUserAccessLookup(env: AdminAllowlistEnv) {
  const adminUserIdAllowlist = parseCsvAllowlist(env.HAZEORIN_ADMIN_USER_IDS);
  const adminCapabilityAllowlists = [
    parseCsvAllowlist(env.HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS),
    parseCsvAllowlist(env.HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS),
    parseCsvAllowlist(env.HAZEORIN_ADMIN_REPORTING_USER_IDS)
  ];

  function capabilityAllowlist(capability: AdminCapability) {
    switch (capability) {
      case "manageSubscriptions":
        return adminCapabilityAllowlists[0];
      case "manageApprovalFlows":
        return adminCapabilityAllowlists[1];
      case "viewPlatformReporting":
        return adminCapabilityAllowlists[2];
    }
  }

  return {
    hasConfiguredAdminUserAllowlist() {
      return (
        adminUserIdAllowlist.size > 0 ||
        adminCapabilityAllowlists.some((allowlist) => allowlist.size > 0)
      );
    },
    isAllowedAdminUserId(userId: string) {
      const normalizedUserId = userId.trim();

      return (
        adminUserIdAllowlist.has(normalizedUserId) ||
        adminCapabilityAllowlists.some((allowlist) => allowlist.has(normalizedUserId))
      );
    },
    isAllowedAdminCapability(userId: string, capability: AdminCapability) {
      const normalizedUserId = userId.trim();

      return (
        adminUserIdAllowlist.has(normalizedUserId) ||
        capabilityAllowlist(capability).has(normalizedUserId)
      );
    }
  };
}
