/**
 * Onda 216 — Tela de esquemas de alarme (`/esquemas-de-alarme`).
 *
 * Mostra o cadastro julgado pela régua da Onda 215 sobre os dados persistidos
 * na Onda 217: linha amarela + ícone para inconsistência, vermelha para
 * inoperante, e aviso de duplicidade IA/não-IA como achado do **conjunto**.
 */

import { useMemo, useState } from 'react';
import { BellRing, Copy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlarmSchemeTable } from '@/components/alarms/AlarmSchemeTable';
import { AlarmSchemeFormDialog } from '@/components/alarms/AlarmSchemeFormDialog';
import { draftToForm, type AlarmSchemeFormState } from '@/lib/alarms/alarmSchemeForm';
import { ArmedFilterBar } from '@/components/alarms/ArmedFilterBar';
import { browserTzOffsetMinutes } from '@/lib/alarms/armedNow';
import {
  buildArmedRoster,
  countForFilter,
  filterLabel,
  filterRoster,
  type ArmedFilter,
} from '@/lib/alarms/armedRoster';
import { useMinuteClock } from '@/hooks/useMinuteClock';
import { useAlarmSchemes } from '@/hooks/useAlarmSchemes';
import { useAdmissionCoverage } from '@/hooks/useAdmissionCoverage';
import { AdmissionCoverageCard } from '@/components/alarms/AdmissionCoverageCard';

export default function AlarmSchemesPage() {
  const { entries, duplicates, counts, isLoading, error } = useAlarmSchemes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AlarmSchemeFormState | null>(null);
  const [filter, setFilter] = useState<ArmedFilter>('all');

  // Onda 224 — uma única avaliação por tique alimenta contador, filtro e tabela.
  const now = useMinuteClock();
  const roster = useMemo(
    () =>
      buildArmedRoster(
        entries,
        (entry) => ({
          id: entry.row.id,
          input: {
            enabled: entry.diagnosis.enabled,
            health: entry.diagnosis.health,
            schedule: entry.draft.schedule,
          },
        }),
        now,
        browserTzOffsetMinutes(now),
      ),
    [entries, now],
  );

  const verdicts = useMemo(
    () => new Map(roster.entries.map((e) => [e.id, e.verdict] as const)),
    [roster],
  );
  const sizes = useMemo(
    () => ({
      all: roster.counts.total,
      armed: countForFilter(roster.entries, 'armed'),
      attention: countForFilter(roster.entries, 'attention'),
      off: countForFilter(roster.entries, 'off'),
    }),
    [roster],
  );
  const visible = useMemo(
    () => filterRoster(roster.entries, filter).map((e) => e.item),
    [roster, filter],
  );

  // Onda 229 — inventário esperado = origens declaradas nos esquemas. Origem
  // esperada sem nenhum evento é buraco cego, não silêncio saudável.
  const expectedSourceIds = useMemo(
    () => [...new Set(entries.flatMap((e) => e.draft.sourceIds ?? []))].sort(),
    [entries],
  );
  const coverage = useAdmissionCoverage({ hours: 24, expectedSourceIds });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <PageContent className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Esquemas de alarme | VISÃO"
        description="Cadastro dos esquemas de alarme com diagnóstico de consistência, teto de canais e duplicidade IA."
      />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BellRing className="h-6 w-6 text-primary" aria-hidden="true" />
          Esquemas de alarme
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastros julgados antes de qualquer disparo. Esquema com dispositivo removido não é
          apagado: fica em destaque até alguém corrigir.
        </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Novo esquema
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os esquemas</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Armados agora', value: roster.counts.armed, tone: 'text-success' },
          { label: 'Inconsistentes', value: counts.inconsistent, tone: 'text-warning' },
          { label: 'Fora da janela', value: roster.counts.idle, tone: 'text-muted-foreground' },
          { label: 'Inoperantes', value: counts.inoperative, tone: 'text-destructive' },
          { label: 'Desabilitados', value: counts.disabled, tone: 'text-muted-foreground' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${item.tone}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {duplicates.length > 0 && (
        <Alert className="border-warning/40 bg-warning/10">
          <Copy className="h-4 w-4 text-warning" aria-hidden="true" />
          <AlertTitle>Duplicidade entre esquemas com e sem IA</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
              {duplicates.map((dup) => (
                <li key={`${dup.channelId}:${dup.aiSchemeId}:${dup.plainSchemeId}`}>
                  Canal <span className="font-medium">{dup.channelId}</span>: {dup.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <AdmissionCoverageCard
        summary={coverage.summary}
        report={coverage.report}
        windowStartAt={coverage.windowStartAt}
        isLoading={coverage.isLoading}
      />

      <ArmedFilterBar value={filter} onChange={setFilter} counts={roster.counts} sizes={sizes} />

      <AlarmSchemeTable
        entries={visible}
        verdicts={verdicts}
        emptyMessage={
          filter === 'all'
            ? 'Nenhum esquema de alarme cadastrado.'
            : `Nenhum esquema em "${filterLabel(filter)}" neste momento.`
        }
        isLoading={isLoading}
        onEdit={(entry) => {
          setEditing(draftToForm(entry.draft));
          setDialogOpen(true);
        }}
      />

      <AlarmSchemeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} />
    </PageContent>
  );
}
