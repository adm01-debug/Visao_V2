/**
 * Onda 204 — faixa de eventos de face (paridade SIM Next, áreas 5, 6 e 8 da
 * seção *Busca por Faces*).
 *
 * A cor de cada divisão sai da régua única (`faceTimeline.ts`): pior leitura
 * manda, balde vazio é "sem registro" e nunca "sem ninguém". Esta tela apenas
 * pinta e permite recortar — não decide nada.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FaceSearchResult } from '@/lib/faces/faceSearch';
import {
  availableZoomSteps,
  buildFaceTimeline,
  describeTimelineRejection,
  describeZoomStep,
  selectBucketResults,
  type BucketTone,
  type FaceTimelineBucket,
} from '@/lib/faces/faceTimeline';
import { assessReadingProvenance } from '@/lib/provenance/readingProvenance';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';

const TONE_CLASS: Record<BucketTone, string> = {
  idle: 'bg-muted',
  unidentified: 'bg-muted-foreground/40',
  unverified: 'bg-muted-foreground/60',
  candidate: 'bg-warning',
  identified: 'bg-success',
  spoof_suspect: 'bg-destructive',
};

const TONE_LABEL: Record<BucketTone, string> = {
  idle: 'Sem registro de leitura',
  unidentified: 'Não identificado',
  unverified: 'Não conferido',
  candidate: 'Candidato',
  identified: 'Identificado',
  spoof_suspect: 'Suspeita de fraude',
};

const fmt = (ms: number) =>
  new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export interface FaceEventTimelineProps {
  results: FaceSearchResult[];
  fromMs: number;
  toMs: number;
  /** Resultado cortado no teto de linhas: densidade deixa de ser conclusiva. */
  partial?: boolean;
}

export function FaceEventTimeline({ results, fromMs, toMs, partial = false }: FaceEventTimelineProps) {
  const [stepMs, setStepMs] = useState<number | null>(null);
  const [selected, setSelected] = useState<FaceTimelineBucket | null>(null);

  const steps = useMemo(() => availableZoomSteps(fromMs, toMs), [fromMs, toMs]);
  const outcome = useMemo(
    () => buildFaceTimeline(results, { fromMs, toMs, stepMs, partial }),
    [results, fromMs, toMs, stepMs, partial],
  );

  const selectedResults = useMemo(
    () => (selected ? selectBucketResults(results, selected) : []),
    [results, selected],
  );

  /**
   * Onda 205 — procedência das leituras da divisão selecionada. A busca por
   * faces é produzida pelo modelo determinístico do VISÃO; a fonte
   * independente é a câmera. Câmera ausente vira `unknown` (P5): sem saber
   * quem leu, a leitura não pode corroborar nada.
   */
  const provenance = useMemo(
    () =>
      assessReadingProvenance(
        selectedResults.map((r) => ({
          id: r.id,
          sourceId: r.cameraId ?? `desconhecida:${r.id}`,
          stages: r.cameraId ? (['model'] as const) : ([] as const),
          confidence: r.similarity ?? undefined,
        })),
      ),
    [selectedResults],
  );

  if (!outcome.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Linha do tempo não montada</AlertTitle>
        <AlertDescription>{describeTimelineRejection(outcome.reason)}</AlertDescription>
      </Alert>
    );
  }

  const { timeline } = outcome;

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            Linha do tempo das leituras
          </CardTitle>
          <CardDescription>
            {timeline.totalCount} leitura(s) entre {fmt(timeline.fromMs)} e {fmt(timeline.toMs)} —
            divisão de {describeZoomStep(timeline.stepMs)}. A cor de cada divisão é a da leitura
            mais grave nela.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1">
          {steps.map((step) => (
            <Button
              key={step}
              type="button"
              size="sm"
              variant={timeline.stepMs === step ? 'default' : 'outline'}
              onClick={() => {
                setStepMs(step);
                setSelected(null);
              }}
            >
              {describeZoomStep(step)}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {timeline.partial && (
          <Alert>
            <AlertTitle>Densidade parcial</AlertTitle>
            <AlertDescription>
              O resultado foi truncado. A faixa mostra apenas o que coube na página — não leia os
              picos como volume real do período.
            </AlertDescription>
          </Alert>
        )}

        <div
          className="flex h-24 items-end gap-px overflow-hidden rounded-md border border-border bg-background p-1"
          role="list"
          aria-label="Divisões da linha do tempo de leituras faciais"
        >
          {timeline.buckets.map((bucket) => {
            const height =
              bucket.count === 0 || timeline.peakCount === 0
                ? 6
                : Math.max(10, Math.round((bucket.count / timeline.peakCount) * 100));
            const isSelected = selected?.index === bucket.index;
            return (
              <button
                key={bucket.index}
                type="button"
                role="listitem"
                aria-label={`${fmt(bucket.startMs)} — ${bucket.count} leitura(s), ${TONE_LABEL[bucket.tone]}`}
                title={`${fmt(bucket.startMs)}\n${bucket.count} leitura(s) · ${TONE_LABEL[bucket.tone]}`}
                onClick={() => setSelected(bucket.count > 0 ? bucket : null)}
                className={cn(
                  'min-w-[2px] flex-1 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  TONE_CLASS[bucket.tone],
                  isSelected && 'ring-2 ring-primary',
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(Object.keys(TONE_LABEL) as BucketTone[]).map((tone) => (
            <li key={tone} className="flex items-center gap-1.5">
              <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', TONE_CLASS[tone])} />
              {TONE_LABEL[tone]}
            </li>
          ))}
        </ul>

        {selected !== null && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {fmt(selected.startMs)} → {fmt(selected.endMs)}
              </p>
              <Badge variant="outline">{selected.count} leitura(s)</Badge>
            </div>
            <ProvenanceBadge assessment={provenance} showCaveats />
            <ul className="space-y-1 text-xs text-muted-foreground">
              {selectedResults.slice(0, 12).map((r) => (
                <li key={r.id} className="flex flex-wrap gap-2">
                  <span className="font-mono">{fmt(r.timestampMs)}</span>
                  <span>{r.personName ?? 'Sem cadastro vinculado'}</span>
                  <span className="italic">{r.rationale}</span>
                </li>
              ))}
            </ul>
            {selectedResults.length > 12 && (
              <p className="text-xs text-muted-foreground">
                +{selectedResults.length - 12} leitura(s) nesta divisão. Aumente o zoom para separá-las.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
