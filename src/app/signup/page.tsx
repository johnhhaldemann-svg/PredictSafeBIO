import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { signUpAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";

/**
 * Set NEXT_PUBLIC_EMAIL_CONFIRMATION_DISABLED=true in .env.local
 * while email confirmation is intentionally off (e.g. during local smoke testing).
 * Remove or set to false before any public-facing demo or pilot.
 */
const emailConfirmationDisabled =
  process.env.NEXT_PUBLIC_EMAIL_CONFIRMATION_DISABLED === "true";

type SignupPageProps = {
  searchParams: Promise<{ message?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/onboarding";
  const auth = await getAuthSummary();
  const continueHref = auth.needsOnboarding ? "/onboarding" : next === "/onboarding" ? "/workbench" : next;

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
          <p className="auth-copy">
            Create a Supabase Auth user, then finish onboarding to seed your organization and company profile.
          </p>
        </div>
        {auth.signedIn ? (
          <p className="form-message">
            You are signed in as {auth.userEmail}. Continue to{" "}
            {auth.needsOnboarding ? "onboarding" : "the Workbench"}.
          </p>
        ) : null}
        {emailConfirmationDisabled && !auth.signedIn && (
          <div className="auth-hardening-warning" role="alert">
            <AlertTriangle size={15} />
            <span>
              <strong>Email confirmation is disabled.</strong> Unverified signups are a spam and abuse
              vector. Re-enable email confirmation in Supabase Auth settings and configure custom SMTP
              before any public-facing demo or pilot. Remove{" "}
              <code>NEXT_PUBLIC_EMAIL_CONFIRMATION_DISABLED=true</code> from <code>.env.local</code>{" "}
              when done.
            </span>
          </div>
        )}
        {params.message ? <p className="form-message">{params.message}</p> : null}
        {auth.signedIn ? (
          <Link className="button-primary auth-continue" href={continueHref}>
            Continue
          </Link>
        ) : (
          <>
            <p className="auth-note">
              Email confirmation should be enabled for MVP hardening. If signup email throttling
              appears, configure custom SMTP before heavier testing.
            </p>
            <form action={signUpAction} className="auth-form">
              <input type="hidden" name="next" value={next} />
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Password
                <PasswordStrengthMeter name="password" minLength={8} required autoComplete="new-password" />
              </label>
              <button className="button-primary" type="submit">
                Create account
              </button>
            </form>
            <p className="auth-switch">
              Already have an account?{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
