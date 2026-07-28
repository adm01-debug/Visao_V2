/**
 * Onda 199 — Linha do tempo da pessoa.
 *
 * Espelho visual da régua `personTimeline`: a tela não recalcula nada, não
 * inventa duração e não esconde o que ficou de fora. Ressalva e frase saem da
 * regra única.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Route, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import type { FaceSearchResult } from '@/lib/faces/faceSearch';
import { buildPersonTimeline, describeStay } from '@/lib/faces/personTimeline';

export interface PersonTimelineCardProps {
  readonly results: readonly FaceSearchResult[];
  /** Fim da janela consultada — usado só para saber se a última saída foi observada. */
  readonly windowEndMs: number;
  readonly cameraNames?: Readonly<Record<string, string>>;
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatGap(ms: number): string {
  if (ms < 0) return 'sobreposto';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function PersonTimelineCard({ results, windowEndMs, cameraNames }: PersonTimelineCardProps) {
  const timeline = useMemo(() => buildPersonTimeline(results, windowEndMs), [results, windowEndMs]);

  const nameOf = (id: string | null): string =>
    id === null ? 'Câmera não informada' : (cameraNames?.[id] ?? id);

  const excludedTotal =
    timeline.excluded.unverified + timeline.excluded.spoofSuspect + timeline.excluded.unidentified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="h-4 w-4 text-primary" aria-hidden="true" />
          Linha do tempo
        </CardTitle>
        <CardDescription>
          Permanências consolidadas a partir das leituras confirmadas. Leituras não medidas ou suspeitas
          ficam fora da trajetória e são declaradas abaixo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {timeline.stays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma permanência pôde ser afirmada com as leituras deste recorte.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Permanências</p>
                <p className="text-lg font-semibold">{timeline.stays.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Câmeras</p>
                <p className="text-lg font-semibold">{timeline.camerasVisited}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Primeiro avistamento</p>
                <p className="font-medium">
                  {timeline.firstSeenMs !== null ? timeFmt.format(timeline.firstSeenMs) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Último avistamento</p>
                <p className="font-medium">
                  {timeline.lastSeenMs !== null ? timeFmt.format(timeline.lastSeenMs) : '—'}
                </p>
              </div>
            </div>

            {timeline.hasConflict && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Presença simultânea em câmeras diferentes</AlertTitle>
                <AlertDescription>
                  Há trechos em que a pessoa aparece em dois pontos ao mesmo tempo. Ou uma identificação
                  está errada, ou os equipamentos cobrem o mesmo local. O sistema não escolhe por você.
                </AlertDescription>
              </Alert>
            )}

            <ol className="space-y-3">
              {timeline.stays.map((stay, index) => {
                const transit = index > 0 ? timeline.transits[index - 1] : undefined;
                return (
                  <li key={stay.id} className="space-y-3">
                    {transit !== undefined && (
                      <div className="flex items-center gap-2 pl-3 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {formatGap(transit.gapMs)} até o próximo ponto
                          {transit.flag === 'co_presence_conflict'
                            ? ' — conflito de presença'
                            : transit.flag === 'unconfirmed'
                              ? ' — trecho não confirmado'
                              : ''}
                          {transit.hasBlindGap ? ' · há leituras descartadas na janela' : ''}
                        </span>
                      </div>
                    )}

                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{nameOf(stay.cameraId)}</p>
                        <div className="flex items-center gap-2">
                          {stay.confidence === 'confirmed' ? (
                            <Badge variant="default">Confirmada</Badge>
                          ) : (
                            <Badge variant="secondary">Não confirmada</Badge>
                          )}
                          {stay.openAtEdge && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              Saída não observada
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {timeFmt.format(stay.startMs)} → {timeFmt.format(stay.endMs)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{describeStay(stay)}</p>
                      {stay.bestSimilarity !== null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Melhor semelhança medida: {(stay.bestSimilarity * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {excludedTotal > 0 && (
          <p className="text-xs text-muted-foreground">
            Fora da trajetória: {timeline.excluded.unverified} sem medição,{' '}
            {timeline.excluded.spoofSuspect} com suspeita de fraude e {timeline.excluded.unidentified} sem
            identificação. A trajetória acima pode ter lacunas.
          </p>
        )}

        {timeline.truncated && (
          <p className="text-xs text-warning">
            Há mais permanências do que o exibido. Estreite o período para ver a trajetória completa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
