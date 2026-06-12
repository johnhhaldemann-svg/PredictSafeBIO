"use client";

import { useRef, useState, Fragment } from "react";
import {
  ArrowLeft, ArrowRight, Building2, FlaskConical, Users,
  Layers, CheckCircle2, ShieldCheck, ClipboardCheck,
  LayoutDashboard, BookOpen, HeartPulse, Loader2,
} from "lucide-react";
import { completeFullOnboardingAction } from "@/app/auth/actions";
import { SETUP_QUESTIONS } from "@/lib/manual/setup-questions";
import { demoCompanyProfile } from "@/lib/demo-data";

// ── Domain grouping ──────────────────────────────────────────────────────────
// Unique domains in question-number order (preserving first-appearance order).
const Q_DOMAINS = [...new Set(SETUP_QUESTIONS.map((q) => q.domain))];

// ── Step definitions ─────────────────────────────────────────────────────────
type StepKind = "welcome" | "name" | "company" | "vertical" | "context" | "domain" | "review";
interface Step {
  kind: StepKind;
  label: string;
  domain?: string;
}

function buildSteps(isInvitee: boolean): Step[] {
  if (isInvitee) {
    return [
      { kind: "welcome", label: "Welcome" },
      { kind: "name",    label: "Your profile" },
      { kind: "review",  label: "Join workspace" },
    ];
  }
  return [
    { kind: "welcome",  label: "Welcome" },
    { kind: "name",     label: "Your profile" },
    { kind: "company",  label: "Your company" },
    { kind: "vertical", label: "Industry" },
    { kind: "context",  label: "Operations" },
    ...Q_DOMAINS.map((d) => ({ kind: "domain" as const, label: d, domain: d })),
    { kind: "review", label: "Review & launch" },
  ];
}

// ── Owner & member capability lists ─────────────────────────────────────────
const OWNER_CAPS = [
  { icon: ShieldCheck,     text: "Full risk & compliance access" },
  { icon: ClipboardCheck,  text: "Inspections & CAPA" },
  { icon: Users,           text: "Team management & invites" },
  { icon: BookOpen,        text: "Reports & audit log" },
];
const MEMBER_CAPS = [
  { icon: LayoutDashboard, text: "Personal safety dashboard" },
  { icon: HeartPulse,      text: "Hazard & ergonomic screenings" },
  { icon: BookOpen,        text: "Browse all 29 safety programs" },
  { icon: ClipboardCheck,  text: "Track your assigned tasks" },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  isInvitee: boolean;
  inviteeRole?: string;
  inviteeOrgName?: string;
  blockedNoInvite?: boolean;
}

// ── Wizard component ─────────────────────────────────────────────────────────
export function OnboardingWizard({
  isInvitee,
  inviteeRole,
  inviteeOrgName,
  blockedNoInvite,
}: Props) {
  const STEPS = buildSteps(isInvitee);
  const [step, setStep]           = useState(0);
  const [values, setValues]       = useState<Record<string, string>>({
    vertical: "biotech_pharma",
  });
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const current  = STEPS[step];
  const isFirst  = step === 0;
  const isLast   = step === STEPS.length - 1;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setFieldError("");
  }

  function validate(): boolean {
    if (current.kind === "name" && !values.fullName?.trim()) {
      setFieldError("Please enter your full name.");
      return false;
    }
    if (current.kind === "company") {
      if (!values.organizationName?.trim()) {
        setFieldError("Please enter your organization name.");
        return false;
      }
      if (!values.companyName?.trim()) {
        setFieldError("Please enter your company name.");
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validate()) return;
    if (isLast) {
      setSubmitting(true);
      formRef.current?.requestSubmit();
      return;
    }
    setStep((s) => s + 1);
    setFieldError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((s) => s - 1);
    setFieldError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Step renderers ────────────────────────────────────────────────────────
  function renderContent() {
    switch (current.kind) {
      case "welcome":
        return renderWelcome();
      case "name":
        return renderName();
      case "company":
        return renderCompany();
      case "vertical":
        return renderVertical();
      case "context":
        return renderContext();
      case "domain":
        return renderDomain(current.domain!);
      case "review":
        return renderReview();
    }
  }

  function renderWelcome() {
    if (isInvitee) {
      return (
        <div className="wizard-welcome">
          <div className="wizard-welcome-icon">
            <Users size={32} />
          </div>
          <h2>You&apos;ve been invited{inviteeOrgName ? ` to ${inviteeOrgName}` : ""}</h2>
          <p>
            You&apos;re joining as a <strong>{inviteeRole ?? "Team Member"}</strong>. Just fill in your name on
            the next screen and you&apos;re ready to go — takes about 30 seconds.
          </p>
          <div className="wizard-caps-grid">
            {MEMBER_CAPS.map((c) => (
              <div className="wizard-cap" key={c.text}>
                <c.icon size={14} />
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="wizard-welcome">
        <div className="wizard-welcome-icon">
          <ShieldCheck size={32} />
        </div>
        <h2>Welcome to PredictSafe</h2>
        <p>
          This setup takes about 5 minutes. We&apos;ll ask a few questions about your company and
          operations so we can activate the right safety programs, seed your Risk Register, and
          build your Compliance Calendar automatically.
        </p>
        <div className="wizard-caps-grid">
          {OWNER_CAPS.map((c) => (
            <div className="wizard-cap" key={c.text}>
              <c.icon size={14} />
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderName() {
    return (
      <div className="form-grid">
        <label className="form-label-block">
          Your full name
          <input
            autoFocus
            placeholder="e.g. Dr. Jane Smith"
            value={values.fullName ?? ""}
            onChange={(e) => set("fullName", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
          />
        </label>
      </div>
    );
  }

  function renderCompany() {
    return (
      <div className="form-grid">
        <label className="form-label-block">
          Organization name
          <input
            autoFocus
            placeholder={demoCompanyProfile.companyName}
            value={values.organizationName ?? ""}
            onChange={(e) => set("organizationName", e.target.value)}
          />
          <small className="field-hint">The legal entity or workspace name (e.g. Acme Biotech LLC)</small>
        </label>
        <label className="form-label-block">
          Company name
          <input
            placeholder={demoCompanyProfile.companyName}
            value={values.companyName ?? ""}
            onChange={(e) => set("companyName", e.target.value)}
          />
          <small className="field-hint">How it appears in reports and documents — can match above</small>
        </label>
        <label className="form-label-block">
          Primary site <span className="field-optional">(optional)</span>
          <input
            placeholder={demoCompanyProfile.primarySite}
            value={values.primarySite ?? ""}
            onChange={(e) => set("primarySite", e.target.value)}
          />
        </label>
      </div>
    );
  }

  function renderVertical() {
    return (
      <div className="onboarding-vertical-choice" role="radiogroup" aria-label="Industry vertical">
        <label className="onboarding-vertical-option">
          <input
            type="radio"
            name="vertical_ui"
            value="biotech_pharma"
            checked={values.vertical === "biotech_pharma"}
            onChange={() => set("vertical", "biotech_pharma")}
          />
          <span>
            <FlaskConical size={16} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle" }} />
            <strong>Biotech / Pharma</strong>
            <small>Labs, cleanrooms, biosafety — PredictSafe BIO</small>
          </span>
        </label>
        <label className="onboarding-vertical-option">
          <input
            type="radio"
            name="vertical_ui"
            value="general_manufacturing"
            checked={values.vertical === "general_manufacturing"}
            onChange={() => set("vertical", "general_manufacturing")}
          />
          <span>
            <Layers size={16} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle" }} />
            <strong>General Manufacturing</strong>
            <small>Production, assembly, warehousing — PredictSafe MFG</small>
          </span>
        </label>
      </div>
    );
  }

  function renderContext() {
    return (
      <div className="form-grid wide-fields">
        <p className="wizard-context-note">
          All fields are optional — fill in what you know now. This personalizes your workspace and can be updated anytime in Settings.
        </p>
        <label className="form-label-block">
          Operating areas
          <textarea
            rows={3}
            placeholder={demoCompanyProfile.operatingAreas.join("\n")}
            value={values.operatingAreas ?? ""}
            onChange={(e) => set("operatingAreas", e.target.value)}
          />
          <small className="field-hint">One area per line, e.g. BSL-2 Research Lab</small>
        </label>
        <label className="form-label-block">
          Biosafety levels in use
          <textarea
            rows={2}
            placeholder={demoCompanyProfile.biosafetyLevels.join("\n")}
            value={values.biosafetyLevels ?? ""}
            onChange={(e) => set("biosafetyLevels", e.target.value)}
          />
        </label>
        <label className="form-label-block">
          Active programs
          <textarea
            rows={2}
            placeholder={demoCompanyProfile.programs.join("\n")}
            value={values.programs ?? ""}
            onChange={(e) => set("programs", e.target.value)}
          />
          <small className="field-hint">Safety or quality programs already in place</small>
        </label>
        <label className="form-label-block">
          Quality system scope <span className="field-optional">(optional)</span>
          <textarea
            rows={2}
            placeholder={demoCompanyProfile.qualitySystemScope.join("\n")}
            value={values.qualityScope ?? ""}
            onChange={(e) => set("qualityScope", e.target.value)}
          />
        </label>
      </div>
    );
  }

  function renderDomain(domain: string) {
    const qs = SETUP_QUESTIONS.filter((q) => q.domain === domain);
    return (
      <div className="stacked-form">
        {qs.map((q) => (
          <div key={q.number} className="qn-block">
            <label>
              {q.number}. {q.text}
            </label>
            {q.kind === "boolean" ? (
              <select
                value={values[`q_${q.number}`] ?? ""}
                onChange={(e) => set(`q_${q.number}`, e.target.value)}
              >
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="Enter details"
                value={values[`q_${q.number}`] ?? ""}
                onChange={(e) => set(`q_${q.number}`, e.target.value)}
              />
            )}
            <input
              type="text"
              placeholder="Notes (optional)"
              className="qn-notes"
              value={values[`note_${q.number}`] ?? ""}
              onChange={(e) => set(`note_${q.number}`, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  }

  function renderReview() {
    const domainCount = Q_DOMAINS.length;
    const answeredCount = SETUP_QUESTIONS.filter(
      (q) => values[`q_${q.number}`]?.trim()
    ).length;

    if (isInvitee) {
      return (
        <div className="wizard-review">
          <div className="wizard-review-check">
            <CheckCircle2 size={40} />
          </div>
          <h3>Ready to join!</h3>
          <p className="muted">Confirm your details and click <strong>Join Workspace</strong>.</p>
          <div className="wizard-review-rows">
            <div className="wizard-review-row">
              <span className="wizard-review-label">Name</span>
              <span className="wizard-review-value">{values.fullName || "—"}</span>
            </div>
            <div className="wizard-review-row">
              <span className="wizard-review-label">Role</span>
              <span className="wizard-review-value">{inviteeRole ?? "Team Member"}</span>
            </div>
            {inviteeOrgName && (
              <div className="wizard-review-row">
                <span className="wizard-review-label">Workspace</span>
                <span className="wizard-review-value">{inviteeOrgName}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="wizard-review">
        <div className="wizard-review-check">
          <CheckCircle2 size={40} />
        </div>
        <h3>You&apos;re all set — let&apos;s launch!</h3>
        <p className="muted">
          Click <strong>Complete Setup</strong> to create your workspace, activate your safety
          programs, and open your Risk Register.
        </p>
        <div className="wizard-review-rows">
          <div className="wizard-review-row">
            <span className="wizard-review-label">Name</span>
            <span className="wizard-review-value">{values.fullName || "—"}</span>
          </div>
          <div className="wizard-review-row">
            <span className="wizard-review-label">Company</span>
            <span className="wizard-review-value">{values.companyName || values.organizationName || "—"}</span>
          </div>
          <div className="wizard-review-row">
            <span className="wizard-review-label">Industry</span>
            <span className="wizard-review-value">
              {values.vertical === "general_manufacturing" ? "General Manufacturing (PredictSafe MFG)" : "Biotech / Pharma (PredictSafe BIO)"}
            </span>
          </div>
          <div className="wizard-review-row">
            <span className="wizard-review-label">Primary site</span>
            <span className="wizard-review-value">{values.primarySite || demoCompanyProfile.primarySite}</span>
          </div>
          <div className="wizard-review-row">
            <span className="wizard-review-label">Questions answered</span>
            <span className="wizard-review-value">{answeredCount} of {SETUP_QUESTIONS.length} across {domainCount} domains</span>
          </div>
        </div>
        <p className="wizard-review-footnote">
          Unanswered questions default to &quot;not applicable.&quot; You can update answers anytime in
          Assess → Setup Questionnaire.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const stepLabel = `Step ${step + 1} of ${STEPS.length}`;

  return (
    <>
      {/* Progress */}
      <div className="wizard-progress-wrap">
        <div className="wizard-progress-meta">
          <span className="wizard-step-counter">{stepLabel}</span>
          <span className="wizard-step-name">{current.label}</span>
        </div>
        <div className="answer-progress-bar">
          <div className="answer-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step heading */}
      {current.kind !== "welcome" && current.kind !== "review" && (
        <div className="wizard-step-header">
          <p className="section-label">
            {current.kind === "domain"
              ? `Operations questionnaire · ${current.label}`
              : current.label}
          </p>
          {current.kind === "domain" && (
            <p className="muted">Answer yes or no (or skip — you can update these later).</p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="wizard-body">{renderContent()}</div>

      {/* Field error */}
      {fieldError && <p className="form-message">{fieldError}</p>}

      {blockedNoInvite && (
        <p className="form-message">
          <strong>Invite required.</strong> This workspace is invite-only. Ask your organization
          owner to send you an invite link.
        </p>
      )}

      {/* Navigation */}
      <div className={`wizard-nav${isFirst ? " wizard-nav--end" : ""}`}>
        {!isFirst && (
          <button
            type="button"
            className="button-secondary"
            onClick={goBack}
            disabled={submitting}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back
          </button>
        )}
        <button
          type="button"
          className="button-primary"
          onClick={goNext}
          disabled={blockedNoInvite || submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="spin" aria-hidden="true" />
              Setting up…
            </>
          ) : isLast ? (
            isInvitee ? "Join Workspace" : "Complete Setup"
          ) : (
            <>
              Next
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {/* Hidden submission form — populated from state, submitted on Complete */}
      <form ref={formRef} action={completeFullOnboardingAction} style={{ display: "none" }}>
        {Object.entries(values).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} readOnly />
        ))}
        {/* Ensure questionnaire fields are present even when empty (so action sees them) */}
        {SETUP_QUESTIONS.map((q) => (
          <Fragment key={q.number}>
            {!((`q_${q.number}`) in values) && (
              <input type="hidden" name={`q_${q.number}`} value="" readOnly />
            )}
            {!((`note_${q.number}`) in values) && (
              <input type="hidden" name={`note_${q.number}`} value="" readOnly />
            )}
          </Fragment>
        ))}
        <input type="hidden" name="runEngine" value="1" readOnly />
      </form>
    </>
  );
}
