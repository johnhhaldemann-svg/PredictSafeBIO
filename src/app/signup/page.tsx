import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { signUpAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";

type SignupPageProps = {
  searchParams: Promise<{ message?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/onboarding";
  const auth = await getAuthSummary();

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <div className="auth-brand">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>PredictSafeBIO</strong>
            <span>AI Engine MVP</span>
          </div>
        </div>
        <div>
          <p className="section-label">Create access</p>
          <h1 id="signup-title">Sign up</h1>
          <p className="auth-copy">Create a Supabase Auth user, then finish onboarding to seed your organization and company profile.</p>
        </div>
        {auth.signedIn ? (
          <p className="form-message">
            You are signed in as {auth.userEmail}. Continue to {auth.needsOnboarding ? "onboarding" : "the Workbench"}.
          </p>
        ) : null}
        {params.message ? <p className="form-message">{params.message}</p> : null}
        <p className="auth-note">Email confirmation should be enabled for MVP hardening. If signup email throttling appears, configure custom SMTP before heavier testing.</p>
        <form action={signUpAction} className="auth-form">
          <input type="hidden" name="next" value={next} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="button-primary" type="submit">
            Create account
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </p>
        {auth.signedIn ? (
          <p className="auth-switch">
            <Link href={auth.needsOnboarding ? "/onboarding" : "/workbench"}>Continue</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
