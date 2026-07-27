import { useState } from 'react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMaintenanceConsole } from '@/hooks/useMaintenanceConsole';
import { MaintenanceAlertsCard } from '@/components/maintenance/MaintenanceAlertsCard';
import { RetentionOverviewCard } from '@/components/maintenance/RetentionOverviewCard';

/**
 * Onda 136 — Console de manutenção.
 *
 * Última perna da cadeia detecção → despacho → escalonamento → reconhecimento.
 * Sem esta tela, `acknowledged_at` nunca era preenchido e todo alerta crítico
 * subia até o plantão mesmo já resolvido.
 */
export default function MaintenanceConsolePage() {
  const { alerts, retention, acknowledge, model } = useMaintenanceConsole();
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

      <RetentionOverviewCard rows={retention.data ?? []} isLoading={retention.isLoading} />
    </PageContent>
  );
}
