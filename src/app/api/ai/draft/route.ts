/**
 * POST /api/ai/draft
 *
 * Streams a Claude Haiku draft for CAPA actions, reviewer notes, or incident summaries.
 * Requires: authenticated org member.
 * Returns: text/plain streaming response (fetch + ReadableStream on client).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildCapaActionPrompt(ctx: Record<string, string>) {
  return `You are an EHS compliance specialist helping draft a corrective action for a CAPA record.

Context:
- CAPA title: ${ctx.capaTitle ?? "Not provided"}
- Source type: ${ctx.sourceType ?? "unknown"} — "${ctx.sourceTitle ?? "not provided"}"
- Risk level: ${ctx.riskLevel ?? "unknown"}
- Critical control gaps: ${ctx.criticalGaps ?? "none listed"}
- Current CAPA status: ${ctx.capaStatus ?? "open"}

Write ONE corrective action title (1–2 sentences max).
Rules:
- Start with a strong action verb (Implement, Update, Retrain, Verify, Establish, Conduct)
- Be specific to the biosafety/EHS context — not generic
- Plain language an EHS manager would write
- No hedging language, no "may", "should consider", etc.
- Do NOT include a disclaimer — the UI adds that automatically

Output only the action text, nothing else.`;
}

function buildReviewerNotesPrompt(ctx: Record<string, string>) {
  return `You are an EHS reviewer completing a human review of a biosafety risk assessment.

Assessment context:
- Workflow: ${ctx.workflow ?? "not provided"}
- Area: ${ctx.area ?? "not provided"}
- Risk level: ${ctx.riskLevel ?? "unknown"} (score: ${ctx.score ?? "—"})
- Confidence: ${ctx.confidence ?? "—"}
- Top risk drivers: ${ctx.topDrivers ?? "none listed"}
- Critical control gaps: ${ctx.criticalGaps ?? "none listed"}
- Missing information: ${ctx.missingInformation ?? "none listed"}

Draft reviewer notes (3–5 sentences) in first person as the reviewer.
Cover:
1. Acknowledgement of the risk level and key drivers
2. Specific follow-up actions needed
3. Note any gaps that require immediate attention
4. Status recommendation (e.g., "Recommend escalating to safety committee" or "Recommend routine monitoring")

Do NOT include a disclaimer — the UI adds that automatically.
Output only the reviewer notes text, nothing else.`;
}

function buildIncidentSummaryPrompt(ctx: Record<string, string>) {
  return `You are an EHS specialist documenting a laboratory incident.

Incident context:
- Incident type: ${ctx.incidentType ?? "general"}
- Title: ${ctx.title ?? "not provided"}
- Severity: ${ctx.severity ?? "medium"}
- Lab / location: ${ctx.lab ?? "not specified"}
- Date / time: ${ctx.occurredAt ?? "not provided"}
- Reported by: ${ctx.reportedBy ?? "not provided"}

Draft a factual incident summary (3–4 sentences) in past tense.
Cover:
1. What happened (incident type and nature)
2. Where it occurred
3. Immediate response / containment steps taken (use "Initial containment steps were taken" if unknown)
4. Leave root-cause blank — it will be determined through investigation

Rules:
- Objective, factual language
- No speculation about root cause
- No hedging language like "may have" or "potentially"
- Do NOT include a disclaimer — the UI adds that automatically

Output only the summary text, nothing else.`;
}

function getPrompt(type: string, ctx: Record<string, string>): string {
  switch (type) {
    case "capa_action":    return buildCapaActionPrompt(ctx);
    case "reviewer_notes": return buildReviewerNotesPrompt(ctx);
    case "incident_summary": return buildIncidentSummaryPrompt(ctx);
    default: throw new Error(`Unknown draft type: ${type}`);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth gate
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // API key check
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to your environment variables." },
      { status: 503 }
    );
  }

  let body: { type: string; context: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, context } = body;
  if (!type || !context) {
    return NextResponse.json({ error: "Missing type or context" }, { status: 400 });
  }

  // Cap context size to limit prompt cost / abuse of the metered Claude endpoint.
  if (JSON.stringify(context).length > 10_000) {
    return NextResponse.json({ error: "Context too large (max 10KB)." }, { status: 413 });
  }

  let prompt: string;
  try {
    prompt = getPrompt(type, context);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Stream response from Claude Haiku
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: "You are a concise EHS compliance specialist. Output only the requested text — no preamble, no explanation, no markdown formatting.",
          messages: [{ role: "user", content: prompt }],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n[Draft failed: ${(err as Error).message}]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-store",
    },
  });
}
