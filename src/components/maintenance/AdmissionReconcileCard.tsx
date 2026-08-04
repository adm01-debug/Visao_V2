import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ScaleIcon } from 'lucide-react';
import type { ReconcileSnapshot, ReconcileSeverity } from '@/lib/alarms/admissionReconciliation';

interface AdmissionReconcileCardProps {
  readonly snapshot: ReconcileSnapshot;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly sqlVerdict: string | null;
  readonly onRefresh: () => void;
}

function severityVariant(severity: ReconcileSeverity): 'secondary' | 'outline' | 'destructive' {
  if (severity === 'none') return 'secondary';
  if (severity === 'warning') return 'outline';
  return 'destructive';
}

/**
 * Onda 233 — confere o estoque real de janelas vencidas contra o passivo que a
 * rotina de expurgo declarou. O excedente ("órfão") é a única prova de que a
 * contabilidade da rotina não fecha.
 */
export function AdmissionReconcileCard({
  snapshot,
  isLoading,
  isError,
  sqlVerdict,
  onRefresh,
}: AdmissionReconcileCardProps) {
  const divergent = sqlVerdict !== null && sqlVerdict !== snapshot.verdict;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScaleIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            Conciliação do livro de admissão
          </CardTitle>
          <CardDescription>
            Compara o estoque real de janelas vencidas com a dívida que a rotina assumiu. Estoque
            acima da dívida é registro vencido sem dono — a rotina não está apagando o que declara.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Recarregar conciliação do livro de admissão"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível inventariar o estoque. Ausência de leitura não é prova de livro limpo.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant(snapshot.severity)}>{snapshot.label}</Badge>
              {snapshot.reason ? (
                <span className="text-xs text-muted-foreground">motivo: {snapshot.reason}</span>
              ) : null}
              {divergent ? (
                <Badge variant="destructive">veredito do banco diverge ({sqlVerdict})</Badge>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Vencidas vivas</dt>
                <dd className="font-medium">{snapshot.expiredStock.toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dívida assumida</dt>
                <dd className="font-medium">{snapshot.accountedFor.toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sem dono</dt>
                <dd
                  className={
                    snapshot.orphanCount > 0 ? 'font-medium text-destructive' : 'font-medium'
                  }
                >
                  {snapshot.orphanCount.toLocaleString('pt-BR')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Deriva (venceu após o expurgo)</dt>
                <dd className="font-medium">{snapshot.driftStock.toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quarentena (ilegíveis)</dt>
                <dd className="font-medium">{snapshot.quarantinedStock.toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total no livro</dt>
                <dd className="font-medium">{snapshot.totalStock.toLocaleString('pt-BR')}</dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
