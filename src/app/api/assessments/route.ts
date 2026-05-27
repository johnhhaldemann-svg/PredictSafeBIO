import { assessBioRisk } from "@/lib/bio-ai/engine";
import type { BioAiInput } from "@/lib/bio-ai/types";
import { saveAssessment } from "@/lib/supabase/data";

export async function POST(request: Request) {
  const input = (await request.json()) as BioAiInput;
  const assessment = assessBioRisk(input);
  const result = await saveAssessment(input);

  if (!result.ok) {
    return Response.json({ ...result, assessment }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
