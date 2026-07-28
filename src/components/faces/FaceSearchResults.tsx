/**
 * Onda 197 — resultados da busca de faces.
 *
 * Cada linha carrega o veredito e o porquê. O rótulo vem da régua única; a
 * tela não reinventa a frase nem promove candidato a identificado.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScanFace, ShieldAlert, HelpCircle, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FaceSearchResult, FaceSearchVerdict } from '@/lib/faces/faceSearch';

const VERDICT_META: Record<
  FaceSearchVerdict,
  { label: string; className: string; Icon: typeof ScanFace }
> = {
  identified: { label: 'Identificado', className: 'border-success/40 text-success', Icon: UserCheck },
  candidate: { label: 'Candidato', className: 'border-warning/40 text-warning', Icon: ScanFace },
  unidentified: { label: 'Não identificado', className: 'border-border text-muted-foreground', Icon: UserX },
  spoof_suspect: { label: 'Suspeita de fraude', className: 'border-destructive/40 text-destructive', Icon: ShieldAlert },
  unverified: { label: 'Não conferido', className: 'border-border text-muted-foreground', Icon: HelpCircle },
};

interface FaceSearchResultsProps {
  results: FaceSearchResult[];
}

export function FaceSearchResults({ results }: FaceSearchResultsProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma leitura facial no recorte pedido.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {results.map((r) => {
        const meta = VERDICT_META[r.verdict];
        const { Icon } = meta;
        return (
          <li key={r.id}>
            <Card className={cn('h-full border-l-4', meta.className)}>
              <CardContent className="flex gap-3 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt={`Leitura facial em ${new Date(r.timestampMs).toLocaleString('pt-BR')}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                    {r.similarity !== null && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(r.similarity * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium">
                    {r.personName ?? (r.personId ? 'Cadastro vinculado' : 'Sem cadastro')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.timestampMs).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.rationale}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
