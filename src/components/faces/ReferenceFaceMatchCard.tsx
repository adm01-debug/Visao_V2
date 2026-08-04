/**
 * Onda 198 — comparação por imagem de referência (1:N).
 *
 * O operador chega com uma foto. A tela extrai o vetor, compara com a galeria
 * e mostra o veredito da régua única — inclusive quando o veredito é
 * "não deu para medir".
 */

import { useCallback, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ImageUp, Loader2, ScanFace } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReferenceFaceMatch } from '@/hooks/useReferenceFaceMatch';
import {
  describeReferenceRejection,
  MAX_MATCH_THRESHOLD,
  MIN_MATCH_THRESHOLD,
  type ReferenceMatchVerdict,
} from '@/lib/faces/referenceMatch';

const VERDICT_META: Record<ReferenceMatchVerdict, { label: string; className: string }> = {
  identified: { label: 'Identificado', className: 'border-success/40 text-success' },
  candidate: { label: 'Candidato', className: 'border-warning/40 text-warning' },
  ambiguous: { label: 'Empate', className: 'border-warning/40 text-warning' },
  unidentified: { label: 'Não identificado', className: 'border-border text-muted-foreground' },
  spoof_suspect: {
    label: 'Suspeita de fraude',
    className: 'border-destructive/40 text-destructive',
  },
  incomparable: { label: 'Não comparado', className: 'border-border text-muted-foreground' },
};

export function ReferenceFaceMatchCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const {
    outcome,
    rejection,
    error,
    isEncoding,
    isGalleryLoading,
    galleryCount,
    threshold,
    setThreshold,
    compare,
    reset,
  } = useReferenceFaceMatch();

  const onPick = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null;
        if (dataUrl === null) return;
        setPreview(dataUrl);
        void compare(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [compare]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanFace className="h-5 w-5 text-primary" aria-hidden="true" />
          Comparar por imagem de referência
        </CardTitle>
        <CardDescription>
          Envie uma foto e compare com os {galleryCount} cadastros faciais. Semelhança é evidência
          graduada — nunca prova automática.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-3">
            {preview !== null && (
              <img
                src={preview}
                alt="Imagem de referência enviada"
                className="h-16 w-16 rounded-md border object-cover"
              />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPick(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isEncoding || isGalleryLoading}
              onClick={() => inputRef.current?.click()}
            >
              {isEncoding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImageUp className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Escolher imagem
            </Button>
            {(outcome !== null || rejection !== null) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  reset();
                }}
              >
                Limpar
              </Button>
            )}
          </div>

          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="ref-threshold">
              Corte de semelhança: {Math.round(threshold * 100)}%
            </Label>
            <Slider
              id="ref-threshold"
              min={MIN_MATCH_THRESHOLD * 100}
              max={MAX_MATCH_THRESHOLD * 100}
              step={1}
              value={[Math.round(threshold * 100)]}
              onValueChange={([v]) => setThreshold((v ?? 50) / 100)}
            />
          </div>
        </div>

        {rejection !== null && (
          <Alert variant="destructive">
            <AlertTitle>Comparação não realizada</AlertTitle>
            <AlertDescription>{describeReferenceRejection(rejection)}</AlertDescription>
          </Alert>
        )}

        {error !== null && (
          <Alert variant="destructive">
            <AlertTitle>Falha ao extrair o rosto</AlertTitle>
            <AlertDescription>
              A comparação não chegou ao fim — o resultado é indeterminado, não negativo.
            </AlertDescription>
          </Alert>
        )}

        {outcome !== null && outcome.incomparableCount > 0 && (
          <Alert>
            <AlertTitle>Galeria parcialmente comparável</AlertTitle>
            <AlertDescription>
              {outcome.incomparableCount} cadastro(s) estão em outro modelo e não foram comparados.
              Ausência de resultado não significa ausência da pessoa.
            </AlertDescription>
          </Alert>
        )}

        {outcome !== null && (
          <ul className="space-y-2">
            {outcome.matches.map((m) => {
              const meta = VERDICT_META[m.verdict];
              return (
                <li
                  key={m.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md border-l-4 border bg-card p-3',
                    meta.className
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.personName ?? 'Cadastro sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.rationale}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {m.similarity === null ? '—' : `${(m.similarity * 100).toFixed(1)}%`}
                    </span>
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
