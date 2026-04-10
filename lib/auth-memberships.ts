export type TenantMembershipLike = {
  tenantStatus: string;
};

export function isActiveTenantMembershipStatus(status: string) {
  return status === "TENANT_MEMBERSHIP_STATUS_ACTIVE";
}

export function filterActiveTenantMemberships<T extends TenantMembershipLike>(memberships: T[]) {
  return memberships.filter((membership) =>
    isActiveTenantMembershipStatus(membership.tenantStatus)
  );
}
