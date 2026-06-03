/**
 * PDF template for Incident Investigation reports.
 * Rendered server-side via @react-pdf/renderer.
 */

import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const C = {
  navy: "#0D2B4E", blue: "#185FA5", blueMid: "#378ADD",
  blueLt: "#B5D4F4", blueBg: "#E6F1FB", text: "#0D1B2A",
  text2: "#4A6080", muted: "#8FA8C0", line: "#D6E4F0",
  green: "#639922", greenBg: "#EAF3DE", greenDk: "#3B6D11",
  amber: "#EF9F27", amberBg: "#FAEEDA", amberDk: "#854F0B",
  red: "#E24B4A", redBg: "#FCEBEB", redDk: "#A32D2D",
  white: "#FFFFFF", panelBg: "#F4F8FD",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: C.redBg, text: C.redDk, border: C.red },
  high:     { bg: C.redBg, text: C.redDk, border: C.red },
  medium:   { bg: C.amberBg, text: C.amberDk, border: C.amber },
  low:      { bg: C.greenBg, text: C.greenDk, border: C.green },
};
function sevColor(s: string) {
  return SEVERITY_COLORS[s?.toLowerCase()] ?? { bg: C.blueBg, text: C.blue, border: C.blueMid };
}

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return dt; }
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: C.text, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, lineHeight: 1.45 },
  headerBar: { backgroundColor: C.navy, marginHorizontal: -48, marginTop: -48, paddingHorizontal: 48, paddingVertical: 18, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerBrand: { color: C.white, fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headerTagline: { color: C.blueLt, fontSize: 7.5, marginTop: 2 },
  headerDate: { color: C.muted, fontSize: 7.5, textAlign: "right" },
  draftBanner: { backgroundColor: C.amberBg, borderLeftWidth: 3, borderLeftColor: C.amber, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 16, flexDirection: "row", alignItems: "center" },
  draftLabel: { color: C.amberDk, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  draftText: { color: C.amberDk, fontSize: 7.5 },
  sectionLabel: { fontSize: 6.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 4 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 8 },
  h3: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.text, marginBottom: 4 },
  metaGrid: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  metaCard: { flex: 1, minWidth: 80, backgroundColor: C.panelBg, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: C.line },
  metaCardLabel: { fontSize: 6.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  metaCardValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.text },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", borderWidth: 1 },
  badgeText: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  panel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 12, marginBottom: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: C.navy, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2 },
  tableHeaderCell: { color: C.white, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  tableRowAlt: { backgroundColor: C.panelBg },
  tableCell: { fontSize: 8, color: C.text },
  listItem: { flexDirection: "row", marginBottom: 4, paddingLeft: 8 },
  listBullet: { fontSize: 8, color: C.blueMid, marginRight: 5, marginTop: 0.5 },
  listText: { fontSize: 8, color: C.text, flex: 1 },
  actionRow: { borderLeftWidth: 2, borderLeftColor: C.blueMid, paddingLeft: 8, paddingVertical: 5, marginBottom: 6, backgroundColor: C.panelBg, borderRadius: 3, paddingRight: 8 },
  actionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.navy },
  actionMeta: { fontSize: 7, color: C.text2, marginTop: 2 },
  timelineRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 8 },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blueMid, marginRight: 8, marginTop: 1 },
  timelineDate: { fontSize: 7, color: C.muted, width: 80 },
  timelineText: { fontSize: 7.5, color: C.text, flex: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 12 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  footerLeft: { fontSize: 6.5, color: C.muted },
  footerRight: { fontSize: 6.5, color: C.muted },
});

export interface CapaActionData {
  id: string;
  title: string;
  actionType: string;
  status: string;
  dueDate?: string | null;
  completedAt?: string | null;
}

export interface LinkedCapaData {
  id: string;
  title: string;
  status: string;
  ownerRole?: string | null;
  dueDate?: string | null;
  actions: CapaActionData[];
}

export interface InvestigationStep {
  id: string;
  step_type: string;
  description: string;
  completed_at?: string | null;
  completed_by?: string | null;
}

export interface IncidentReportData {
  id: string;
  title: string;
  incidentType: string;
  severity: string;
  status: string;
  occurredAt?: string | null;
  summary?: string | null;
  labName?: string | null;
  reportedByName?: string | null;
  investigationSteps: InvestigationStep[];
  linkedCapas: LinkedCapaData[];
  auditEvents: Array<{ createdAt?: string | null; eventType: string; summary: string }>;
  companyName: string;
  generatedAt: string;
  reportNumber: string;
}

export function IncidentReportPDF({ data }: { data: IncidentReportData }) {
  const sc = sevColor(data.severity);

  return (
    <Document title={`Incident Report – ${data.title}`} author="PredictSafeBIO">
      <Page size="A4" style={s.page}>

        {/* Header */}
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

        {/* Draft banner */}
        <View style={s.draftBanner}>
          <Text style={s.draftLabel}>DRAFT — HUMAN REVIEW REQUIRED  </Text>
          <Text style={s.draftText}>Root-cause determination and corrective action selection are the sole responsibility of qualified EHS personnel.</Text>
        </View>

        {/* Title */}
        <Text style={s.sectionLabel}>Incident Investigation Report · {data.incidentType.replace(/_/g, " ").toUpperCase()}</Text>
        <Text style={s.h1}>{data.title}</Text>
        <Text style={{ fontSize: 8.5, color: C.text2, marginBottom: 16 }}>
          Company: {data.companyName}  ·  Lab: {data.labName ?? "—"}  ·  ID: {data.id.slice(0, 8).toUpperCase()}
        </Text>

        {/* Summary cards */}
        <View style={s.metaGrid}>
          <View style={[s.metaCard, { borderColor: sc.border, borderLeftWidth: 3 }]}>
            <Text style={s.metaCardLabel}>Severity</Text>
            <View style={[s.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <Text style={[s.badgeText, { color: sc.text }]}>{data.severity.toUpperCase()}</Text>
            </View>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Status</Text>
            <Text style={s.metaCardValue}>{data.status.replace(/_/g, " ")}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Date / Time</Text>
            <Text style={[s.metaCardValue, { fontSize: 8 }]}>{fmt(data.occurredAt)}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Reported By</Text>
            <Text style={s.metaCardValue}>{data.reportedByName ?? "—"}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaCardLabel}>Linked CAPAs</Text>
            <Text style={s.metaCardValue}>{data.linkedCapas.length}</Text>
          </View>
        </View>

        {/* Summary narrative */}
        {data.summary ? (
          <View style={s.panel}>
            <Text style={s.h2}>Incident Summary</Text>
            <Text style={{ fontSize: 8.5, color: C.text, lineHeight: 1.5 }}>{data.summary}</Text>
          </View>
        ) : null}

        {/* Investigation steps */}
        {data.investigationSteps.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.h2}>Investigation Steps</Text>
            <View>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>Step Type</Text>
                <Text style={[s.tableHeaderCell, { flex: 3 }]}>Description</Text>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Completed</Text>
              </View>
              {data.investigationSteps.map((step, i) => (
                <View key={step.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.tableCell, { flex: 1.5, fontFamily: "Helvetica-Bold", textTransform: "capitalize" }]}>
                    {step.step_type.replace(/_/g, " ")}
                  </Text>
                  <Text style={[s.tableCell, { flex: 3 }]}>{step.description}</Text>
                  <Text style={[s.tableCell, { width: 80, color: step.completed_at ? C.green : C.muted }]}>
                    {step.completed_at ? fmt(step.completed_at) : "Pending"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Linked CAPAs */}
        {data.linkedCapas.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.h2}>Linked CAPA Records</Text>
            {data.linkedCapas.map((capa, ci) => (
              <View key={capa.id} style={[s.actionRow, { marginBottom: ci < data.linkedCapas.length - 1 ? 10 : 0 }]}>
                <Text style={s.actionTitle}>{capa.title}</Text>
                <Text style={s.actionMeta}>
                  Status: {capa.status.replace(/_/g, " ")}
                  {"  ·  "}Owner: {capa.ownerRole ?? "—"}
                  {"  ·  "}Due: {fmt(capa.dueDate)}
                </Text>
                {capa.actions.length > 0 ? (
                  <View style={{ marginTop: 6 }}>
                    {capa.actions.map((act, ai) => (
                      <View key={act.id} style={[s.listItem, { marginBottom: 2 }]}>
                        <Text style={[s.listBullet, { color: act.status === "complete" ? C.green : C.blueMid }]}>
                          {act.status === "complete" ? "✓" : "▸"}
                        </Text>
                        <Text style={s.listText}>
                          {act.title}{" "}
                          <Text style={{ color: C.muted }}>({act.actionType} · {act.status.replace(/_/g, " ")})</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Audit trail */}
        {data.auditEvents.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.h2}>Audit Trail</Text>
            {data.auditEvents.slice(0, 10).map((e, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={s.timelineDot} />
                <Text style={s.timelineDate}>{fmt(e.createdAt)}</Text>
                <Text style={s.timelineText}>{e.summary}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Root-cause note */}
        <View style={[s.panel, { borderColor: C.amber, borderLeftWidth: 3 }]}>
          <Text style={s.h3}>Regulatory Note</Text>
          <Text style={{ fontSize: 7.5, color: C.text2, lineHeight: 1.5 }}>
            Root-cause analysis, corrective action effectiveness verification, and final closure are the sole responsibility
            of qualified EHS and quality personnel. This report is an AI-assisted draft generated by PredictSafeBIO and
            must be reviewed before use in any regulatory submission, audit response, or official record.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>PredictSafeBIO · {data.companyName} · Report #{data.reportNumber} · DRAFT</Text>
          <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
