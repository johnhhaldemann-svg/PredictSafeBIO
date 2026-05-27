import { getDocument, persistDocumentRecommendations } from "@/lib/supabase/data";

export async function POST(request: Request) {
  const { documentId } = (await request.json()) as { documentId?: string };

  if (!documentId) {
    return Response.json({ ok: false, message: "documentId is required." }, { status: 400 });
  }

  const document = await getDocument(documentId);
  const result = await persistDocumentRecommendations(document);

  return Response.json(result, { status: result.ok ? 201 : 200 });
}
