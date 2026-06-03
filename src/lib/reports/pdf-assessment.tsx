/**
 * PDF template for Biosafety Risk Assessment reports.
 * Rendered server-side via @react-pdf/renderer.
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Brand colours (matches globals.css) ────────────────────────────────────
const C = {
  navy: "#0D2B4E",
  blue: "#185FA5",
  blueMid: "#378ADD",
  blueLt: "#B5D4F4",
  blueBg: "#E6F1FB",
  text: "#0D1B2A",
  text2: "#4A6080",
  muted: "#8FA8C0",
  line: "#D6E4F0",
  green: "#639922",
  greenBg: "#EAF3DE",
  greenDk: "#3B6D11",
  amber: "#EF9F27",
  amberBg: "#FAEEDA",
  amberDk: "#854F0B",
  red: "#E24B4A",
  redBg: "#FCEBEB",
  redDk: "#A32D2D",
  white: "#FFFFFF",
  panelBg: "#F4F8FD",
};

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high:     { bg: C.redBg,   text: C.redDk,   border: C.red },
  medium:   { bg: C.amberBg, text: C.amberDk, border: C.amber },
  low:      { bg: C.greenBg, text: C.greenDk, border: C.green },
  critical: { bg: C.redBg,   text: C.redDk,   border: C.red },
};

function riskColor(level: string) {
  return RISK_COLORS[level?.toLowerCase()] ?? { bg: C.blueBg, text: C.blue, border: C.blueMid };
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.text,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    lineHeight: 1.45,
  },

  // Header bar
  headerBar: {
    backgroundColor: C.navy,
    marginHorizontal: -48,
    marginTop: -48,
    paddingHorizontal: 48,
    paddingVertical: 18,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerBrand: { color: C.white, fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headerTagline: { color: C.blueLt, fontSize: 7.5, marginTop: 2 },
  headerDate: { color: C.muted, fontSize: 7.5, textAlign: "right" },

  // Draft banner
  draftBanner: {
    backgroundColor: C.amberBg,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  draftLabel: { color: C.amberDk, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  draftText: { color: C.amberDk, fontSize: 7.5 },

  // Section heading
  sectionLabel: { fontSize: 6.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 4 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 8 },
  h3: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.text, marginBottom: 4 },

  // Meta grid
  metaGrid: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  metaCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: C.panelBg,
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  metaCardLabel: { fontSize: 6.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  metaCardValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.text },

  // Risk badge
  riskBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  riskBadgeText: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },

  // Panel
  panel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },

  // Table
  table: { marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: C.navy, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2 },
  tableHeaderCell: { color: C.white, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  tableRowAlt: { backgroundColor: C.panelBg },
  tableCell: { fontSize: 8, color: C.text },

  // List
  listItem: { flexDirection: "row", marginBottom: 4, paddingLeft: 8 },
  listBullet: { fontSize: 8, color: C.blueMid, marginRight: 5, marginTop: 0.5 },
  listText: { fontSize: 8, color: C.text, flex: 1 },

  // Action row
  actionRow: {
    borderLeftWidth: 2,
    borderLeftColor: C.blueMid,
    paddingLeft: 8,
    paddingVertical: 5,
    marginBottom: 6,
    backgroundColor: C.panelBg,
    borderRadius: 3,
    paddingRight: 8,
  },
  actionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.navy },
  actionMeta: { fontSize: 7, color: C.text2, marginTop: 2 },
  actionReason: { fontSize: 7.5, color: C.text, marginTop: 3 },

  // Timeline
  timelineRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 8 },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blueMid, marginRight: 8, marginTop: 1 },
  timelineDate: { fontSize: 7, color: C.muted, width: 80 },
  timelineText: { fontSize: 7.5, color: C.text, flex: 1 },
  timelineType: { fontSize: 6.5, color: C.blue, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 1 },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 14 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
  },
  footerLeft: { fontSize: 6.5, color: C.muted },
  footerRight: { fontSize: 6.5, color: C.muted },
});

// ─── Data types ───────────────────────────────────────────────────────────────
export interface AssessmentReportData {
  id: string;
  workflow: string;
  area: string;
  score: number;
  level: string;
  confidence: string;
  humanReviewStatus: string;
  reviewedAt?: string | null;
  reviewerNotes?: string | null;
  assignedReviewerName?: string | null;
  reviewDueDate?: string | null;
  output: {
    explanation: string;
    topDrivers: Array<{ label: string; impact: string; explanation: string }>;
    criticalControlGaps: string[];
    missingInformation: string[];
    recommendedActions: Array<{ title: string; priority: string; ownerRole: string; reason: string }>;
  };
  signals: Array<{ label?: string; type: string; evidence?: string }>;
  auditEvents: Array<{ createdAt?: string | null; eventType: string; summary: string }>;
  companyName: string;
  generatedAt: string;
  reportNumber: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return dt; }
}

function priorityColor(p: string) {
  const lp = p?.toLowerCase();
  if (lp === "critical" || lp === "high") return C.red;
  if (lp === "medium") return C.amber;
  return C.green;
}

// ─── PDF Component ────────────────────────────────────────────────────────────
export function AssessmentReportPDF({ data }: { data: AssessmentReportData }) {
  const rc = riskColor(data.level);
  const reviewEvents = data.auditEvents.filter(e => e.eventType === "human_review_status_changed");
  const otherEvents = data.auditEvents.filter(e => e.eventType !== "human_review_status_changed").slice(0, 8);

  return (
    <Document title={`BioRisk Assessment – ${data.workflow}`} author="PredictSafeBIO">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerBar} fixed>
          <View>
            <Text style={s.headerBrand}>PredictSafeBIO</Text>
            <Text style={s.headerTagline}>Biosafety Intelligence Platform</Text>
          </View>
          <View>
            <Text style={s.headerDate}>Report #{data.reportNumber}</Text>
            <Text style={s.headerDate}>Generated {fmt(data.generatedAt)}</Text>
          </View>
        </View>

        {/* ── Draft banner ── */}
        <View style={s.draftBanner}>
          <Text style={s.draftLabel}>DRAFT — HUMAN REVIEW REQUIRED</Text>
          <Text style={s.draftText}>  This report is for review purposes only. It does not constitute a regulatory approval, release, or compliance certification.</Text>
        </View>

        {/* ── Title block ── */}
        <Text style={s.sectionLabel}>Biosafety Risk Assessment</Text>
        <Text style={s.h1}>{data.workflow}</Text>
        <Text style={{ fontSize: 8.5, color: C.text2, marginBottom: 16 }}>
          Company: {data.companyName}  ·  Area: {data.area}  ·  ID: {data.id.slice(0, 8).toUpperCase()}
        </Text>

        {/* ── Summary cards ── */}
        <View style={s.metaGrid}>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Risk Score</Text>
            <Text style={s.metaCardValue}>{data.score}</Text>
          </View>
          <View style={[s.metaCard, { borderColor: rc.border, borderLeftWidth: 3 }]}>
            <Text style={s.metaCardLabel}>Risk Level</Text>
            <View style={[s.riskBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
              <Text style={[s.riskBadgeText, { color: rc.text }]}>{data.level.toUpperCase()}</Text>
            </View>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Confidence</Text>
            <Text style={s.metaCardValue}>{data.confidence}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Review Status</Text>
            <Text style={[s.metaCardValue, { fontSize: 8 }]}>{data.humanReviewStatus.replace(/_/g, " ")}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Reviewer</Text>
            <Text style={s.metaCardValue}>{data.assignedReviewerName ?? "Unassigned"}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Due Date</Text>
            <Text style={s.metaCardValue}>{fmt(data.reviewDueDate)}</Text>
          </View>
        </View>

        {/* ── Explanation ── */}
        <View style={s.panel}>
          <Text style={s.h2}>Assessment Summary</Text>
          <Text style={{ fontSize: 8.5, color: C.text, lineHeight: 1.5 }}>{data.output.explanation}</Text>
          {data.reviewerNotes ? (
            <>
              <View style={[s.divider, { marginVertical: 10 }]} />
              <Text style={s.h3}>Reviewer Notes</Text>
              <Text style={{ fontSize: 8, color: C.text2, fontFamily: "Helvetica-Oblique" }}>{data.reviewerNotes}</Text>
            </>
          ) : null}
        </View>

        {/* ── Risk Drivers ── */}
        <View style={s.panel}>
          <Text style={s.h2}>Top Risk Drivers</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Driver</Text>
              <Text style={[s.tableHeaderCell, { width: 55 }]}>Impact</Text>
              <Text style={[s.tableHeaderCell, { flex: 3 }]}>Explanation</Text>
            </View>
            {data.output.topDrivers.map((d, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{d.label}</Text>
                <Text style={[s.tableCell, { width: 55, color: priorityColor(d.impact) }]}>{d.impact}</Text>
                <Text style={[s.tableCell, { flex: 3 }]}>{d.explanation}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Critical Gaps + Missing Info ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <View style={[s.panel, { flex: 1, marginBottom: 0 }]}>
            <Text style={s.h2}>Critical Control Gaps</Text>
            {data.output.criticalControlGaps.length === 0
              ? <Text style={{ fontSize: 8, color: C.muted }}>None identified.</Text>
              : data.output.criticalControlGaps.map((g, i) => (
                <View key={i} style={s.listItem}>
                  <Text style={[s.listBullet, { color: C.red }]}>▸</Text>
                  <Text style={s.listText}>{g}</Text>
                </View>
              ))
            }
          </View>
          <View style={[s.panel, { flex: 1, marginBottom: 0 }]}>
            <Text style={s.h2}>Missing Information</Text>
            {data.output.missingInformation.length === 0
              ? <Text style={{ fontSize: 8, color: C.muted }}>None identified.</Text>
              : data.output.missingInformation.map((m, i) => (
                <View key={i} style={s.listItem}>
                  <Text style={[s.listBullet, { color: C.amber }]}>▸</Text>
                  <Text style={s.listText}>{m}</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* ── Recommended Actions ── */}
        <View style={s.panel}>
          <Text style={s.h2}>Recommended Actions</Text>
          {data.output.recommendedActions.map((a, i) => (
            <View key={i} style={s.actionRow}>
              <Text style={s.actionTitle}>{a.title}</Text>
              <Text style={s.actionMeta}>
                Priority: <Text style={{ color: priorityColor(a.priority) }}>{a.priority}</Text>
                {"  ·  "}Owner: {a.ownerRole}
              </Text>
              <Text style={s.actionReason}>{a.reason}</Text>
            </View>
          ))}
        </View>

        {/* ── Signals ── */}
        {data.signals.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.h2}>Assessment Signals</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>Signal</Text>
                <Text style={[s.tableHeaderCell, { flex: 3 }]}>Evidence</Text>
              </View>
              {data.signals.map((sig, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.tableCell, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>{sig.label ?? sig.type}</Text>
                  <Text style={[s.tableCell, { flex: 3 }]}>{sig.evidence ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Review History ── */}
        {reviewEvents.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.h2}>Review History</Text>
            {reviewEvents.map((e, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={s.timelineDot} />
                <Text style={s.timelineDate}>{fmt(e.createdAt)}</Text>
                <Text style={s.timelineText}>{e.summary}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Audit Trail ── */}
        {otherEvents.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.h2}>Audit Trail</Text>
            {otherEvents.map((e, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={s.timelineDot} />
                <Text style={s.timelineDate}>{fmt(e.createdAt)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.timelineType}>{e.eventType.replace(/_/g, " ")}</Text>
                  <Text style={s.timelineText}>{e.summary}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            PredictSafeBIO · {data.companyName} · Report #{data.reportNumber} · DRAFT
          </Text>
          <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
