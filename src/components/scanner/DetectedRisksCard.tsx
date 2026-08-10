/**
 * VISÃO — Detected Risks Results Card (refatorado)
 *
 * Renderiza os riscos detectados pelo scanner. Subcomponentes extraídos para
 * `./detected-risks/`. API pública e comportamento visual permanecem idênticos.
 */
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EmptyRisks } from './detected-risks/EmptyRisks';
import { RiskRow } from './detected-risks/RiskRow';
import { SeverityCounters } from './detected-risks/SeverityCounters';
import { countBySeverity, sortRisks, type DetectedRisk } from './detected-risks/types';

export type { DetectedRisk, RiskSeverity, RiskType } from './detected-risks/types';

interface DetectedRisksCardProps {
  risks: DetectedRisk[];
  onViewDetails?: (risk: DetectedRisk) => void;
  onViewCamera?: (risk: DetectedRisk) => void;
  className?: string;
  title?: string;
}

export function DetectedRisksCard({
  risks,
  onViewDetails,
  onViewCamera,
  className,
  title = 'Riscos Detectados',
}: DetectedRisksCardProps) {
  const sorted = sortRisks(risks);
  const counts = countBySeverity(risks);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border bg-muted/30 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="ml-1 text-xs">
            {risks.length}
          </Badge>
        </div>
        <SeverityCounters counts={counts} />
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {sorted.length === 0 ? (
          <EmptyRisks />
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((risk) => (
              <li key={risk.id}>
                <RiskRow risk={risk} onViewDetails={onViewDetails} onViewCamera={onViewCamera} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default DetectedRisksCard;
