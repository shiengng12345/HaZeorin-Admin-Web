import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction, switchTenantAction } from "@/app/_actions/shell";
import {
  formatMembershipRole,
  formatTenantStatus,
  listMyTenantMemberships
} from "@/lib/grpc/auth-client";
import { isAllowedAdminCapability } from "@/lib/env";
import { executeProtectedPageCall, requirePageSession } from "@/lib/session";
import { buildHomePath } from "@/lib/session-core";

type ShellView =
  | "home"
  | "diagnostics"
  | "approval-flows"
  | "approval-flows-new"
  | "plans"
  | "plans-new"
  | "reporting"
  | "subscriptions";

type AdminShellProps = Readonly<{
  nextPath: string;
  activeView: ShellView;
  moduleTitle: string;
  moduleDescription: React.ReactNode;
  children: React.ReactNode;
}>;

function navLinkClass(active: boolean, accent = false) {
  if (active && accent) {
    return "nav-link nav-link-accent";
  }

  if (active) {
    return "nav-link nav-link-current";
  }

  if (accent) {
    return "nav-link";
  }

  return "nav-link";
}

function sidebarLinkClass(active: boolean) {
  return active ? "sidebar-link sidebar-link-current" : "sidebar-link";
}

export async function AdminShell({
  nextPath,
  activeView,
  moduleTitle,
  moduleDescription,
  children
}: AdminShellProps) {
  const session = await requirePageSession(nextPath);
  const canManageApprovalFlows = isAllowedAdminCapability(
    session.userId,
    "manageApprovalFlows"
  );
  const canViewReporting = isAllowedAdminCapability(session.userId, "viewPlatformReporting");
  const canManageSubscriptions = isAllowedAdminCapability(session.userId, "manageSubscriptions");

  if (
    ((activeView === "approval-flows" || activeView === "approval-flows-new") &&
      !canManageApprovalFlows) ||
    (activeView === "reporting" && !canViewReporting) ||
    ((activeView === "plans" ||
      activeView === "plans-new" ||
      activeView === "subscriptions") &&
      !canManageSubscriptions)
  ) {
    redirect(buildHomePath("You do not have access to that module."));
  }

  const memberships = await executeProtectedPageCall(nextPath, (activeSession) =>
    listMyTenantMemberships(activeSession)
  );
  const currentMembership =
    memberships.find((membership) => membership.tenantId === session.tenantId) ?? null;
  const activeTenantLabel = currentMembership?.tenantName ?? session.tenantId;
  const activeRole = currentMembership
    ? formatMembershipRole(currentMembership.role)
    : "Unknown role";
  const activeStatus = currentMembership
    ? formatTenantStatus(currentMembership.tenantStatus)
    : "Status unavailable";
  const statusClass =
    currentMembership?.tenantStatus === "TENANT_MEMBERSHIP_STATUS_ACTIVE"
      ? "status-chip is-active"
      : "status-chip is-suspended";

  return (
    <main className="page-shell page-shell-app">
      <div className="admin-shell">
        <aside className="portal-sidebar">
          <div className="sidebar-stack">
            <div className="sidebar-brand">
              <span className="brand-mark brand-mark-solid">HZ</span>
              <div>
                <p className="eyebrow">Administrative portal</p>
                <h1 className="portal-title">HaZeorin</h1>
                <p className="portal-subtitle">Operator modules, tenant state, and subscription control.</p>
              </div>
            </div>

            <nav className="sidebar-nav" aria-label="Admin modules">
              <section className="sidebar-section">
                <p className="sidebar-section-label">Workspace</p>
                <div className="sidebar-group">
                  <Link
                    href="/"
                    className={sidebarLinkClass(activeView === "home")}
                  >
                    <span className="sidebar-link-copy">
                      <strong>Control hub</strong>
                      <small>Neutral admin entry</small>
                    </span>
                  </Link>
                  <Link href="/diagnostics" className={sidebarLinkClass(activeView === "diagnostics")}>
                    <span className="sidebar-link-copy">
                      <strong>Tenant diagnostics</strong>
                      <small>Cross-module tenant snapshot</small>
                    </span>
                  </Link>
                </div>
              </section>

              {canManageApprovalFlows ? (
                <section className="sidebar-section">
                  <p className="sidebar-section-label">Live modules</p>
                  <div className="sidebar-group">
                    <div className="sidebar-group-head">
                      <span className="sidebar-group-title">Approval flows</span>
                      <span className="sidebar-group-badge">Active</span>
                    </div>

                    <Link
                      href="/approval-flows"
                      className={sidebarLinkClass(activeView === "approval-flows")}
                    >
                      <span className="sidebar-link-copy">
                        <strong>Flow library</strong>
                        <small>Drafts, publish, and bindings</small>
                      </span>
                    </Link>
                    <Link
                      href="/approval-flows/new"
                      className={sidebarLinkClass(activeView === "approval-flows-new")}
                    >
                      <span className="sidebar-link-copy">
                        <strong>Create flow</strong>
                        <small>Start a new template</small>
                      </span>
                    </Link>
                  </div>
                </section>
              ) : null}

              {canViewReporting ? (
                <section className="sidebar-section">
                  <p className="sidebar-section-label">Live modules</p>
                  <div className="sidebar-group">
                    <div className="sidebar-group-head">
                      <span className="sidebar-group-title">Reporting</span>
                      <span className="sidebar-group-badge">Active</span>
                    </div>

                    <Link
                      href="/reporting"
                      className={sidebarLinkClass(activeView === "reporting")}
                    >
                      <span className="sidebar-link-copy">
                        <strong>Operational snapshot</strong>
                        <small>Tenant reporting workspace</small>
                      </span>
                    </Link>
                  </div>
                </section>
              ) : null}

              {canManageSubscriptions ? (
                <section className="sidebar-section">
                  <p className="sidebar-section-label">Live modules</p>
                  <div className="sidebar-group">
                    <div className="sidebar-group-head">
                      <span className="sidebar-group-title">Subscription</span>
                      <span className="sidebar-group-badge">Active</span>
                    </div>

                    <Link href="/plans" className={sidebarLinkClass(activeView === "plans")}>
                      <span className="sidebar-link-copy">
                        <strong>Plan catalog</strong>
                        <small>Pricing model library</small>
                      </span>
                    </Link>
                    <Link
                      href="/plans/new"
                      className={sidebarLinkClass(activeView === "plans-new")}
                    >
                      <span className="sidebar-link-copy">
                        <strong>Create plan</strong>
                        <small>Launch a new offering</small>
                      </span>
                    </Link>
                    <Link
                      href="/subscriptions"
                      className={sidebarLinkClass(activeView === "subscriptions")}
                    >
                      <span className="sidebar-link-copy">
                        <strong>Subscription operations</strong>
                        <small>Tenant lifecycle workspace</small>
                      </span>
                    </Link>
                  </div>
                </section>
              ) : null}

            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="tenant-card tenant-card-compact">
              <strong>{activeTenantLabel}</strong>
              <span>Active tenant workspace</span>
              <small>{session.tenantId}</small>
            </div>

            <div className="sidebar-status-block">
              <span className={statusClass}>{activeStatus}</span>
              <span className="sidebar-meta-label">{activeRole}</span>
            </div>

            <form action={switchTenantAction} className="sidebar-switcher">
              <input type="hidden" name="returnTo" value={nextPath} />
              <label htmlFor="tenantId" className="sidebar-switcher-label">
                Switch tenant
              </label>
              <select
                id="tenantId"
                name="tenantId"
                defaultValue={session.tenantId}
                disabled={memberships.length === 0}
              >
                {memberships.map((membership) => (
                  <option key={membership.tenantId} value={membership.tenantId}>
                    {membership.tenantName} · {formatMembershipRole(membership.role)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="button-secondary sidebar-switcher-button"
                disabled={memberships.length === 0}
              >
                Apply tenant
              </button>
            </form>

            <form action={logoutAction}>
              <button type="submit" className="button-ghost sidebar-logout">
                Logout
              </button>
            </form>
          </div>
        </aside>

        <div className="portal-shell">
          <div className="portal-toolbar">
            <div className="toolbar-search">
              <input
                type="search"
                placeholder="Search flows, plans, tenants, or modules"
                aria-label="Search workspace"
              />
            </div>

            <div className="toolbar-actions">
              <span className="toolbar-indicator">Operator session</span>
              <span className="toolbar-dot" aria-hidden="true" />
              <div className="operator-chip">
                <strong>{activeTenantLabel}</strong>
                <small>{activeRole}</small>
              </div>
            </div>
          </div>

          <header className="portal-header">
            <div className="brand-block">
              <div>
                <p className="eyebrow">Current module</p>
                <h1 className="portal-title">{moduleTitle}</h1>
                <p className="portal-subtitle">{moduleDescription}</p>
              </div>

              <div className="header-summary">
                <span className="module-badge">Active module</span>
                <div className="header-summary-card">
                  <span>Tenant context</span>
                  <strong>{activeTenantLabel}</strong>
                  <small>{activeStatus}</small>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <nav className="header-nav">
                <Link
                  href="/"
                  className={navLinkClass(activeView === "home")}
                >
                  Home
                </Link>
                <Link
                  href="/diagnostics"
                  className={navLinkClass(activeView === "diagnostics")}
                >
                  Diagnostics
                </Link>
                {canManageApprovalFlows ? (
                  <>
                    <Link
                      href="/approval-flows"
                      className={navLinkClass(activeView === "approval-flows")}
                    >
                      Flows
                    </Link>
                    <Link
                      href="/approval-flows/new"
                      className={navLinkClass(activeView === "approval-flows-new", true)}
                    >
                      New flow
                    </Link>
                  </>
                ) : null}
                {canViewReporting ? (
                  <Link href="/reporting" className={navLinkClass(activeView === "reporting")}>
                    Reporting
                  </Link>
                ) : null}
                {canManageSubscriptions ? (
                  <>
                    <Link
                      href="/subscriptions"
                      className={navLinkClass(activeView === "subscriptions")}
                    >
                      Operations
                    </Link>
                    <Link href="/plans" className={navLinkClass(activeView === "plans")}>
                      All plans
                    </Link>
                    <Link
                      href="/plans/new"
                      className={navLinkClass(activeView === "plans-new", true)}
                    >
                      Create plan
                    </Link>
                  </>
                ) : null}
              </nav>
            </div>
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}
