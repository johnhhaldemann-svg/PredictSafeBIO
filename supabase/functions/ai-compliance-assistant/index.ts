import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  // Auth check
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }

  let question: string
  let org_id: string
  let context_type: string

  try {
    const body = await req.json()
    question = body.question
    org_id = body.org_id
    context_type = body.context_type ?? "general"
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }

  if (!question || !org_id) {
    return new Response(JSON.stringify({ error: "question and org_id are required." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. Fetch relevant knowledge entries for context
  const { data: knowledge } = await supabase
    .from("ai_knowledge_entries")
    .select("content, category, tags")
    .eq("organization_id", org_id)
    .limit(10)

  // 2. Fetch active risk cells for additional context
  const { data: riskCells } = await supabase
    .from("risk_cells")
    .select("cell_type, label, severity, linked_record_type, status")
    .eq("organization_id", org_id)
    .eq("status", "active")
    .in("severity", ["high", "critical"])
    .limit(10)

  // 3. Call Claude
  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a biotech EHS and compliance assistant embedded in PredictSafeBIO.
Help users with OSHA lab chemical hygiene (29 CFR 1910.1450), CDC/NIH biosafety guidance (BMBL 6th ed),
FDA CGMP data integrity (21 CFR Part 11), EPA pesticide label compliance (FIFRA),
Cal/OSHA requirements, and general EHS best practices for research and biotech facilities.

Be specific, cite the relevant regulation or standard section, and focus on actionable next steps.
Keep responses concise and practical — no more than 3-4 paragraphs.

Current organizational context:
- Context type: ${context_type}
- Active high/critical risk signals: ${JSON.stringify(riskCells ?? [])}
- Relevant organizational knowledge: ${JSON.stringify(knowledge ?? [])}

Important: All outputs are advisory. Final compliance decisions must be made by qualified EHS personnel.
Label all outputs: "Draft — Human Review Required."`,
      messages: [{ role: "user", content: question }]
    })
  })

  if (!claudeResponse.ok) {
    const err = await claudeResponse.text()
    return new Response(JSON.stringify({ error: `Claude API error: ${err}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }

  const claudeData = await claudeResponse.json()
  const answer = claudeData.content?.[0]?.text ?? "No response generated."

  // 4. Log to ai_knowledge_entries for future context
  await supabase.from("ai_knowledge_entries").insert({
    organization_id: org_id,
    category: context_type,
    content: `Q: ${question}\nA: ${answer}`,
    tags: [context_type, "assistant_response", "compliance_qa"]
  })

  return new Response(JSON.stringify({ answer, context_type }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  })
})
