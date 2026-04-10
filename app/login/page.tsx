import Image from "next/image";
import { redirect } from "next/navigation";

import { loginAction } from "./actions";
import { getAdminAccessErrorMessage } from "@/lib/env";
import {
  buildRefreshPath,
  hasAdminSessionAccess,
  hasRefreshableSession,
  readSession,
  sessionNeedsAccessRefresh
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const session = await readSession();
  const accessError =
    params.error ?? (session && !hasAdminSessionAccess(session) ? getAdminAccessErrorMessage() : undefined);

  if (hasRefreshableSession(session) && hasAdminSessionAccess(session)) {
    if (sessionNeedsAccessRefresh(session)) {
      redirect(buildRefreshPath("/"));
    }

    redirect("/");
  }

  return (
    <main className="page-shell auth-stage">
      <section className="auth-portal">
        <section className="auth-showcase admin-auth-showcase">
          <div className="auth-showcase-top">
            <div>
              <span className="auth-wordmark">HaZeorin Admin</span>
              <p className="auth-wordmark-sub">Platform governance workspace</p>
            </div>
            <span className="auth-badge">Operator portal</span>
          </div>

          <div className="auth-illustration-card">
            <Image
              src="/assets/prototype-login-illustration.png"
              alt="HaZeorin admin workspace illustration"
              width={780}
              height={620}
              className="auth-illustration-image"
              priority
            />
          </div>

          <div className="auth-showcase-copy">
            <span className="auth-chip">Platform control</span>
            <h1 className="auth-title">Operate subscriptions with one calm workspace.</h1>
            <p className="auth-copy">
              Tenant context is assigned after sign in, so the admin portal starts from operator
              identity first and moves into workspace control second.
            </p>
          </div>

          <div className="auth-showcase-foot">
            <span>Admin-first sign in</span>
            <span>Server-side gRPC only</span>
            <span>Tenant switcher in shell</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-top">
            <span className="auth-panel-link">Support</span>
          </div>

          <div className="auth-panel-shell">
            <div className="auth-panel-head">
              <p className="eyebrow">Security portal</p>
              <h2 className="panel-title">Access your admin workspace</h2>
              <p className="panel-subtitle">
                Sign in with your operator credentials. Tenant bootstrap now happens on the server.
              </p>
            </div>

            {accessError ? <div className="status-banner">{accessError}</div> : null}

            <form action={loginAction} className="field-grid">
              <div className="field">
                <label htmlFor="email">Business email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={params.email ?? ""}
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="password">Password</label>
                  <span className="field-meta-link">Forgot password?</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <label className="checkbox-field auth-checkbox-row">
                <input type="checkbox" name="rememberDevice" value="true" />
                <span>Remember this device for 30 days</span>
              </label>

              <div className="button-row">
                <button type="submit" className="button-primary auth-submit-button">
                  Sign in
                </button>
              </div>
            </form>

            <div className="auth-panel-footer">
              <div className="auth-panel-footer-copy">
                <span>Need access to HaZeorin Admin?</span>
                <strong>Contact system administrator</strong>
              </div>

              <div className="auth-legal-links">
                <span>Privacy policy</span>
                <span>Terms of service</span>
                <span>Security</span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
