import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";

type LoginPageProps = {
  searchParams: Promise<{ message?: string; next?: string; email?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/workbench";
  const prefillEmail = params.email ?? "";
  const auth = await getAuthSummary();

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
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
          <p className="section-label">Workspace access</p>
          <h1 id="login-title">Sign in</h1>
          <p className="auth-copy">Sign in to access your organization&apos;s safety management workspace.</p>
        </div>
        {auth.signedIn ? <p className="form-message">You are already signed in as {auth.userEmail}.</p> : null}
        {params.message ? <p className="form-message">{params.message}</p> : null}
        {auth.signedIn ? (
          <Link className="button-primary auth-continue" href={auth.needsOnboarding ? "/onboarding" : next}>
            Continue to workspace
          </Link>
        ) : (
          <>
            <p className="auth-note">Check your inbox to confirm your email address before signing in for the first time.</p>
            <form action={signInAction} className="auth-form">
              <input type="hidden" name="next" value={next} />
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required defaultValue={prefillEmail} />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button className="button-primary" type="submit">
                Sign in
              </button>
            </form>
            <p className="auth-switch">
              Forgot your password? <Link href="/forgot-password">Send a reset link</Link>
            </p>
            <p className="auth-switch">
              New to PredictSafeBIO? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
