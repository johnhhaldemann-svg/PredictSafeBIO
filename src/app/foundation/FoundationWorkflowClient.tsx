"use client";

import { DatabaseZap, FileCheck2, GitBranch, ListChecks, NotebookPen, Wand2 } from "lucide-react";
import type { IntelligenceFoundationSummary } from "@/lib/supabase/data";
import {
  addAuditReadinessNoteAction,
  generateFoundationReviewActionsAction,
  seedNorthStarWithConfirmationAction,
  updateFoundationBioTypeSelectionAction,
  updateFoundationEvidenceReadinessAction,
  updateFoundationIntakeResponseAction
} from "./actions";

const evidenceStatuses = ["current", "ready", "review_needed", "missing", "expired", "open", "out_of_tolerance"];

export function FoundationWorkflowClient({ canManage, summary }: { canManage: boolean; summary: IntelligenceFoundationSummary }) {
  const selected = summary.biotypeSelection;
  const selectedSecondaries = new Set(selected?.secondaryBioTypes ?? []);

  if (!canManage) {
    return (
      <section className="panel owner-gate-panel" aria-label="System Reliance owner-only controls">
        <div className="panel-heading">
          <div>
            <p className="section-label">Roles & Permissions</p>
            <h2>System Reliance edit workflows are locked</h2>
          </div>
          <FileCheck2 size={22} />
        </div>
        <p className="muted">
          Read-only compliance intelligence remains visible. Sign in as an organization owner to edit BioTypes, intake answers, evidence
          readiness, audit notes, action planning, or NorthStar demo seeds.
        </p>
      </section>
    );
  }

  return (
    <section className="foundation-workflow-grid" aria-label="Compliance and System Reliance edit workflows">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">BioType Branching Engine</p>
            <h2>BioType selection</h2>
          </div>
          <GitBranch size={22} />
        </div>
        <form action={updateFoundationBioTypeSelectionAction} className="stacked-form">
          <label>
            Primary BioType
            <select name="primaryBioType" defaultValue={selected?.primaryBioType ?? "rd_biotech"}>
              {summary.biotypes.map((biotype) => (
                <option key={biotype.key} value={biotype.key}>
                  {biotype.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Secondary BioTypes</legend>
            <div className="toggle-grid compact-toggle-grid">
              {summary.biotypes.map((biotype) => (
                <label className="check-row" key={biotype.key}>
                  <input defaultChecked={selectedSecondaries.has(biotype.key)} name="secondaryBioTypes" type="checkbox" value={biotype.key} />
                  <span>{biotype.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="button-primary" type="submit">
            <FileCheck2 size={16} />
            Save BioTypes
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Company Profile Intelligence</p>
            <h2>Company intake answers</h2>
          </div>
          <ListChecks size={22} />
        </div>
        <div className="action-list">
          {summary.intake.slice(0, 6).map((item) => (
            <form action={updateFoundationIntakeResponseAction} className="inline-edit-row" key={item.id ?? item.question}>
              <input name="responseId" type="hidden" value={item.id ?? ""} />
              <div>
                <strong>{item.question}</strong>
                <span>{item.triggers}</span>
              </div>
              <select name="answer" defaultValue={String(item.booleanValue)} disabled={!item.id}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              <button className="button-secondary" disabled={!item.id} type="submit">
                Save
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Evidence Tracking</p>
            <h2>Evidence readiness</h2>
          </div>
          <FileCheck2 size={22} />
        </div>
        <div className="action-list">
          {summary.evidence.slice(0, 6).map((item) => (
            <form action={updateFoundationEvidenceReadinessAction} className="inline-edit-row evidence-edit-row" key={item.id ?? item.requirement}>
              <input name="evidenceId" type="hidden" value={item.id ?? ""} />
              <div>
                <strong>{item.requirement}</strong>
                <span>{item.auditReady ? "audit-ready" : "gap"}</span>
              </div>
              <select name="status" defaultValue={item.status} disabled={!item.id}>
                {evidenceStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <label className="check-row small-check-row">
                <input defaultChecked={item.auditReady} name="auditReady" type="checkbox" disabled={!item.id} />
                <span>Ready</span>
              </label>
              <button className="button-secondary" disabled={!item.id} type="submit">
                Save
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Audit Readiness</p>
            <h2>Notes and action planning</h2>
          </div>
          <NotebookPen size={22} />
        </div>
        <form action={addAuditReadinessNoteAction} className="stacked-form">
          <input name="auditReadinessScoreId" type="hidden" value={summary.readiness.id ?? ""} />
          <label>
            Human-review note
            <textarea name="note" placeholder="Add readiness context, review notes, or follow-up needed..." rows={4} />
          </label>
          <button className="button-secondary" type="submit">
            <NotebookPen size={16} />
            Add note
          </button>
        </form>
        <div className="action-list compact-list">
          {summary.auditReadinessNotes.length > 0 ? (
            summary.auditReadinessNotes.map((note) => (
              <article className="action-row" key={note.id}>
                <div>
                  <strong>{note.noteType}</strong>
                  <span>{note.createdAt ? new Date(note.createdAt).toLocaleString() : "draft"}</span>
                </div>
                <p>{note.note}</p>
              </article>
            ))
          ) : (
            <p className="muted">No audit readiness notes yet.</p>
          )}
        </div>
        <form action={generateFoundationReviewActionsAction}>
          <button className="button-primary" type="submit">
            <Wand2 size={16} />
            Generate Action Plan
          </button>
        </form>
      </div>

      <div className="panel demo-control-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Admin Utilities</p>
            <h2>NorthStar seed guard</h2>
          </div>
          <DatabaseZap size={22} />
        </div>
        <p className="muted">
          This creates another draft NorthStar dataset. It does not approve records, certify compliance, close CAPAs, or validate readiness.
        </p>
        <div className="seed-count-grid" aria-label="Current foundation counts">
          {summary.counts.slice(0, 6).map((item) => (
            <span key={item.label}>
              <strong>{item.value}</strong>
              {item.label}
            </span>
          ))}
        </div>
        <form action={seedNorthStarWithConfirmationAction} className="stacked-form">
          <label>
            Type SEED NORTHSTAR to confirm
            <input autoComplete="off" name="confirmation" placeholder="SEED NORTHSTAR" />
          </label>
          <button className="button-secondary" type="submit">
            <DatabaseZap size={16} />
            Seed NorthStar
          </button>
        </form>
      </div>
    </section>
  );
}
