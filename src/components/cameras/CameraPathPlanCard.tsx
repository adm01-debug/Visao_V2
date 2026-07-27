/**
 * Onda 153 — Card de diagnóstico do caminho de conectividade da câmera.
 *
 * Mostra a ordem real de tentativa (regra da Onda 152) com a evidência que a
 * sustenta: taxa observada, quarentena e a classe da última falha. O objetivo é
 * que o operador entenda POR QUE o sistema tentou o relé antes do IP local,
 * sem abrir log nenhum.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCameraPathEvidence } from '@/hooks/useCameraPathEvidence';
import type { ConnectivityPath, FailureKind, FailoverReason } from '@/lib/devices/pathFailover';
import { Route, ShieldAlert } from 'lucide-react';

const PATH_LABEL: Record<ConnectivityPath, string> = {
  direct: 'IP local',
  port_forward: 'Port-forward',
  vpn: 'VPN',
  relay: 'Agente local',
};

const KIND_LABEL: Record<FailureKind, string> = {
  transport: 'falha de rede',
  auth: 'credencial',
  config: 'configuração',
  device: 'equipamento',
  none: 'sem falha',
};

const REASON_LABEL: Record<FailoverReason, string> = {
  preferred_healthy: 'Caminho preferido está saudável.',
  preferred_quarantined: 'Preferido em quarentena; alternativa assumiu.',
  promoted_by_evidence: 'Alternativa promovida por evidência estatística.',
  preferred_not_configured: 'Preferido não está configurado nesta câmera.',
  no_path_configured: 'Nenhum caminho configurado.',
};

export interface CameraPathPlanCardProps {
  cameraId: string;
  preferredPath?: ConnectivityPath;
  windowMinutes?: number;
  className?: string;
}

export function CameraPathPlanCard({
  cameraId,
  preferredPath = 'direct',
  windowMinutes = 1440,
  className,
}: CameraPathPlanCardProps) {
  const { plan, evidence, isLoading, isError } = useCameraPathEvidence({
    cameraId,
    preferredPath,
    windowMinutes,
  });

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="h-4 w-4 text-primary" aria-hidden />
          Caminho de conexão
        </CardTitle>
        <CardDescription>
          Ordem de tentativa nas últimas {Math.round(windowMinutes / 60)}h —{' '}
          {REASON_LABEL[plan.reason]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-24 w-full" />}

        {isError && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Não foi possível carregar a evidência de conectividade.
          </p>
        )}

        {!isLoading && !isError && plan.decisions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sem caminho configurado para esta câmera.
          </p>
        )}

        {!isLoading &&
          !isError &&
          plan.decisions.map((decision, index) => {
            const ev = evidence[decision.path];
            const rate =
              ev && ev.attempts > 0
                ? `${Math.round((ev.successes / ev.attempts) * 100)}% em ${ev.attempts}`
                : 'sem histórico';
            return (
              <div
                key={decision.path}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">{index + 1}º</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {PATH_LABEL[decision.path]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rate}
                      {ev && ev.lastFailureKind !== 'none'
                        ? ` · última falha: ${KIND_LABEL[ev.lastFailureKind]}`
                        : ''}
                    </p>
                  </div>
                </div>
                {decision.quarantined ? (
                  <Badge variant="destructive">Em quarentena</Badge>
                ) : index === 0 ? (
                  <Badge>Preferencial agora</Badge>
                ) : (
                  <Badge variant="secondary">Reserva</Badge>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
