import { getDocument, persistDocumentRecommendations } from "@/lib/supabase/data";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Auth gate — do not expose the recommendation engine (or demo fallback) to
  // anonymous callers.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = (await request.json()) as { documentId?: string };

  if (!documentId) {
    return Response.json({ ok: false, message: "documentId is required." }, { status: 400 });
  }

  const document = await getDocument(documentId);
  if (!document) {
    return Response.json({ ok: false, message: "Document was not found." }, { status: 404 });
  }

  const result = await persistDocumentRecommendations(document);

  return Response.json(result, { status: result.ok ? 201 : 200 });
}
