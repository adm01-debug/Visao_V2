/**
 * Onda 210 — Cartão de leitura da frota de pipelines de visão.
 *
 * Puramente apresentacional: toda a régua vive em `pipelineFleet.ts`. Este
 * componente não classifica nada, não ordena nada e não esconde nada — ele
 * apenas pinta o retrato que recebeu.
 */

import { AlertTriangle, CheckCircle2, Cpu, HelpCircle, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  summarizeFleet,
  type CameraHealth,
  type CameraPipelineInput,
  type CameraPressure,
} from '@/lib/vision/pipelineFleet';

const HEALTH_META: Record<CameraHealth, { label: string; className: string }> = {
  healthy: { label: 'Saudável', className: 'bg-success/15 text-success border-success/30' },
  unknown: { label: 'Sem dados', className: 'bg-muted text-muted-foreground border-border' },
  degraded: { label: 'Degradado', className: 'bg-warning/15 text-warning border-warning/30' },
  probation: { label: 'Em observação', className: 'bg-warning/15 text-warning border-warning/30' },
  quarantined: {
    label: 'Suspenso',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

const PRESSURE_META: Record<CameraPressure, { label: string; className: string }> = {
  calm: { label: 'Entrega em dia', className: 'text-muted-foreground' },
  unknown: { label: 'Sem publicação', className: 'text-muted-foreground' },
  backlogged: { label: 'Entrega atrasada', className: 'text-warning' },
  starved: { label: 'Sem entrega', className: 'text-destructive' },
};

export interface VisionPipelineFleetCardProps {
  readonly inputs: readonly CameraPipelineInput[];
  readonly className?: string;
}

export function VisionPipelineFleetCard({ inputs, className }: VisionPipelineFleetCardProps) {
  const fleet = summarizeFleet(inputs);
  const HeadIcon =
    fleet.total === 0 ? HelpCircle : fleet.actionableCount === 0 ? CheckCircle2 : AlertTriangle;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Cpu className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Pipelines de visão
        </CardTitle>
        <p
          className={cn(
            'flex items-center gap-2 text-xs',
            fleet.actionableCount === 0 ? 'text-muted-foreground' : 'text-warning'
          )}
        >
          <HeadIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {fleet.headline}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {fleet.total === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nenhum pipeline ativo neste momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {fleet.cameras.map((camera) => {
              const health = HEALTH_META[camera.health];
              const pressure = PRESSURE_META[camera.pressure];
              return (
                <li
                  key={camera.cameraId}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {camera.cameraId}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{camera.headline}</p>
                    <p
                      className={cn('mt-1 flex items-center gap-1 text-[11px]', pressure.className)}
                    >
                      <Waves className="h-3 w-3" aria-hidden="true" />
                      {pressure.label}
                      <span className="text-muted-foreground">
                        · {camera.publishedFrames} frame(s)
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={cn('text-[11px]', health.className)}>
                      {health.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {camera.successRatio === null
                        ? 'sem desfecho'
                        : `${Math.round(camera.successRatio * 100)}% sucesso`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
