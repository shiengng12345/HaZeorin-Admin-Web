import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { isAllowedAdminCapability } from "@/lib/env";
import { readSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const session = await readSession();
  const canManageApprovalFlows = isAllowedAdminCapability(
    session?.userId ?? "",
    "manageApprovalFlows"
  );
  const canViewReporting = isAllowedAdminCapability(session?.userId ?? "", "viewPlatformReporting");
  const canManageSubscriptions = isAllowedAdminCapability(
    session?.userId ?? "",
    "manageSubscriptions"
  );

  return (
    <AdminShell
      nextPath="/"
      activeView="home"
      moduleTitle="Control hub"
      moduleDescription={
        <>
          Start from a neutral admin home, then move into reporting or subscription modules based
          on the backend capabilities assigned to your operator account.
        </>
      }
    >
      <section className="content-stack">
        {params.message ? <div className="success-banner">{params.message}</div> : null}
        {params.error ? <div className="status-banner">{params.error}</div> : null}

        <section className="module-hero">
          <div className="module-hero-main">
            <div className="module-hero-pills">
              <span className="section-pill">Admin portal</span>
              <span className="section-pill section-pill-muted">Home</span>
            </div>

            <h2 className="module-hero-title">Platform control hub</h2>
            <p className="module-hero-copy">
              This neutral landing page stays usable even when admin capabilities are split per
              module. Move into the workspaces your operator account can actually access from here.
            </p>

            <div className="module-hero-actions">
              {canManageApprovalFlows ? (
                <Link href="/approval-flows" className="button-primary">
                  Open approval flows
                </Link>
              ) : null}
              {canViewReporting ? (
                <Link href="/reporting" className="button-primary">
                  Open reporting
                </Link>
              ) : null}
              {canManageSubscriptions ? (
                <Link href="/subscriptions" className="button-secondary">
                  Open operations
                </Link>
              ) : null}
            </div>
          </div>

          <div className="module-hero-kpis">
            {canViewReporting ? (
              <article className="metric-card">
                <span>Reporting module</span>
                <strong>Live</strong>
                <small>Tenant-scoped operational snapshot through reporting.v1.</small>
              </article>
            ) : null}
            {canManageSubscriptions ? (
              <>
                <article className="metric-card">
                  <span>Subscription ops</span>
                  <strong>Live</strong>
                  <small>Tenant lifecycle operations stay in the shared tenant.v1 surface.</small>
                </article>
                <article className="metric-card">
                  <span>Plan catalog</span>
                  <strong>Live</strong>
                  <small>Productized pricing models remain on subscription.v1.</small>
                </article>
              </>
            ) : null}
            {canManageApprovalFlows ? (
              <article className="metric-card">
                <span>Approval flows</span>
                <strong>Live</strong>
                <small>Draft, validation, publish, and bindings now have an admin workspace.</small>
              </article>
            ) : null}
          </div>
        </section>

        <section className="operations-summary-strip">
          <article className="operations-summary-card">
            <span>Why this page exists</span>
            <strong>Capability-safe entry</strong>
            <small>Users no longer have to land on a module they may not own.</small>
          </article>
          <article className="operations-summary-card">
            <span>Routing</span>
            <strong>Admin-first</strong>
            <small>Portal access is checked first, module capability second.</small>
          </article>
          <article className="operations-summary-card">
            <span>Tenant context</span>
            <strong>Sidebar switcher</strong>
            <small>Reporting and subscription views both follow the active tenant.</small>
          </article>
          <article className="operations-summary-card">
            <span>Backend model</span>
            <strong>Scoped capabilities</strong>
            <small>Subscriptions, approval flows, and reporting can now split access cleanly.</small>
          </article>
        </section>

        <section className="operations-grid">
          <section className="panel command-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Modules</p>
                <h2 className="panel-title">Choose a live workspace</h2>
                <p className="panel-subtitle">
                  Start from the module that matches the backend capability your admin account was
                  granted.
                </p>
              </div>
            </div>

            <div className="workspace-list">
              {canManageApprovalFlows ? (
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Approval flow builder</strong>
                    <span>Maintain templates, validate drafts, and bind them to runtime targets.</span>
                  </div>
                  <Link href="/approval-flows" className="button-secondary">
                    Open
                  </Link>
                </div>
              ) : null}
              {canViewReporting ? (
                <div className="workspace-list-row">
                  <div className="workspace-list-main">
                    <strong>Platform reporting</strong>
                    <span>Current tenant snapshot, queue trend, and approval analytics.</span>
                  </div>
                  <Link href="/reporting" className="button-secondary">
                    Open
                  </Link>
                </div>
              ) : null}
              {canManageSubscriptions ? (
                <>
                  <div className="workspace-list-row">
                    <div className="workspace-list-main">
                      <strong>Subscription operations</strong>
                      <span>Launch, migrate, and cancel tenant subscriptions.</span>
                    </div>
                    <Link href="/subscriptions" className="button-secondary">
                      Open
                    </Link>
                  </div>
                  <div className="workspace-list-row">
                    <div className="workspace-list-main">
                      <strong>Plan catalog</strong>
                      <span>Maintain the reusable pricing and interval library.</span>
                    </div>
                    <Link href="/plans" className="button-secondary">
                      Open
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <aside className="panel insight-panel operations-insight-panel">
            <p className="eyebrow">Current rollout</p>
            <h2 className="insight-title">What changed</h2>
            <ul className="insight-list">
              <li>Capability-specific modules now appear only for operators who can use them.</li>
              <li>The portal no longer hard-lands every admin user in the same operational area.</li>
              <li>Portal root no longer hard-lands every admin user in subscription operations.</li>
              <li>Backend reporting can now honor platform admin reporting capability when workspace role is narrower.</li>
            </ul>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
