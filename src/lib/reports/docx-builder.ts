/**
 * DOCX report builders for Assessment and Incident reports.
 * Uses the `docx` package to create editable Word documents.
 */

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
} from "docx";
import type { AssessmentReportData } from "./pdf-assessment";
import type { IncidentReportData } from "./pdf-incident";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return dt; }
}

const NAVY = "0D2B4E";
const BLUE = "185FA5";
const MUTED = "8FA8C0";
const LINE_BG = "F4F8FD";
const HEADER_BG = "0D2B4E";
const AMBER_BG = "FAEEDA";
const AMBER_DK = "854F0B";
const RED_DK = "A32D2D";
const GREEN_DK = "3B6D11";

function h1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 },
    style: "Heading1",
    run: { color: NAVY, bold: true, size: 36 },
  });
}

function h2(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: NAVY })],
    spacing: { before: 240, after: 100 },
  });
}

function h3(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 20, color: NAVY })],
    spacing: { before: 160, after: 80 },
  });
}

function body(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 18 })],
    spacing: { after: 80 },
  });
}

function labelValue(label: string, value: string) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 18, color: NAVY }),
      new TextRun({ text: value, size: 18 }),
    ],
    spacing: { after: 60 },
  });
}

function bullet(text: string, color = "000000") {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, color })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  });
}

function draftBanner() {
  return new Paragraph({
    children: [
      new TextRun({ text: "DRAFT — HUMAN REVIEW REQUIRED  ", bold: true, color: AMBER_DK, size: 18 }),
      new TextRun({ text: "This document is for review purposes only. It does not constitute a regulatory approval, release, or compliance certification.", color: AMBER_DK, size: 16 }),
    ],
    shading: { type: ShadingType.SOLID, color: AMBER_BG, fill: AMBER_BG },
    spacing: { before: 0, after: 200, line: 276 },
    border: {
      left: { style: BorderStyle.THICK, size: 12, color: "EF9F27" },
    },
    indent: { left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
  });
}

function divider() {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D6E4F0" } },
    spacing: { before: 160, after: 160 },
  });
}

function metaTable(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 16, color: MUTED })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: LINE_BG, fill: LINE_BG },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })],
          width: { size: 75, type: WidthType.PERCENTAGE },
        }),
      ],
    })),
  });
}

function dataTable(headers: string[], rows: string[][], colWidths?: number[]) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 16 })] })],
      shading: { type: ShadingType.SOLID, color: HEADER_BG, fill: HEADER_BG },
      width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
    })),
    tableHeader: true,
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 16 })] })],
      shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: LINE_BG, fill: LINE_BG } : undefined,
      width: colWidths ? { size: colWidths[ci], type: WidthType.PERCENTAGE } : undefined,
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── Assessment DOCX ──────────────────────────────────────────────────────────
export async function buildAssessmentDocx(data: AssessmentReportData): Promise<Buffer> {
  const doc = new Document({
    creator: "PredictSafeBIO",
    title: `BioRisk Assessment Report – ${data.workflow}`,
    description: "Draft biosafety risk assessment. Human review required.",
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "PredictSafeBIO  |  Biosafety Risk Assessment  |  DRAFT", bold: true, color: NAVY, size: 16 }),
              new TextRun({ text: `  Report #${data.reportNumber}`, color: MUTED, size: 16 }),
            ],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `PredictSafeBIO · ${data.companyName} · DRAFT  `, size: 14, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], size: 14, color: MUTED }),
              new TextRun({ text: " / ", size: 14, color: MUTED }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: MUTED }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: [
        // Title block
        draftBanner(),
        new Paragraph({ text: "", spacing: { after: 80 } }),
        new Paragraph({
          children: [new TextRun({ text: "Biosafety Risk Assessment Report", bold: true, size: 40, color: NAVY })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: data.workflow, bold: true, size: 28, color: BLUE })],
          spacing: { after: 200 },
        }),

        // Meta table
        metaTable([
          ["Company", data.companyName],
          ["Area", data.area],
          ["Assessment ID", data.id.slice(0, 8).toUpperCase()],
          ["Report Number", data.reportNumber],
          ["Generated", fmt(data.generatedAt)],
          ["Risk Score", String(data.score)],
          ["Risk Level", data.level.toUpperCase()],
          ["Confidence", data.confidence],
          ["Human Review Status", data.humanReviewStatus.replace(/_/g, " ")],
          ["Assigned Reviewer", data.assignedReviewerName ?? "Unassigned"],
          ["Review Due Date", fmt(data.reviewDueDate)],
          ["Reviewed At", fmt(data.reviewedAt)],
        ]),

        divider(),

        // Summary
        h2("Assessment Summary"),
        body(data.output.explanation),
        ...(data.reviewerNotes ? [
          h3("Reviewer Notes"),
          new Paragraph({ children: [new TextRun({ text: data.reviewerNotes, italics: true, size: 18, color: "4A6080" })], spacing: { after: 80 } }),
        ] : []),

        divider(),

        // Risk Drivers
        h2("Top Risk Drivers"),
        dataTable(
          ["Driver", "Impact", "Explanation"],
          data.output.topDrivers.map(d => [d.label, d.impact, d.explanation]),
          [25, 15, 60]
        ),

        divider(),

        // Critical gaps
        h2("Critical Control Gaps"),
        ...(data.output.criticalControlGaps.length > 0
          ? data.output.criticalControlGaps.map(g => bullet(g, RED_DK))
          : [body("None identified.")]),

        // Missing info
        h2("Missing Information"),
        ...(data.output.missingInformation.length > 0
          ? data.output.missingInformation.map(m => bullet(m, AMBER_DK))
          : [body("None identified.")]),

        divider(),

        // Recommended Actions
        h2("Recommended Actions"),
        dataTable(
          ["Action", "Priority", "Owner Role", "Rationale"],
          data.output.recommendedActions.map(a => [a.title, a.priority, a.ownerRole, a.reason]),
          [25, 12, 18, 45]
        ),

        divider(),

        // Signals
        ...(data.signals.length > 0 ? [
          h2("Assessment Signals"),
          dataTable(
            ["Signal", "Evidence"],
            data.signals.map(s => [s.label ?? s.type, s.evidence ?? "—"]),
            [30, 70]
          ),
          divider(),
        ] : []),

        // Review history
        ...(data.auditEvents.filter(e => e.eventType === "human_review_status_changed").length > 0 ? [
          h2("Review History"),
          ...data.auditEvents
            .filter(e => e.eventType === "human_review_status_changed")
            .map(e => labelValue(fmt(e.createdAt), e.summary)),
          divider(),
        ] : []),

        // Audit trail
        ...(data.auditEvents.length > 0 ? [
          h2("Audit Trail"),
          dataTable(
            ["Date", "Event Type", "Detail"],
            data.auditEvents.slice(0, 15).map(e => [
              fmt(e.createdAt),
              e.eventType.replace(/_/g, " "),
              e.summary,
            ]),
            [18, 22, 60]
          ),
          divider(),
        ] : []),

        // Guardrail
        new Paragraph({
          children: [
            new TextRun({ text: "Regulatory Notice: ", bold: true, size: 16, color: AMBER_DK }),
            new TextRun({ text: "This report is an AI-assisted draft generated by PredictSafeBIO and must be reviewed and approved by qualified EHS personnel before use in any regulatory submission, audit response, or official record.", size: 16, color: AMBER_DK }),
          ],
          shading: { type: ShadingType.SOLID, color: AMBER_BG, fill: AMBER_BG },
          spacing: { before: 160, after: 80, line: 276 },
          border: { left: { style: BorderStyle.THICK, size: 12, color: "EF9F27" } },
          indent: { left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

// ─── Incident DOCX ────────────────────────────────────────────────────────────
export async function buildIncidentDocx(data: IncidentReportData): Promise<Buffer> {
  const doc = new Document({
    creator: "PredictSafeBIO",
    title: `Incident Report – ${data.title}`,
    description: "Draft incident investigation report. Human review required.",
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "PredictSafeBIO  |  Incident Investigation Report  |  DRAFT", bold: true, color: NAVY, size: 16 }),
              new TextRun({ text: `  Report #${data.reportNumber}`, color: MUTED, size: 16 }),
            ],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `PredictSafeBIO · ${data.companyName} · DRAFT  `, size: 14, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], size: 14, color: MUTED }),
              new TextRun({ text: " / ", size: 14, color: MUTED }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: MUTED }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: [
        draftBanner(),
        new Paragraph({ text: "", spacing: { after: 80 } }),
        new Paragraph({
          children: [new TextRun({ text: "Incident Investigation Report", bold: true, size: 40, color: NAVY })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: data.title, bold: true, size: 28, color: BLUE })],
          spacing: { after: 200 },
        }),

        metaTable([
          ["Company", data.companyName],
          ["Lab", data.labName ?? "—"],
          ["Incident ID", data.id.slice(0, 8).toUpperCase()],
          ["Incident Type", data.incidentType.replace(/_/g, " ")],
          ["Severity", data.severity.toUpperCase()],
          ["Status", data.status.replace(/_/g, " ")],
          ["Date / Time", fmt(data.occurredAt)],
          ["Reported By", data.reportedByName ?? "—"],
          ["Report Number", data.reportNumber],
          ["Generated", fmt(data.generatedAt)],
        ]),

        divider(),

        ...(data.summary ? [
          h2("Incident Summary"),
          body(data.summary),
          divider(),
        ] : []),

        ...(data.investigationSteps.length > 0 ? [
          h2("Investigation Steps"),
          dataTable(
            ["Step Type", "Description", "Completed"],
            data.investigationSteps.map(s => [
              s.step_type.replace(/_/g, " "),
              s.description,
              s.completed_at ? fmt(s.completed_at) : "Pending",
            ]),
            [20, 55, 25]
          ),
          divider(),
        ] : []),

        ...(data.linkedCapas.length > 0 ? [
          h2("Linked CAPA Records"),
          ...data.linkedCapas.flatMap((capa) => [
            h3(capa.title),
            labelValue("Status", capa.status.replace(/_/g, " ")),
            labelValue("Owner Role", capa.ownerRole ?? "—"),
            labelValue("Due Date", fmt(capa.dueDate)),
            ...(capa.actions.length > 0 ? [
              new Paragraph({ children: [new TextRun({ text: "Actions:", bold: true, size: 18 })], spacing: { before: 80, after: 40 } }),
              ...capa.actions.map(a => bullet(
                `${a.title} (${a.actionType} · ${a.status.replace(/_/g, " ")}${a.completedAt ? ` · completed ${fmt(a.completedAt)}` : ""})`,
                a.status === "complete" ? GREEN_DK : "0D1B2A"
              )),
            ] : []),
            new Paragraph({ text: "", spacing: { after: 80 } }),
          ]),
          divider(),
        ] : []),

        ...(data.auditEvents.length > 0 ? [
          h2("Audit Trail"),
          dataTable(
            ["Date", "Event Type", "Detail"],
            data.auditEvents.slice(0, 15).map(e => [
              fmt(e.createdAt),
              e.eventType.replace(/_/g, " "),
              e.summary,
            ]),
            [18, 22, 60]
          ),
          divider(),
        ] : []),

        new Paragraph({
          children: [
            new TextRun({ text: "Regulatory Notice: ", bold: true, size: 16, color: AMBER_DK }),
            new TextRun({ text: "Root-cause determination, corrective action selection, effectiveness verification, and final closure are the sole responsibility of qualified EHS and quality personnel. This draft must be reviewed before use in any official record or regulatory submission.", size: 16, color: AMBER_DK }),
          ],
          shading: { type: ShadingType.SOLID, color: AMBER_BG, fill: AMBER_BG },
          spacing: { before: 160, after: 80, line: 276 },
          border: { left: { style: BorderStyle.THICK, size: 12, color: "EF9F27" } },
          indent: { left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
