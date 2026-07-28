import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp } from 'lucide-react';
import {
  renderTrendReason,
  severityForTrend,
  type OrphanTrendAssessment,
} from '@/lib/alarms/admissionOrphanTrend';

interface AdmissionOrphanTrendCardProps {
  readonly assessment: OrphanTrendAssessment;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly sqlVerdict: string | null;
  readonly onRefresh: () => void;
}

function variantFor(assessment: OrphanTrendAssessment): 'secondary' | 'outline' | 'destructive' {
  const severity = severityForTrend(assessment.verdict);
  if (severity === 'critical') return 'destructive';
  if (severity === 'warning') return 'outline';
  return 'secondary';
}

/**
 * Onda 235 — série histórica do órfão. Uma foto não distingue "apareceu agora"
 * de "cresce todo dia"; a série distingue, e é ela que decide a prioridade.
 */
export function AdmissionOrphanTrendCard({
  assessment,
  isLoading,
  isError,
  sqlVerdict,
  onRefresh,
}: AdmissionOrphanTrendCardProps) {
  const divergent = sqlVerdict !== null && sqlVerdict !== assessment.verdict;
  const max = Math.max(1, ...assessment.trend);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            Tendência do órfão do livro de admissão
          </CardTitle>
          <CardDescription>
            Histórico das conciliações diárias. Órfão em queda continua sendo órfão; órfão estável
            ou crescente é vazamento de contabilidade, não ruído.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Recarregar tendência do órfão"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Histórico indisponível — leitura restrita a administradores. Indisponível não é
            &quot;sem órfão&quot;.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={variantFor(assessment)}>{assessment.label}</Badge>
              <span className="text-sm text-muted-foreground">{renderTrendReason(assessment)}</span>
            </div>

            {assessment.trend.length > 0 && (
              <div
                className="flex h-16 items-end gap-1"
                role="img"
                aria-label={`Série de órfãos: ${assessment.trend.join(', ')}`}
              >
                {assessment.trend.map((value, i) => (
                  <div
                    key={`${i}-${value}`}
                    className={
                      value > 0
                        ? 'flex-1 rounded-t bg-destructive/70'
                        : 'flex-1 rounded-t bg-muted'
                    }
                    style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                    title={`${value} órfão(s)`}
                  />
                ))}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Órfão atual</dt>
                <dd className="font-medium">{assessment.orphanNow}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Conciliações seguidas</dt>
                <dd className="font-medium">{assessment.consecutive}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fotos legíveis</dt>
                <dd className="font-medium">{assessment.readable}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fotos ilegíveis</dt>
                <dd className="font-medium">{assessment.unreadable}</dd>
              </div>
            </dl>

            {divergent && (
              <p className="text-sm text-destructive">
                Divergência: o banco classificou “{sqlVerdict}” e a régua local classificou “
                {assessment.verdict}”. Trate como inconsistência de versão, não como dado.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
