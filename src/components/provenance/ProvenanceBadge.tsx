/**
 * Onda 205 — selo de procedência da leitura.
 *
 * Só pinta. Toda a decisão vem de `src/lib/provenance/readingProvenance.ts`:
 * o componente nunca reclassifica origem nem suaviza ressalva.
 */

import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Search, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLAIM_STRENGTH_LABEL,
  PROVENANCE_LABEL,
  type ProvenanceAssessment,
} from '@/lib/provenance/readingProvenance';

const STRENGTH_CLASS = {
  affirmable: 'border-success/40 bg-success/10 text-success',
  investigative: 'border-warning/40 bg-warning/10 text-warning',
  unusable: 'border-muted-foreground/30 bg-muted text-muted-foreground',
} as const;

const STRENGTH_ICON = {
  affirmable: ShieldCheck,
  investigative: Search,
  unusable: HelpCircle,
} as const;

export interface ProvenanceBadgeProps {
  assessment: ProvenanceAssessment;
  /** Exibe também as ressalvas em lista. */
  showCaveats?: boolean;
  className?: string;
}

export function ProvenanceBadge({
  assessment,
  showCaveats = false,
  className,
}: ProvenanceBadgeProps) {
  const Icon = STRENGTH_ICON[assessment.strength];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn('gap-1', STRENGTH_CLASS[assessment.strength])}
          aria-label={`Força probatória: ${CLAIM_STRENGTH_LABEL[assessment.strength]}`}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {CLAIM_STRENGTH_LABEL[assessment.strength]}
        </Badge>
        {assessment.governingTier && (
          <Badge variant="secondary">{PROVENANCE_LABEL[assessment.governingTier]}</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{assessment.summary}</p>

      {showCaveats && assessment.caveats.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {assessment.caveats.map((caveat) => (
            <li key={caveat.code} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{caveat.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
