import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * LoopNext — a small "what's next in the safety loop" strip.
 *
 * Makes the Assess → Plan → Operate → Monitor → Assess cycle tangible by
 * pointing each page at the next stage. Pair the current stage with the next
 * one so the user always knows where they are and where to go.
 */
export function LoopNext({
  stage,
  nextStage,
  blurb,
  ctaLabel,
  ctaHref,
}: {
  stage: string;
  nextStage: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <aside className="loop-next" aria-label={`Next: ${nextStage}`}>
      <div className="loop-next-text">
        <span className="loop-next-badge">
          {stage} <ArrowRight size={12} aria-hidden="true" /> {nextStage}
        </span>
        <p>{blurb}</p>
      </div>
      <Link href={ctaHref} className="button-primary compact">
        {ctaLabel} <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </aside>
  );
}
