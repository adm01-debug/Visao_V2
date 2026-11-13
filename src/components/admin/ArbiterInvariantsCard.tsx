import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useArbiterInvariants } from '@/hooks/useArbiterInvariants';
import { summarizeInvariants } from '@/lib/agents/arbiterInvariants';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Onda 142 — invariantes estruturais do árbitro de cura, verificadas ao vivo.
 *
 * O gate de CI valida estas quatro regras no banco de desenvolvimento. Este
 * painel responde a pergunta que o CI não responde: o banco de produção, agora,
 * ainda satisfaz as mesmas regras? Somente leitura, restrito a administradores
 * pela função do banco.
 */
export function ArbiterInvariantsCard() {
  const { isAdmin } = useUserRole();

  // Não renderiza nada para não-admins — a RPC heal_arbiter_invariants
  // retorna 403 e causaria loop de retry no React Query.
  if (!isAdmin) return null;
  // O hook da RPC vive no componente interno: chamá-lo depois do `return`
  // condicional mudava a quantidade de hooks quando o papel carregava
  // (false → true) e o React derrubava o card (rules-of-hooks).
  return <ArbiterInvariantsCardContent />;
}

function ArbiterInvariantsCardContent() {
  const { data, isLoading, isFetching, error, refetch } = useArbiterInvariants();
  const rows = data ?? [];
  const summary = summarizeInvariants(rows);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Invariantes do árbitro de cura
          </CardTitle>
          <CardDescription>
            Consistência estrutural verificada direto no banco de produção.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <Badge
              variant="outline"
              className={
                summary.healthy
                  ? 'border-success/30 bg-success/15 text-success'
                  : 'border-destructive/30 bg-destructive/15 text-destructive'
              }
            >
              {summary.healthy
                ? `${summary.total}/${summary.total} íntegras`
                : `${summary.failing} quebrada(s)`}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Revalidar invariantes do árbitro"
          >
            <RefreshCw
              className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              aria-hidden="true"
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível verificar as invariantes</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Erro desconhecido. A verificação é restrita a administradores.'}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!isLoading && !error && (
          <ul className="space-y-2" aria-live="polite">
            {rows.map((row) => (
              <li
                key={row.key}
                className={`rounded-lg border p-3 ${
                  row.ok ? 'border-border bg-muted/30' : 'border-destructive/40 bg-destructive/10'
                }`}
              >
                <div className="flex items-start gap-2">
                  {row.ok ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {row.meta.label}
                      <span className="sr-only">{row.ok ? ' — íntegra' : ' — quebrada'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{row.meta.rationale}</p>
                    {!row.ok && (
                      <p className="text-xs font-medium text-destructive">{row.meta.impact}</p>
                    )}
                    <p className="break-words font-mono text-[11px] text-muted-foreground/80">
                      {row.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
