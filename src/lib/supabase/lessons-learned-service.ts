/**
 * Lessons Learned service.
 * Covers the lessons_learned table.
 * Implements the ICH Q10 §2.7 knowledge management requirement and
 * ISO 45001 PDCA close-loop mechanism.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SourceType =
  | "incident"
  | "capa"
  | "inspection"
  | "audit"
  | "near_miss"
  | "external"
  | "other";

export type LessonPhase = "assess" | "plan" | "operate" | "monitor";
export type LessonStatus = "draft" | "published" | "archived";

export type LessonLearned = {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  sourceType: SourceType;
  sourceId: string | null;
  phase: LessonPhase;
  hazardType: string | null;
  programTags: string[];
  status: LessonStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type LessonResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const sourceTypeLabels: Record<SourceType, string> = {
  incident:   "Incident Investigation",
  capa:       "CAPA Closure",
  inspection: "Inspection Observation",
  audit:      "Audit Finding",
  near_miss:  "Near Miss",
  external:   "External / Industry",
  other:      "Other",
};

export const lessonPhaseLabels: Record<LessonPhase, string> = {
  assess:  "Assess",
  plan:    "Plan",
  operate: "Operate",
  monitor: "Monitor",
};

export const lessonStatusLabels: Record<LessonStatus, string> = {
  draft:     "Draft",
  published: "Published",
  archived:  "Archived",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): LessonLearned {
  return {
    id:             row.id as string,
    organizationId: row.organization_id as string,
    title:          row.title as string,
    description:    row.description as string,
    sourceType:     (row.source_type as SourceType) ?? "other",
    sourceId:       row.source_id as string | null,
    phase:          (row.phase as LessonPhase) ?? "operate",
    hazardType:     row.hazard_type as string | null,
    programTags:    (row.program_tags as string[]) ?? [],
    status:         (row.status as LessonStatus) ?? "draft",
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    archivedAt:     row.archived_at as string | null,
  };
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------

function demoLessons(): LessonLearned[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "demo-lesson-001", organizationId: "demo-org",
      title: "Cryogen vessel inspection gap led to near miss",
      description:
        "Liquid nitrogen dewar was not inspected per schedule. Root cause: no recurring calendar entry. " +
        "Resolution: added weekly visual check to Compliance Calendar.",
      sourceType: "near_miss", sourceId: null,
      phase: "operate", hazardType: "chemical",
      programTags: ["cryogenic_safety", "equipment"],
      status: "published",
      createdAt: today, updatedAt: today, archivedAt: null,
    },
    {
      id: "demo-lesson-002", organizationId: "demo-org",
      title: "BSL-2 training gap found in compliance audit",
      description:
        "Two employees had not completed annual biosafety refresher. Automated expiry alerts added to Training Matrix.",
      sourceType: "audit", sourceId: null,
      phase: "plan", hazardType: "biological",
      programTags: ["training", "biosafety"],
      status: "draft",
      createdAt: today, updatedAt: today, archivedAt: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listLessons(filters?: {
  status?: LessonStatus;
  phase?: LessonPhase;
}): Promise<LessonLearned[]> {
  if (!isSupabaseConfigured()) {
    return demoLessons().filter((l) => {
      if (filters?.status && l.status !== filters.status) return false;
      if (filters?.phase && l.phase !== filters.phase) return false;
      return true;
    });
  }
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoLessons();
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("lessons_learned")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.phase)  query = query.eq("phase", filters.phase);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return demoLessons();
  }
}

export async function createLesson(input: {
  title: string;
  description: string;
  sourceType: SourceType;
  sourceId?: string | null;
  phase: LessonPhase;
  hazardType?: string | null;
  programTags?: string[];
}): Promise<LessonResult> {
  if (!isSupabaseConfigured())
    return { ok: true, message: "Demo: Lesson captured as draft.", id: "demo-new" };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("lessons_learned")
      .insert({
        organization_id: ctx.organizationId,
        title:           input.title,
        description:     input.description,
        source_type:     input.sourceType,
        source_id:       input.sourceId ?? null,
        phase:           input.phase,
        hazard_type:     input.hazardType ?? null,
        program_tags:    input.programTags ?? [],
        status:          "draft",
        created_by:      ctx.userId,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Lesson captured as draft. Publish it to share with the team.", id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function publishLesson(id: string): Promise<LessonResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Lesson published." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("lessons_learned")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Lesson published and visible to the team." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
