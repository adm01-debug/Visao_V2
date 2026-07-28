/**
 * Onda 183 — cartão de séries crônicas no console de manutenção.
 *
 * Apresentação apenas: toda decisão vem de `buildChronicSeriesBoard`. O que a
 * tela acrescenta é honestidade visual — "sem registro" não é pintado como
 * saúde e o corte da lista é dito em texto.
 */

import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  chronicBoardSummary,
  seriesDiscardReasonLabel,
  seriesStateLabel,
  type ChronicSeriesBoard,
  type ChronicSeriesEntry,
  type SeriesDiscardReason,
} from '@/lib/alarms/chronicSeriesBoard';
import { noticeModeLabel, recurrenceClassLabel } from '@/lib/alarms/alarmRecurrence';
import { cn } from '@/lib/utils';

export interface ChronicSeriesCardProps {
  board: ChronicSeriesBoard;
  isLoading: boolean;
  onRefresh: () => void;
}

const classVariant = (entry: ChronicSeriesEntry): string => {
  if (entry.klass === 'chronic') return 'bg-destructive/15 text-destructive border-destructive/30';
  if (entry.klass === 'recurrent') return 'bg-warning/15 text-warning border-warning/30';
  return 'bg-muted text-muted-foreground border-border';
};

const stateVariant = (entry: ChronicSeriesEntry): string => {
  switch (entry.state) {
    case 'open':
      return 'bg-destructive/10 text-destructive';
    case 'settling':
      return 'bg-warning/10 text-warning';
    case 'unknown':
      return 'bg-muted text-muted-foreground';
    case 'quiet':
      return 'bg-success/10 text-success';
  }
};

const formatAge = (ageMs: number | null): string => {
  if (ageMs === null) return 'sem registro';
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
};

export function ChronicSeriesCard({ board, isLoading, onRefresh }: ChronicSeriesCardProps) {
  const discards = (Object.entries(board.discarded) as [SeriesDiscardReason, number][]).filter(
    ([, count]) => count > 0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            Séries crônicas de alarme
          </CardTitle>
          <CardDescription>{chronicBoardSummary(board)}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Atualizar séries crônicas"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {!isLoading && board.entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma série de alarme na janela avaliada. Isso não afirma que os equipamentos estão
            saudáveis — apenas que não houve episódio registrado no período.
          </p>
        )}

        {!isLoading && board.entries.length > 0 && (
          <ul className="space-y-2" aria-label="Séries de alarme por prioridade">
            {board.entries.map((entry) => (
              <li
                key={entry.seriesKey}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium" title={entry.seriesKey}>
                    {entry.seriesKey}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.episodesInWindow} episódio(s) na janela · {entry.totalEpisodes} no
                    histórico · última abertura {formatAge(entry.ageMs)}
                    {entry.clockAhead && ' · relógio da origem adiantado'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {entry.flapping && (
                    <Badge variant="outline" className="gap-1 border-warning/30 text-warning">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      Oscilando
                    </Badge>
                  )}
                  <Badge variant="outline" className={stateVariant(entry)}>
                    {seriesStateLabel(entry.state)}
                  </Badge>
                  <Badge variant="outline" className={classVariant(entry)}>
                    {recurrenceClassLabel(entry.klass)}
                  </Badge>
                  <Badge variant="secondary">{noticeModeLabel(entry.mode)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}

        {board.truncated > 0 && (
          <p className="text-xs text-muted-foreground">
            {board.truncated} série(s) além do teto de exibição não estão listadas.
          </p>
        )}

        {discards.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Linhas descartadas por inconsistência:{' '}
            {discards.map(([reason, count]) => `${count} ${seriesDiscardReasonLabel(reason)}`).join(' · ')}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
