import type { Metadata } from "next";
import Link from "next/link";
import { createHazardAction } from "@/app/hazards/actions";

export const metadata: Metadata = { title: "Add Hazard – PredictSafe" };

const HAZARD_TYPES = [
  { value: "biological",   label: "Biological" },
  { value: "chemical",     label: "Chemical" },
  { value: "radiation",    label: "Radiation" },
  { value: "laser",        label: "Laser" },
  { value: "electrical",   label: "Electrical" },
  { value: "fire",         label: "Fire / Thermal" },
  { value: "equipment",    label: "Equipment / Mechanical" },
  { value: "ergonomic",    label: "Ergonomic" },
  { value: "environmental",label: "Environmental" },
  { value: "other",        label: "Other" },
] as const;

const BSL_LEVELS = [
  { value: "n/a",   label: "N/A" },
  { value: "BSL-1", label: "BSL-1" },
  { value: "BSL-2", label: "BSL-2" },
  { value: "BSL-3", label: "BSL-3" },
  { value: "BSL-4", label: "BSL-4" },
] as const;

const STATUSES = [
  { value: "identified", label: "Identified" },
  { value: "assessed",   label: "Assessed" },
  { value: "controlled", label: "Controlled" },
] as const;

export default function NewHazardPage() {
  return (
    <div className="psb">
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />

      {/* TOP BAR */}
      <div className="psb-topbar">
        <div className="psb-brand">
          <div className="psb-logo">🛡️</div>
          <div><b>PredictSafe BIO</b><span>Biosafety Intelligence</span></div>
        </div>
      </div>

      <div className="psb-shell">
        {/* NAV */}
        <nav className="psb-nav">
          <div className="psb-navgrp">Assess <span style={{ marginLeft: "auto" }}>▾</span></div>
          <div className="psb-navitem">Risk Workbench</div>
          <div className="psb-navitem">Risk Register</div>
          <div className="psb-navitem on">Hazard Register</div>
          <div className="psb-navitem">Exposure Map</div>
          <div className="psb-navitem">Personnel</div>
          <div className="psb-navtop">Plan <span className="ch">▸</span></div>
          <div className="psb-navtop">Operate <span className="ch">▸</span></div>
          <div className="psb-navtop">Monitor <span className="ch">▸</span></div>
          <div className="psb-navtop">Workspace <span className="ch">▸</span></div>
        </nav>

        {/* MAIN */}
        <main className="psb-main">
          <div className="psb-connbar">
            Workspace connected &middot; <b>PredictSafe BIO</b>
          </div>

          <div className="psb-head">
            <div>
              <div className="psb-eyebrow">&bull; Assess &middot; Hazard Register</div>
              <h1>Add Hazard</h1>
              <p className="psb-sub">
                Register a new hazard. The Predictive Engine will score it as a leading indicator
                once saved. Draft — human review required.
              </p>
            </div>
            <Link href="/hazards" className="psb-btn ghost">&#8592; Back to Register</Link>
          </div>

          <div className="form-card">
            <form action={createHazardAction}>
              <div className="form-grid">
                <label className="field span-2">
                  <span>Hazard name <em>*</em></span>
                  <input name="name" type="text" required placeholder="e.g. Recombinant Lentiviral Vector" />
                </label>

                <label className="field">
                  <span>Hazard type <em>*</em></span>
                  <select name="hazardType" defaultValue="biological">
                    {HAZARD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Initial status</span>
                  <select name="status" defaultValue="identified">
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Location / lab</span>
                  <input name="location" type="text" placeholder="e.g. BSL-2 Cell Culture Lab" />
                </label>

                <label className="field">
                  <span>BSL level</span>
                  <select name="bslLevel" defaultValue="n/a">
                    {BSL_LEVELS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Associated material / agent</span>
                  <input name="associatedMaterial" type="text" placeholder="e.g. VSV-G pseudotyped particles" />
                </label>

                <label className="field">
                  <span>Risk family</span>
                  <input name="riskFamily" type="text" placeholder="e.g. Infectious agent / Gene delivery" />
                </label>
              </div>

              <label className="field">
                <span>Containment &amp; controls summary</span>
                <input name="containment" type="text" placeholder="e.g. BSC Class II, sealed rotors, PPE" />
              </label>

              <label className="field" style={{ marginTop: 12 }}>
                <span>Description / notes</span>
                <textarea name="description" rows={3} placeholder="What makes this hazardous? What exposure scenarios exist?" />
              </label>

              <div className="form-actions">
                <Link href="/hazards" className="psb-btn ghost">Cancel</Link>
                <button type="submit" className="psb-btn">Save hazard</button>
              </div>
            </form>
          </div>

          <div className="ai-guardrail">
            <div className="dot" />
            <p>
              <b>AI Guardrail</b> &mdash; Hazard assessments are draft indicators, not verdicts.
              All entries require review by a qualified biosafety professional before use in
              compliance decisions.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

const PAGE_STYLES = `
.psb *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.psb{--cink:#0f2647;--cink2:#475569;--cink3:#94a3b8;--cline:#e2e8f0;--accent:#2563eb;
  background:#f5f8fc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;
  box-shadow:0 12px 40px rgba(15,38,71,.08);color:var(--cink);font-size:13px;line-height:1.4}
.psb-topbar{display:flex;align-items:center;justify-content:space-between;background:#0a1d38;padding:12px 18px}
.psb-brand{display:flex;align-items:center;gap:10px}
.psb-logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#0891b2);display:flex;align-items:center;justify-content:center;font-size:15px}
.psb-brand b{font-size:14px;font-weight:700;color:#fff}
.psb-brand span{display:block;font-size:9.5px;color:#7e96bd;font-weight:500}
.psb-shell{display:flex;min-height:600px}
.psb-nav{width:182px;background:#fff;border-right:1px solid var(--cline);padding:10px 0;flex-shrink:0}
.psb-navgrp{font-size:9.5px;letter-spacing:.12em;color:var(--cink3);text-transform:uppercase;padding:11px 16px 4px;display:flex;align-items:center;gap:7px;font-weight:700}
.psb-navitem{padding:7px 16px 7px 34px;font-size:12px;color:var(--cink2);cursor:pointer}
.psb-navitem.on{color:var(--accent);background:linear-gradient(90deg,rgba(37,99,235,.1),transparent);border-left:2px solid var(--accent);padding-left:32px;font-weight:700}
.psb-navtop{padding:9px 16px;font-size:12.5px;color:var(--cink);font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer}
.psb-navtop .ch{margin-left:auto;color:var(--cink3);font-size:10px}
.psb-main{flex:1;padding:24px 28px;overflow:auto;background:#f5f8fc}
.psb-connbar{font-size:10.5px;color:var(--cink3);margin-bottom:12px}
.psb-connbar b{color:var(--cink2);font-weight:600}
.psb-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;gap:16px}
.psb-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent);font-weight:700;text-transform:uppercase;margin-bottom:4px}
.psb-main h1{font-size:21px;font-weight:700;letter-spacing:-.01em;margin-bottom:3px;color:var(--cink)}
.psb-sub{font-size:11.5px;color:var(--cink2);max-width:520px}
.psb-btn{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,.3);text-decoration:none}
.psb-btn.ghost{background:#fff;border:1px solid var(--cline);color:var(--cink2);box-shadow:none;font-weight:500}
.form-card{background:#fff;border:1px solid var(--cline);border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(15,38,71,.06)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.span-2{grid-column:1/-1}
.field{display:flex;flex-direction:column;gap:5px}
.field span{font-size:11px;font-weight:600;color:var(--cink2);letter-spacing:.03em;text-transform:uppercase}
.field em{color:#ef4444;font-style:normal}
.field input,.field select,.field textarea{border:1px solid var(--cline);border-radius:7px;padding:8px 10px;font-size:12.5px;color:var(--cink);background:#fff;outline:none;font-family:inherit;resize:vertical}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--cline)}
.ai-guardrail{margin-top:16px;background:linear-gradient(100deg,#1c1740,#0f2647);border:1px solid rgba(168,85,247,.4);border-radius:11px;padding:12px 15px;display:flex;align-items:flex-start;gap:12px}
.ai-guardrail .dot{width:9px;height:9px;border-radius:50%;background:#a855f7;box-shadow:0 0 0 4px rgba(168,85,247,.25);flex-shrink:0;margin-top:3px}
.ai-guardrail p{font-size:11.5px;color:#9fb4d4}
.ai-guardrail b{color:#d8b4fe}
`;
