/**
 * Onda 221 — Editor da agenda semanal (S8).
 *
 * O editor mostra o que o sistema *entendeu*, não o que foi digitado: dia sem
 * janela é rotulado como coberto por 24×7 quando a agenda inteira está vazia,
 * e como "sem cobertura" quando outros dias têm janela. Confundir esses dois
 * casos é o caminho mais curto para um alarme que nunca toca.
 */

import { Moon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  MAX_PERIODS_PER_DAY,
  WEEKDAY_LABELS,
  diagnoseScheduleForm,
  newPeriodRow,
  type ScheduleFormState,
  type SchedulePeriodRow,
} from '@/lib/alarms/alarmScheduleForm';

interface AlarmScheduleEditorProps {
  value: ScheduleFormState;
  onChange: (next: ScheduleFormState) => void;
}

export function AlarmScheduleEditor({ value, onChange }: AlarmScheduleEditorProps) {
  const diagnosis = diagnoseScheduleForm(value);

  const patchDay = (dayIndex: number, rows: readonly SchedulePeriodRow[]) =>
    onChange(value.map((day, i) => (i === dayIndex ? rows : day)));

  const addRow = (dayIndex: number) =>
    patchDay(dayIndex, [...(value[dayIndex] ?? []), newPeriodRow()]);

  const removeRow = (dayIndex: number, rowId: string) =>
    patchDay(dayIndex, (value[dayIndex] ?? []).filter((r) => r.id !== rowId));

  const patchRow = (dayIndex: number, rowId: string, partial: Partial<SchedulePeriodRow>) =>
    patchDay(
      dayIndex,
      (value[dayIndex] ?? []).map((r) => (r.id === rowId ? { ...r, ...partial } : r)),
    );

  const issuesFor = (rowId: string) => diagnosis.issues.filter((i) => i.rowIds.includes(rowId));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Agenda semanal</Label>
        <span className="text-xs text-muted-foreground">
          {diagnosis.alwaysOn
            ? 'Sem janelas: armado 24×7'
            : `${diagnosis.totalPeriods} período(s) · máx. ${MAX_PERIODS_PER_DAY}/dia`}
        </span>
      </div>

      <div className="space-y-2">
        {WEEKDAY_LABELS.map((label, dayIndex) => {
          const rows = value[dayIndex] ?? [];
          const excess = rows.length > MAX_PERIODS_PER_DAY;
          return (
            <div
              key={label}
              className={cn(
                'rounded-md border border-border p-3',
                excess && 'border-destructive/60 bg-destructive/5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {rows.length === 0
                      ? diagnosis.alwaysOn
                        ? 'Coberto por 24×7'
                        : 'Sem cobertura'
                      : `${rows.length} período(s)`}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addRow(dayIndex)}
                    aria-label={`Adicionar período em ${label}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {rows.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {rows.map((row, position) => {
                    const rowIssues = issuesFor(row.id);
                    const crossMidnight = diagnosis.crossMidnightRowIds.includes(row.id);
                    return (
                      <li key={row.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            aria-label={`${label} — início do período ${position + 1}`}
                            value={row.start}
                            onChange={(e) => patchRow(dayIndex, row.id, { start: e.target.value })}
                            className={cn('w-32', rowIssues.length > 0 && 'border-destructive')}
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input
                            type="time"
                            aria-label={`${label} — término do período ${position + 1}`}
                            value={row.end}
                            onChange={(e) => patchRow(dayIndex, row.id, { end: e.target.value })}
                            className={cn('w-32', rowIssues.length > 0 && 'border-destructive')}
                          />
                          {crossMidnight && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                              cruza a meia-noite
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover período ${position + 1} de ${label}`}
                            onClick={() => removeRow(dayIndex, row.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        {rowIssues.map((issue) => (
                          <p key={issue.code} className="text-xs text-destructive">
                            {issue.message}
                          </p>
                        ))}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {diagnosis.alwaysOn && (
        <Alert>
          <AlertTitle>Armado 24×7</AlertTitle>
          <AlertDescription>
            Nenhuma janela declarada significa vigilância contínua — não é ausência de
            configuração.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

export default AlarmScheduleEditor;
