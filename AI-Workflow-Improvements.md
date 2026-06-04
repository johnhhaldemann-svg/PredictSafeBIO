# PredictSafeBIO — AI Workflow Improvement Roadmap

## Where Time Is Being Lost Today

| Manual Step | Est. Time Per Occurrence | Frequency |
|---|---|---|
| Typing signals into BioRisk engine | 15–30 min | Per assessment |
| Translating assessment → CAPA record | 30–60 min | Per high/critical finding |
| Reviewing document gaps one-by-one | 20–40 min | Weekly |
| Building Foundation task queue manually | 45–90 min | Per compliance review |
| Morning readiness check across all modules | 20–30 min | Daily |
| Matching training records to gaps | 30–60 min | Per audit prep cycle |

**Estimated wasted man-hours per week: 8–15 hrs across a team of 3–5**

---

## Priority 1 — Immediate (Low Effort, High ROI)

### 1A. Auto-populate BioRisk signals from workspace data (DONE ✓)
- BioRisk engine now auto-fills site, area, workflow from org profile
- Signal presets allow one-click addition of common findings
- **Saves: 15–20 min per assessment**

### 1B. Assessment → CAPA in one click (Building now)
- After scoring, a "Create CAPA Draft" button pre-fills the CAPA form
  with title, root cause, and due date from the AI recommendation output
- User reviews and approves — no retyping
- **Saves: 30–45 min per high/critical assessment**

### 1C. AI document gap digest on Documents page (DONE ✓)
- Banner shows total gap count with one click to review
- **Saves: 5–10 min of discovery time daily**

### 1D. AI review queue on Assessments page (DONE ✓)
- Pending review count prominently surfaced with one-click filter
- **Saves: 5–10 min daily**

---

## Priority 2 — Short-Term (1–2 sprints)

### 2A. Auto-detect signals from existing CAPA / incident data
- When a user opens the BioRisk engine, query open CAPAs and incidents
- Auto-inject matching signals (e.g., overdue CAPA → `capa` signal type)
- User sees pre-populated signals instead of blank form
- **Saves: 20–30 min per assessment**

### 2B. Training gap auto-check
- Cross-reference the training matrix against the BioRisk engine's
  `missingRequiredTraining` flag automatically
- Surface which specific staff/SOPs are lapsed — not just the boolean flag
- **Saves: 30–60 min per training gap investigation**

### 2C. Smart daily digest (scheduled task)
- Every morning, auto-run the AI engine against workspace state and
  send a summarized "Today's priorities" to the notification center
- Overdue CAPAs, expiring documents, pending assessments — one view
- **Saves: 20–30 min daily briefing time**

### 2D. Document auto-review reminder
- 30 days before `nextReviewDate`, auto-create a Foundation task
  and surface it in the notification center
- **Saves: The cost of missed reviews (regulatory risk)**

---

## Priority 3 — Medium-Term (Architecture investment)

### 3A. Batch assessment from data file
- Upload a CSV of incidents/findings → AI scores each row
- Output: a risk register with all assessments pre-filled
- **Saves: Hours of manual data entry for initial setup**

### 3B. AI-assisted root cause suggestion
- When creating a CAPA, the AI analyzes the top drivers from the
  linked assessment and suggests 3 root cause hypotheses
- User selects and edits — not writes from scratch
- **Saves: 20–40 min of root cause analysis per CAPA**

### 3C. Foundation map auto-update from assessment
- High/critical assessments automatically generate Foundation compliance
  gap records — no manual mapping required
- **Saves: 45–90 min per compliance review cycle**

### 3D. Audit-ready evidence package auto-generation
- For each open compliance gap, AI collects linked assessments,
  CAPAs, documents, and training records into a single evidence bundle
- **Saves: 4–8 hrs per audit preparation**

---

## Priority 4 — Strategic (Requires external integrations)

### 4A. Instrument / LIMS data ingestion
- Direct API connection to lab instruments or LIMS
- Auto-create equipment_event signals when readings go out of tolerance
- **Eliminates manual equipment monitoring loop entirely**

### 4B. Regulatory intelligence feed
- Monitor FDA 483s, Warning Letters, EMA guidance updates
- Auto-surface relevant changes as compliance map action items
- **Saves: Hours of regulatory monitoring per month**

### 4C. Predictive risk trending
- Train on historical assessment data to predict which processes
  are likely to produce signals before they occur
- **Shifts team from reactive to proactive**

---

## Implementation Notes

The AI engine (`assessBioRisk`) is deterministic and runs instantly — no
API latency. Every automation that feeds data INTO the engine returns
immediate results. The highest ROI improvements are:

1. Better data into the engine (auto-populate signals from existing records)
2. Automatic outputs from the engine (auto-create CAPAs, tasks, notifications)
3. Reducing the gap between assessment → action (the current 30–60 min dead time)

Human review is preserved at every step. AI drafts; humans approve.
