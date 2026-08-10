import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Archive, RefreshCw } from 'lucide-react';
import {
  purgeHealthLabel,
  type PurgeHealth,
  type PurgeHistorySnapshot,
} from '@/lib/alarms/admissionPurgeHistory';

interface AdmissionPurgeHistoryCardProps {
  readonly snapshot: PurgeHistorySnapshot;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRefresh: () => void;
}

function healthVariant(health: PurgeHealth): 'secondary' | 'outline' | 'destructive' {
  if (health === 'ok') return 'secondary';
  if (health === 'backlog' || health === 'late') return 'outline';
  return 'destructive';
}

const ROW_STATUS_LABEL: Record<string, string> = {
  valid: 'válida',
  inconsistent: 'contestada',
  unreadable: 'ilegível',
};

function formatInstant(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleString('pt-BR');
}

/**
 * Onda 231 — supervisão humana do expurgo do livro de admissão (Onda 230).
 * Distingue três eixos independentes: pontualidade, passivo e legibilidade.
 */
export function AdmissionPurgeHistoryCard({
  snapshot,
  isLoading,
  isError,
  onRefresh,
}: AdmissionPurgeHistoryCardProps) {
  const suspect = snapshot.inconsistentRows + snapshot.unreadableRows;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" aria-hidden="true" />
            Expurgo do livro de admissão
          </CardTitle>
          <CardDescription>
            Pontualidade, passivo de janelas adiadas pelo teto de lote e legibilidade da trilha são
            eixos separados: rotina no horário com passivo crescente não está em dia.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Recarregar histórico de expurgo"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível ler a trilha de expurgo. Ausência de leitura não é prova de rotina
            saudável.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={healthVariant(snapshot.health)}>
                {purgeHealthLabel(snapshot.health)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {snapshot.hoursSinceLast === null
                  ? 'sem execução legível'
                  : `última execução há ${snapshot.hoursSinceLast.toFixed(1)} h`}
              </span>
              {suspect > 0 && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {suspect} linha(s) sob suspeita
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Adiadas (passivo)</dt>
                <dd className="text-lg font-semibold">{snapshot.deferredNow}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Quarentenadas</dt>
                <dd className="text-lg font-semibold">{snapshot.quarantinedNow}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Apagadas (histórico)</dt>
                <dd className="text-lg font-semibold">{snapshot.deletedWindow}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Execuções válidas</dt>
                <dd className="text-lg font-semibold">
                  {snapshot.validRows}/{snapshot.totalRows}
                </dd>
              </div>
            </dl>

            {snapshot.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma execução registrada até agora.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Execuções recentes do expurgo do livro de admissão
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Execução
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Situação
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Apagadas
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Adiadas
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Quarentena
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Duração
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.rows.slice(0, 10).map((row) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{formatInstant(row.executedAt)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={row.status === 'valid' ? 'secondary' : 'destructive'}>
                            {ROW_STATUS_LABEL[row.status] ?? row.status}
                          </Badge>
                          {row.reason && (
                            <span className="ml-2 text-xs text-muted-foreground">{row.reason}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.deleted ?? '—'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.deferred ?? '—'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {row.quarantined ?? '—'}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {row.durationMs === null ? '—' : `${row.durationMs} ms`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
