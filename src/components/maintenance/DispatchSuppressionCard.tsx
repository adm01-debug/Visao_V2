import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BellOff, RefreshCw } from 'lucide-react';
import {
  renderLedgerVerdict,
  severityForLedger,
  type ConditionVerdict,
  type SuppressionLedger,
} from '@/lib/maintenance/suppressionLedger';

interface DispatchSuppressionCardProps {
  readonly ledger: SuppressionLedger;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRefresh: () => void;
}

const CONDITION_LABEL: Record<ConditionVerdict, string> = {
  light: 'pontual',
  moderate: 'esperado',
  heavy: 'volume alto',
  starved: 'calada sem avisar',
};

function badgeVariant(
  severity: 'ok' | 'warning' | 'critical'
): 'secondary' | 'outline' | 'destructive' {
  if (severity === 'critical') return 'destructive';
  if (severity === 'warning') return 'outline';
  return 'secondary';
}

/**
 * Onda 242 — quanto ruído a política de silêncio evitou, e a que custo.
 *
 * O número grande (mensagens caladas) só tem sentido ao lado do número pequeno
 * (mensagens entregues): silêncio sem nenhuma entrega não é economia, é uma
 * condição sufocada — e é isso que o veredito `starved` denuncia.
 */
export function DispatchSuppressionCard({
  ledger,
  isLoading,
  isError,
  onRefresh,
}: DispatchSuppressionCardProps) {
  const severity = severityForLedger(ledger.verdict);
  const days = Math.max(1, Math.round(ledger.windowHours / 24));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-primary" aria-hidden="true" />
            Ruído evitado no canal externo
          </CardTitle>
          <CardDescription>
            Trilha das notificações caladas pelo silêncio por condição nos últimos {days} dia(s).
            Condição calada que nunca chegou a notificar ninguém é falha, não economia.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Recarregar trilha de supressão"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Trilha indisponível — leitura restrita a administradores.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={badgeVariant(severity)}>{renderLedgerVerdict(ledger)}</Badge>
              {ledger.saturated && (
                <Badge variant="outline">Amostra saturada no teto declarado</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xl font-semibold text-foreground">{ledger.suppressed}</p>
                <p className="text-xs text-muted-foreground">mensagens caladas</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xl font-semibold text-foreground">{ledger.delivered}</p>
                <p className="text-xs text-muted-foreground">mensagens entregues</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xl font-semibold text-foreground">{ledger.unreadable}</p>
                <p className="text-xs text-muted-foreground">
                  linhas ilegíveis (nunca contadas como economia)
                </p>
              </div>
            </div>

            {ledger.conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma supressão registrada na janela — nada a concluir sobre ruído evitado.
              </p>
            ) : (
              <ul className="space-y-2">
                {ledger.conditions.slice(0, 8).map((condition) => (
                  <li
                    key={condition.conditionKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {condition.conditionKey}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {condition.suppressed} calada(s) · {condition.delivered} entregue(s) ·{' '}
                        {condition.perDay}/dia · {condition.channels.join(', ')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        condition.verdict === 'starved'
                          ? 'destructive'
                          : condition.verdict === 'heavy'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {CONDITION_LABEL[condition.verdict]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
