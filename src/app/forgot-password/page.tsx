import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { requestPasswordResetAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const auth = await getAuthSummary();

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <div className="auth-brand">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>PredictSafeBIO</strong>
            <span>Account recovery</span>
          </div>
        </div>
        <div>
          <p className="section-label">Password reset</p>
          <h1 id="forgot-password-title">Reset your password</h1>
          <p className="auth-copy">Enter your email and we&apos;ll send you a link to reset your password.</p>
        </div>
        {params.message ? <p className="form-message">{params.message}</p> : null}
        {auth.signedIn ? (
          <Link className="button-primary auth-continue" href="/account/password">
            Update signed-in password
          </Link>
        ) : (
          <form action={requestPasswordResetAction} className="auth-form">
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <button className="button-primary" type="submit">
              <KeyRound size={16} />
              Send reset link
            </button>
          </form>
        )}
        <p className="auth-switch">
          Remembered it? <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
