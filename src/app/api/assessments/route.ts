import { assessBioRisk } from "@/lib/bio-ai/engine";
import type { BioAiInput } from "@/lib/bio-ai/types";
import { saveAssessment } from "@/lib/supabase/data";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Auth gate — the bio-risk analysis is proprietary; never return it to
  // anonymous callers.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const input = (await request.json()) as BioAiInput;
  const assessment = assessBioRisk(input);
  const result = await saveAssessment(input);

  if (!result.ok) {
    return Response.json({ ...result, assessment }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
