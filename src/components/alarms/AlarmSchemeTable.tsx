/**
 * Onda 216 — Tabela de esquemas de alarme.
 *
 * Paridade com o SIM Next: esquema com dispositivo removido **não some** — ele
 * fica destacado em amarelo (inconsistente) ou vermelho (inoperante) com ícone
 * próprio, até alguém corrigir. Desabilitado é eixo separado do diagnóstico.
 */

import { AlertTriangle, CircleSlash, CheckCircle2, PencilLine, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  eventLabel,
  schemeHealthLabel,
  schemeSummary,
  type SchemeHealth,
} from '@/lib/alarms/alarmScheme';
import { browserTzOffsetMinutes, evaluateArmedNow } from '@/lib/alarms/armedNow';
import { ArmedNowBadge } from '@/components/alarms/ArmedNowBadge';
import { useMinuteClock } from '@/hooks/useMinuteClock';
import type { ArmedVerdict } from '@/lib/alarms/armedNow';
import type { AlarmSchemeEntry } from '@/hooks/useAlarmSchemes';

interface AlarmSchemeTableProps {
  entries: readonly AlarmSchemeEntry[];
  isLoading?: boolean;
  onEdit?: (entry: AlarmSchemeEntry) => void;
  /**
   * Onda 224 — vereditos já calculados pelo painel. Passar o mapa garante que
   * contador e tabela leiam a MESMA avaliação (lei R1); sem ele, a tabela
   * avalia por conta própria e pode cair do outro lado da virada do minuto.
   */
  verdicts?: ReadonlyMap<string, ArmedVerdict>;
  /** Mensagem do estado vazio — distingue "sem cadastro" de "filtro sem resultado" (R5). */
  emptyMessage?: string;
}

/** Linha amarela para inconsistente, vermelha para inoperante (S9: independe de `enabled`). */
const ROW_TONE: Record<SchemeHealth, string> = {
  ok: '',
  inconsistent: 'bg-warning/10 hover:bg-warning/15 border-l-4 border-l-warning',
  inoperative: 'bg-destructive/10 hover:bg-destructive/15 border-l-4 border-l-destructive',
};

function HealthIcon({ health }: { health: SchemeHealth }) {
  if (health === 'inoperative') {
    return <CircleSlash className="h-4 w-4 text-destructive" aria-hidden="true" />;
  }
  if (health === 'inconsistent') {
    return <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />;
}

export function AlarmSchemeTable({
  entries,
  isLoading = false,
  onEdit,
  verdicts,
  emptyMessage = 'Nenhum esquema de alarme cadastrado.',
}: AlarmSchemeTableProps) {
  // Onda 223 — um relógio de minuto para toda a tabela (linhas viram juntas).
  const now = useMinuteClock();
  const tzOffset = browserTzOffsetMinutes(now);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Esquemas cadastrados</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">Esquema</TableHead>
                <TableHead className="whitespace-nowrap">Agora</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead className="whitespace-nowrap">Canais</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando esquemas…
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}

              {entries.map((entry) => {
                const { row, diagnosis } = entry;
                const armed =
                  verdicts?.get(row.id) ??
                  evaluateArmedNow(
                    {
                      enabled: diagnosis.enabled,
                      health: diagnosis.health,
                      schedule: entry.draft.schedule,
                    },
                    now,
                    tzOffset
                  );
                return (
                  <TableRow key={row.id} className={cn(ROW_TONE[diagnosis.health])}>
                    <TableCell className="align-top">
                      <div className="flex items-start gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="mt-0.5 shrink-0">
                              <HealthIcon health={diagnosis.health} />
                              <span className="sr-only">{schemeHealthLabel(diagnosis.health)}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{schemeSummary(diagnosis)}</TooltipContent>
                        </Tooltip>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name || 'Sem nome'}</p>
                          {diagnosis.issues.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {diagnosis.issues.map((issue) => (
                                <li
                                  key={issue.code}
                                  className={cn(
                                    'text-xs',
                                    issue.severity === 'blocking'
                                      ? 'text-destructive'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {issue.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <ArmedNowBadge verdict={armed} />
                    </TableCell>

                    <TableCell className="align-top text-sm">
                      {diagnosis.eventType ? eventLabel(diagnosis.eventType) : 'Tipo desconhecido'}
                    </TableCell>

                    <TableCell className="align-top whitespace-nowrap text-sm tabular-nums">
                      {diagnosis.budget.total}/{diagnosis.budget.limit}
                      {diagnosis.budget.refusedActionIds.length > 0 && (
                        <span className="ml-1 text-xs text-warning">
                          ({diagnosis.budget.refusedActionIds.length} recusada
                          {diagnosis.budget.refusedActionIds.length > 1 ? 's' : ''})
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={
                            diagnosis.health === 'inoperative'
                              ? 'destructive'
                              : diagnosis.health === 'inconsistent'
                                ? 'outline'
                                : 'secondary'
                          }
                        >
                          {schemeHealthLabel(diagnosis.health)}
                        </Badge>
                        {!diagnosis.enabled && (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <PowerOff className="h-3 w-3" aria-hidden="true" />
                            Desabilitado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${row.name || 'esquema'}`}
                          onClick={() => onEdit(entry)}
                        >
                          <PencilLine className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlarmSchemeTable;
