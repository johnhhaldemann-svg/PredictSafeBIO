"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

/**
 * Global error boundary — shown when an unhandled error occurs in the app.
 * Must be a client component (Next.js requirement).
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging; replace with a real error reporter in production
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="error-title">
        <div className="auth-brand">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>PredictSafeBIO</strong>
            <span>Biosafety Intelligence</span>
          </div>
        </div>
        <div className="auth-hardening-warning" role="alert">
          <AlertTriangle size={15} />
          <span>
            <strong>Something went wrong.</strong> An unexpected error occurred. Your data has not been affected.
          </span>
        </div>
        <div>
          <p className="section-label">Application error</p>
          <h1 id="error-title">Unexpected error</h1>
          <p className="auth-copy">
            This page encountered an error. You can try again or return to your workspace.
            {error.digest && (
              <span className="muted" style={{ display: "block", marginTop: "0.5rem", fontSize: "0.75rem" }}>
                Reference: {error.digest}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button className="button-primary" onClick={reset}>
            Try again
          </button>
          <Link className="button-secondary auth-continue" href="/workbench">
            Return to Workbench
          </Link>
        </div>
      </section>
    </main>
  );
}
