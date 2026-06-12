import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { updatePasswordAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";

type PasswordPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function PasswordPage({ searchParams }: PasswordPageProps) {
  const params = await searchParams;
  const auth = await getAuthSummary();

  if (!auth.signedIn) {
    redirect("/login?next=/account/password&message=Open the reset email link or sign in before changing your password.");
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="password-title">
        <div className="auth-brand">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>PredictSafe</strong>
            <span>Account security</span>
          </div>
        </div>
        <div>
          <p className="section-label">Password update</p>
          <h1 id="password-title">Set a new password</h1>
          <p className="auth-copy">
            Update the password for {auth.userEmail}. Use this page after a recovery link or while signed in.
          </p>
        </div>
        {params.message ? <p className="form-message">{params.message}</p> : null}
        <form action={updatePasswordAction} className="auth-form">
          <label>
            New password
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label>
            Confirm new password
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="button-primary" type="submit">
            <KeyRound size={16} />
            Update password
          </button>
        </form>
        <p className="auth-switch">
          No change needed? <Link href={auth.needsOnboarding ? "/onboarding" : "/workbench"}>Return to workspace</Link>
        </p>
      </section>
    </main>
  );
}
