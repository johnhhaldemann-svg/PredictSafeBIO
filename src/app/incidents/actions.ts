"use server";

import { redirect } from "next/navigation";
import {
  createIncident,
  updateIncidentStatus,
  type IncidentType,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/lib/supabase/incident-service";
import { authMessage } from "@/lib/auth-routing";

export async function createIncidentAction(formData: FormData) {
  const incidentType = String(formData.get("incidentType") ?? "").trim() as IncidentType;
  const title = String(formData.get("title") ?? "").trim();
  const severity = (String(formData.get("severity") ?? "medium").trim() || "medium") as IncidentSeverity;
  const occurredAt = String(formData.get("occurredAt") ?? "").trim() || null;
  const summary = String(formData.get("summary") ?? "").trim() || null;

  if (!title) redirect(authMessage("/incidents", "Incident title is required."));
  if (!incidentType) redirect(authMessage("/incidents", "Incident type is required."));

  const result = await createIncident({ incidentType, title, severity, occurredAt, summary });

  if (result.ok && result.id) {
    redirect(authMessage(`/incidents/${result.id}`, result.message));
  }
  redirect(authMessage("/incidents", result.message));
}

export async function updateIncidentStatusAction(formData: FormData) {
  const incidentId = String(formData.get("incidentId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as IncidentStatus;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const returnTo = String(formData.get("returnTo") ?? `/incidents/${incidentId}`);

  if (!incidentId) redirect("/incidents");

  const result = await updateIncidentStatus({ incidentId, status, note });
  redirect(authMessage(returnTo, result.message));
}
