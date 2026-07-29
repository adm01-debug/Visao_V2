import { useState } from 'react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMaintenanceConsole } from '@/hooks/useMaintenanceConsole';
import { MaintenanceAlertsCard } from '@/components/maintenance/MaintenanceAlertsCard';
import { RetentionOverviewCard } from '@/components/maintenance/RetentionOverviewCard';
import { ChronicSeriesCard } from '@/components/maintenance/ChronicSeriesCard';
import { EpisodeBridgeCard } from '@/components/maintenance/EpisodeBridgeCard';
import { CommandReliabilityCard } from '@/components/maintenance/CommandReliabilityCard';
import { DeviceSilenceCard } from '@/components/maintenance/DeviceSilenceCard';
import { AdmissionPurgeHistoryCard } from '@/components/maintenance/AdmissionPurgeHistoryCard';
import { useAdmissionPurgeHistory } from '@/hooks/useAdmissionPurgeHistory';
import { useAdmissionReconcile } from '@/hooks/useAdmissionReconcile';
import { useAdmissionOrphanTrend } from '@/hooks/useAdmissionOrphanTrend';
import { AdmissionOrphanTrendCard } from '@/components/maintenance/AdmissionOrphanTrendCard';
import { AdmissionReconcileCard } from '@/components/maintenance/AdmissionReconcileCard';
import { DispatchSuppressionCard } from '@/components/maintenance/DispatchSuppressionCard';
import { DispatchDeliverabilityCard } from '@/components/maintenance/DispatchDeliverabilityCard';
import { useDispatchSuppressions } from '@/hooks/useDispatchSuppressions';
import { useDispatchDeliverability } from '@/hooks/useDispatchDeliverability';

import { useCommandReliability } from '@/hooks/useCommandReliability';
import { useDeviceSilence } from '@/hooks/useDeviceSilence';
import { useEpisodeBridgeWatch } from '@/hooks/useEpisodeBridgeWatch';
import { useEpisodeReconciliation } from '@/hooks/useEpisodeReconciliation';
import { useChronicSeries, usePrimaryOrganization } from '@/hooks/useChronicSeries';

/**
 * Onda 136 — Console de manutenção.
 *
 * Última perna da cadeia detecção → despacho → escalonamento → reconhecimento.
 * Sem esta tela, `acknowledged_at` nunca era preenchido e todo alerta crítico
 * subia até o plantão mesmo já resolvido.
 */
export default function MaintenanceConsolePage() {
  const { alerts, retention, acknowledge, model } = useMaintenanceConsole();
  const { organizationId, isLoading: orgLoading } = usePrimaryOrganization();
  const chronic = useChronicSeries(organizationId);
  const bridge = useEpisodeBridgeWatch();
  const devices = useDeviceSilence();
  const reliability = useCommandReliability();
  const reconciliation = useEpisodeReconciliation(organizationId);
  const admissionPurge = useAdmissionPurgeHistory();
  const admissionReconcile = useAdmissionReconcile(admissionPurge.snapshot.lastValid);
  const orphanTrend = useAdmissionOrphanTrend();
  const suppressions = useDispatchSuppressions();
  const deliverability = useDispatchDeliverability();


  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleAcknowledge = (alertId: string) => {
    setPendingId(alertId);
    acknowledge.mutate(alertId, {
      onSuccess: () => {
        toast({
          title: 'Incidente reconhecido',
          description: 'O escalonamento foi congelado para este alerta.',
        });
      },
      onError: (error: unknown) => {
        toast({
          variant: 'destructive',
          title: 'Não foi possível reconhecer',
          description:
            error instanceof Error
              ? error.message
              : 'O banco recusou a operação. Confirme se seu perfil ainda é administrador.',
        });
      },
      onSettled: () => setPendingId(null),
    });
  };

  const loadError = alerts.error ?? retention.error;

  return (
    <PageContent className="container mx-auto p-4 md:p-6">
      <PageMeta
        title="Console de manutenção | VISÃO"
        description="Acompanhe incidentes das rotinas internas, reconheça alertas e supervisione o expurgo programado de dados."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wrench className="h-6 w-6 text-primary" aria-hidden="true" />
          Console de manutenção
        </h1>
        <p className="text-sm text-muted-foreground">
          Incidentes das rotinas internas e situação do expurgo programado de dados.
        </p>
      </header>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar</AlertTitle>
          <AlertDescription>
            {loadError instanceof Error ? loadError.message : 'Erro desconhecido.'}
          </AlertDescription>
        </Alert>
      )}

      <MaintenanceAlertsCard
        model={model}
        isLoading={alerts.isLoading}
        isAcknowledging={acknowledge.isPending}
        pendingId={pendingId}
        onAcknowledge={handleAcknowledge}
      />

      <ChronicSeriesCard
        board={chronic.board}
        isLoading={orgLoading || chronic.isLoading}
        onRefresh={chronic.refetch}
      />

      <EpisodeBridgeCard
        assessment={bridge.assessment}
        evaluatedAt={bridge.evaluatedAt}
        isLoading={bridge.isLoading}
        onRefresh={bridge.refetch}
        onReconcile={reconciliation.reconcile}
        isReconciling={reconciliation.isReconciling}
        canReconcile={reconciliation.canReconcile}
      />


      <DeviceSilenceCard
        verdicts={devices.verdicts}
        summary={devices.summary}
        evaluatedAt={devices.evaluatedAt}
        isLoading={devices.isLoading}
        onRefresh={devices.refetch}
      />

      <CommandReliabilityCard
        verdicts={reliability.verdicts}
        summary={reliability.summary}
        evaluatedAt={reliability.evaluatedAt}
        isLoading={reliability.isLoading}
        onRefresh={reliability.refetch}
      />

      <RetentionOverviewCard rows={retention.data ?? []} isLoading={retention.isLoading} />

      <AdmissionPurgeHistoryCard
        snapshot={admissionPurge.snapshot}
        isLoading={admissionPurge.isLoading}
        isError={admissionPurge.isError}
        onRefresh={admissionPurge.refetch}
      />

      <AdmissionReconcileCard
        snapshot={admissionReconcile.snapshot}
        isLoading={admissionReconcile.isLoading}
        isError={admissionReconcile.isError}
        sqlVerdict={admissionReconcile.sqlVerdict}
        onRefresh={admissionReconcile.refetch}
      />

      <AdmissionOrphanTrendCard
        assessment={orphanTrend.assessment}
        isLoading={orphanTrend.isLoading}
        isError={orphanTrend.isError}
        sqlVerdict={orphanTrend.sqlVerdict}
        onRefresh={orphanTrend.refetch}
      />

      <DispatchDeliverabilityCard
        verdict={deliverability.verdict}
        isLoading={deliverability.isLoading}
        isError={deliverability.isError}
        onRefresh={deliverability.refetch}
      />

      <DispatchSuppressionCard

        ledger={suppressions.ledger}
        isLoading={suppressions.isLoading}
        isError={suppressions.isError}
        onRefresh={suppressions.refetch}
      />

    </PageContent>
  );
}
