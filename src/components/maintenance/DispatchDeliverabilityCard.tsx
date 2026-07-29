import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MegaphoneOff, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  deliveryLabel,
  punctualityLabel,
  type DeliverabilityHealth,
  type DeliverabilityVerdict,
} from '@/lib/maintenance/dispatchDeliverability';

interface DispatchDeliverabilityCardProps {
  readonly verdict: DeliverabilityVerdict;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRefresh: () => void;
}

function badgeVariant(
  health: DeliverabilityHealth,
): 'secondary' | 'outline' | 'destructive' {
  if (health === 'critical') return 'destructive';
  if (health === 'warning' || health === 'unknown') return 'outline';
  return 'secondary';
}

const HEALTH_LABEL: Record<DeliverabilityHealth, string> = {
  ok: 'entregando',
  warning: 'atenção',
  unknown: 'sem prova',
  critical: 'crítico',
};

function ageLabel(minutes: number | null): string {
  if (minutes === null) return 'nunca executou';
  if (minutes < 90) return `há ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `há ${hours.toFixed(1)} h`;
  return `há ${(hours / 24).toFixed(1)} dia(s)`;
}

/**
 * Onda 246 — **o painel para de dizer que avisou quando ninguém foi avisado.**
 *
 * Este cartão existe por um motivo específico: a escada de escalonamento
 * exibia "nível 3, sem reconhecimento há 370 min" para alertas que nunca
 * saíram do banco. Enquanto a prova de entrega não fosse publicada ao lado da
 * escada, o console continuaria vendendo uma confiança que o sistema não tinha.
 */
export function DispatchDeliverabilityCard({
  verdict,
  isLoading,
  isError,
  onRefresh,
}: DispatchDeliverabilityCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MegaphoneOff className="h-5 w-5 text-primary" aria-hidden="true" />
            Prova de entrega externa
          </CardTitle>
          <CardDescription>
            Nenhuma linha aqui significa nenhuma execução registrada — jamais "está tudo bem".
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Recarregar prova de entrega">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível ler o livro de execuções do despachante.
          </p>
        ) : (
          <>
            {verdict.unnotifiedCritical > 0 ? (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>
                  {verdict.unnotifiedCritical} alerta(s) crítico(s) sem aviso externo
                </AlertTitle>
                <AlertDescription>
                  {verdict.channels.length === 0
                    ? 'Nenhum canal externo está configurado: a escada de escalonamento avança sozinha, mas ninguém é chamado.'
                    : 'A última execução planejou envios e nenhum saiu.'}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={badgeVariant(verdict.health)}>{HEALTH_LABEL[verdict.health]}</Badge>
              <Badge variant="outline">entrega: {deliveryLabel(verdict.delivery)}</Badge>
              <Badge variant="outline">execução: {punctualityLabel(verdict.punctuality)}</Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Última execução</dt>
                <dd className="font-medium">{ageLabel(verdict.minutesSinceRun)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Canais configurados</dt>
                <dd className="font-medium">
                  {verdict.channels.length === 0 ? 'nenhum' : verdict.channels.join(', ')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Críticos não avisados</dt>
                <dd className="font-medium">{verdict.unnotifiedCritical}</dd>
              </div>
            </dl>

            {verdict.reasons.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {verdict.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
