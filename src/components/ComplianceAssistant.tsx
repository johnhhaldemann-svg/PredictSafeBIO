"use client";

import { useState } from "react";
import { Brain, Send, ShieldCheck } from "lucide-react";
import { askComplianceAssistant, contextTypeLabels, type ContextType } from "@/lib/services/ai-assistant-service";

type Props = {
  orgId: string;
  defaultContext?: ContextType;
};

export function ComplianceAssistant({ orgId, defaultContext = "general" }: Props) {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState<ContextType>(defaultContext);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const result = await askComplianceAssistant(question.trim(), orgId, context);
      setAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">AI Compliance Assistant</p>
          <h2>Ask an EHS question</h2>
          <p className="muted">
            Covers OSHA, CDC/NIH BMBL, EPA, FDA CGMP, and Cal/OSHA. All outputs are advisory —
            <strong> Draft — Human Review Required.</strong>
          </p>
        </div>
        <Brain size={24} />
      </div>

      <form onSubmit={handleSubmit} className="stacked-form">
        <div className="form-grid">
          <label>
            Topic context
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as ContextType)}
              disabled={loading}
            >
              {(Object.keys(contextTypeLabels) as ContextType[]).map((k) => (
                <option key={k} value={k}>{contextTypeLabels[k]}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Your compliance question
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder={
              context === "chemical"   ? "e.g. What PPE is required when handling hydrochloric acid 37%?" :
              context === "waste"      ? "e.g. How long can we accumulate chemical waste before disposal is required?" :
              context === "permit"     ? "e.g. What are the requirements for a confined space entry permit?" :
              context === "biosafety"  ? "e.g. What containment controls are required for BSL-2 work with lentiviral vectors?" :
              context === "capa"       ? "e.g. What elements must a CAPA include to satisfy FDA 21 CFR 820.100?" :
              "e.g. What are the OSHA requirements for a chemical hygiene plan in a research lab?"
            }
            disabled={loading}
            required
          />
        </label>

        <button
          className="button-primary btn-with-icon"
          type="submit"
          disabled={loading || !question.trim()}
        >
          <Send size={15} />
          {loading ? "Asking…" : "Ask compliance assistant"}
        </button>
      </form>

      {error && <p className="form-message ai-answer-block">{error}</p>}

      {answer && (
        <div className="ai-answer-block">
          <div className="ai-answer-header">
            <ShieldCheck size={14} className="ai-answer-icon" />
            <span className="muted ai-answer-draft">
              Draft — Human Review Required · {contextTypeLabels[context]}
            </span>
          </div>
          <div className="ai-answer-body">{answer}</div>
        </div>
      )}
    </section>
  );
}
