"use server";

import { revalidatePath } from "next/cache";
import { reviewKnowledgeEntry } from "@/lib/supabase/knowledge-service";
import type { AiKnowledgeQuality } from "@/lib/bio-ai/types";

export async function approveEntryAction(
  entryId: string,
  quality: AiKnowledgeQuality
): Promise<void> {
  await reviewKnowledgeEntry({ entryId, reviewStatus: "approved", qualityClassification: quality, excludedFromEngine: false });
  revalidatePath("/admin/ai-knowledge");
}

export async function flagEntryAction(entryId: string): Promise<void> {
  await reviewKnowledgeEntry({ entryId, reviewStatus: "flagged", qualityClassification: "low_quality", excludedFromEngine: false });
  revalidatePath("/admin/ai-knowledge");
}

export async function rejectEntryAction(entryId: string): Promise<void> {
  await reviewKnowledgeEntry({
    entryId,
    reviewStatus: "rejected",
    qualityClassification: "junk",
    reviewNotes: "Rejected by owner — excluded from Safety Engine scoring.",
    excludedFromEngine: true
  });
  revalidatePath("/admin/ai-knowledge");
}
