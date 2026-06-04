import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * Custom 404 page — shown when a route is not found.
 * Uses the auth-page layout (no AppShell) since the user may not be signed in.
 */
export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="not-found-title">
        <div className="auth-brand">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>PredictSafeBIO</strong>
            <span>Biosafety Intelligence</span>
          </div>
        </div>
        <div>
          <p className="section-label">Page not found</p>
          <h1 id="not-found-title">404</h1>
          <p className="auth-copy">
            This page does not exist or has been moved. Use the links below to find your way back.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link className="button-primary auth-continue" href="/workbench">
            Go to Workbench
          </Link>
          <Link className="button-secondary auth-continue" href="/login">
            Sign in
          </Link>
        </div>
        <p className="auth-switch">
          <Link href="/assessments">Risk Register</Link>
          {" · "}
          <Link href="/documents">Documents</Link>
          {" · "}
          <Link href="/operations">Operations</Link>
        </p>
      </section>
    </main>
  );
}
