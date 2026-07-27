/**
 * Onda 159 — cartão do registro probatório.
 *
 * A tabela mostra os DOIS eixos lado a lado (qualidade do material na selagem
 * e integridade da corrente agora). Nunca fundir: ver `exportRegistryView.ts`.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { EvidenceExportView, Tone } from '@/lib/evidence/exportRegistryView';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  positive: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

export interface EvidenceExportsTableProps {
  readonly views: readonly EvidenceExportView[];
  readonly isLoading: boolean;
  readonly onVerify: (exportId: string) => void;
}

function formatSealedAt(ms: number | null): string {
  if (ms === null) return 'data inválida';
  return new Date(ms).toLocaleString('pt-BR');
}

export function EvidenceExportsTable({ views, isLoading, onVerify }: EvidenceExportsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Exportações seladas
        </CardTitle>
        <CardDescription>
          O veredito é a qualidade do material no momento da selagem. A integridade é o recálculo
          da corrente feito agora, no servidor. São perguntas diferentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : views.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma exportação probatória selada até agora.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Selada em</TableHead>
                  <TableHead>Selo</TableHead>
                  <TableHead>Veredito</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Integridade</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map((view) => (
                  <TableRow key={view.id} className={cn(view.actionable && 'bg-destructive/5')}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatSealedAt(view.sealedAtMs)}
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {view.rootHashShort}…
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TONE_CLASS[view.verdict.tone]}>
                        {view.verdict.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {view.coveragePercent.toFixed(1)}%
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({view.segmentCount} trecho{view.segmentCount === 1 ? '' : 's'}
                        {view.gapCount > 0 ? `, ${view.gapCount} lacuna${view.gapCount === 1 ? '' : 's'}` : ''})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TONE_CLASS[view.integrity.tone]}>
                        {view.integrity.label}
                      </Badge>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {view.integrity.detail}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={view.integrity.state === 'checking'}
                        onClick={() => onVerify(view.exportId)}
                      >
                        <RefreshCw
                          className={cn('mr-1 h-3.5 w-3.5', view.integrity.state === 'checking' && 'animate-spin')}
                          aria-hidden="true"
                        />
                        Conferir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
