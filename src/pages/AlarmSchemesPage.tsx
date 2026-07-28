/**
 * Onda 216 — Tela de esquemas de alarme (`/esquemas-de-alarme`).
 *
 * Mostra o cadastro julgado pela régua da Onda 215 sobre os dados persistidos
 * na Onda 217: linha amarela + ícone para inconsistência, vermelha para
 * inoperante, e aviso de duplicidade IA/não-IA como achado do **conjunto**.
 */

import { BellRing, Copy } from 'lucide-react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlarmSchemeTable } from '@/components/alarms/AlarmSchemeTable';
import { useAlarmSchemes } from '@/hooks/useAlarmSchemes';

export default function AlarmSchemesPage() {
  const { entries, duplicates, counts, isLoading, error } = useAlarmSchemes();

  return (
    <PageContent className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Esquemas de alarme | VISÃO"
        description="Cadastro dos esquemas de alarme com diagnóstico de consistência, teto de canais e duplicidade IA."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BellRing className="h-6 w-6 text-primary" aria-hidden="true" />
          Esquemas de alarme
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastros julgados antes de qualquer disparo. Esquema com dispositivo removido não é
          apagado: fica em destaque até alguém corrigir.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os esquemas</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Consistentes', value: counts.ok, tone: 'text-success' },
          { label: 'Inconsistentes', value: counts.inconsistent, tone: 'text-warning' },
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

      <AlarmSchemeTable entries={entries} isLoading={isLoading} />
    </PageContent>
  );
}
