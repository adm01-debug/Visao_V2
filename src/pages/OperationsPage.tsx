import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageMeta } from '@/components/PageMeta';
import { Activity, Database, HardDrive, RefreshCw, ShieldAlert, CalendarClock } from 'lucide-react';
import { SlowQueriesCard } from '@/components/admin/SlowQueriesCard';
import { RetentionOverviewCard } from '@/components/admin/RetentionOverviewCard';
import { PreviewTelemetryCard } from '@/components/admin/PreviewTelemetryCard';
import { EdgeErrorsAuditCard } from '@/components/admin/EdgeErrorsAuditCard';
import { ConnectivityResolutionCard } from '@/components/admin/ConnectivityResolutionCard';
import { CronJobRunsCard } from '@/components/admin/CronJobRunsCard';
import { CronWatchdogRunsCard } from '@/components/admin/CronWatchdogRunsCard';
import { PartitionDrainCard } from '@/components/admin/PartitionDrainCard';
import { PartitionQuarantineCard } from '@/components/admin/PartitionQuarantineCard';
import { MaintenanceAlertsCard } from '@/components/admin/MaintenanceAlertsCard';
import { MaintenanceDispatchCard } from '@/components/admin/MaintenanceDispatchCard';
import { CameraClockSkewCard } from '@/components/admin/CameraClockSkewCard';
import { PartitionBacklogTrendCard } from '@/components/admin/PartitionBacklogTrendCard';
import { AgentHealingCard } from '@/components/admin/AgentHealingCard';
import { RootCauseCorrelationCard } from '@/components/admin/RootCauseCorrelationCard';
import { MaintenanceEscalationCard } from '@/components/admin/MaintenanceEscalationCard';
import { CronWatchdogEscalationCard } from '@/components/admin/CronWatchdogEscalationCard';

import { PreviewAlertStatusCard } from '@/components/admin/PreviewAlertStatusCard';
import { CameraHealthCard } from '@/components/admin/CameraHealthCard';
import { CameraVaultAuditCard } from '@/components/security/CameraVaultAuditCard';
import { EnvelopeEncryptionCard } from '@/components/security/EnvelopeEncryptionCard';
import { VaultAuditTimeline } from '@/components/security/VaultAuditTimeline';
import { DbHealthCard } from '@/components/admin/DbHealthCard';
import { TableBloatCard } from '@/components/admin/TableBloatCard';
import { SessionWatchdogCard } from '@/components/admin/SessionWatchdogCard';
import { UnusedIndexesCard } from '@/components/admin/UnusedIndexesCard';
import { MissingFkIndexesCard } from '@/components/admin/MissingFkIndexesCard';
import { TableCacheStatsCard } from '@/components/admin/TableCacheStatsCard';
import { DuplicateIndexesCard } from '@/components/admin/DuplicateIndexesCard';
import { TableSizeStatsCard } from '@/components/admin/TableSizeStatsCard';
import { StatsStalenessCard } from '@/components/admin/StatsStalenessCard';
import { SeqScanHotspotsCard } from '@/components/admin/SeqScanHotspotsCard';
import { BgWriterStatsCard } from '@/components/admin/BgWriterStatsCard';
import { ConnectionSaturationCard } from '@/components/admin/ConnectionSaturationCard';
import { MaintenanceProgressCard } from '@/components/admin/MaintenanceProgressCard';
import { TempFileOffendersCard } from '@/components/admin/TempFileOffendersCard';
import { TxidWraparoundCard } from '@/components/admin/TxidWraparoundCard';
import { ReplicationSlotsCard } from '@/components/admin/ReplicationSlotsCard';
import { SequenceExhaustionCard } from '@/components/admin/SequenceExhaustionCard';
import { TablesWithoutPkCard } from '@/components/admin/TablesWithoutPkCard';
import { NullableForeignKeysCard } from '@/components/admin/NullableForeignKeysCard';
import { AutovacuumOverridesCard } from '@/components/admin/AutovacuumOverridesCard';
import { UnvalidatedConstraintsCard } from '@/components/admin/UnvalidatedConstraintsCard';
import { DisabledTriggersCard } from '@/components/admin/DisabledTriggersCard';
import { PermissiveRlsCard } from '@/components/admin/PermissiveRlsCard';
import { DefinerSearchPathCard } from '@/components/admin/DefinerSearchPathCard';
import { MissingUpdatedAtTriggersCard } from '@/components/admin/MissingUpdatedAtTriggersCard';
import { InvalidIndexesCard } from '@/components/admin/InvalidIndexesCard';
import { StorageTierCostsCard } from '@/components/admin/StorageTierCostsCard';
import { ForgetUserMediaCard } from '@/components/admin/ForgetUserMediaCard';
import { LegalHoldManagerCard } from '@/components/admin/LegalHoldManagerCard';
import { GlacierRestoreMonitorCard } from '@/components/admin/GlacierRestoreMonitorCard';
import { GlacierStuckAlertsCard } from '@/components/admin/GlacierStuckAlertsCard';
import { StorageTieringSloCard } from '@/components/admin/StorageTieringSloCard';
import { PrometheusMetricsCard } from '@/components/admin/PrometheusMetricsCard';
import { BlockingChainsCard } from '@/components/admin/BlockingChainsCard';
import { RlsCoverageCard } from '@/components/admin/RlsCoverageCard';
import { AlertmanagerSilencesCard } from '@/components/admin/AlertmanagerSilencesCard';
import { assessCronFreshness } from '@/lib/cronSchedule';
import { PageContent } from '@/components/layout/MainLayout';

interface CacheStat { namespace: string; hits: number; misses: number; hit_ratio_pct: number | null }
interface CacheSize { total_rows: number; total_bytes: number; oldest: string | null; newest: string | null }
interface CronRun { jobid: number; runid: number; status: string; return_message: string | null; start_time: string; end_time: string | null }
interface CronHealth { jobname: string; schedule: string; active: boolean; failed_7d: number; last_run: string | null; last_status: string | null }
interface OperationalMetrics {
  cache_stats: CacheStat[];
  cache_size: CacheSize;
  cron_runs: CronRun[];
  partition_runs: CronRun[];
  cron_health: CronHealth[];
  generated_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function OperationsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['operational-metrics'],
    queryFn: async (): Promise<OperationalMetrics> => {
      const { data, error } = await supabase.rpc('get_operational_metrics');
      if (error) throw error;
      return data as unknown as OperationalMetrics;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <PageContent className="container mx-auto px-4 py-6">
      <PageMeta title="Operações — VISÃO" description="Métricas operacionais do sistema" />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operações</h1>
          <p className="text-sm text-muted-foreground">
            Cache InsightFace, retenção diária e saúde da infraestrutura de dados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          aria-label="Atualizar métricas"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Falha ao carregar métricas: {(error as Error)?.message ?? 'erro desconhecido'}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Database className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Cache — Hit ratio (24 h)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !data?.cache_stats?.length ? (
              <p className="text-sm text-muted-foreground">Sem tráfego nas últimas 24 h.</p>
            ) : (
              <ul className="space-y-2">
                {data.cache_stats.map((s) => (
                  <li key={s.namespace} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-foreground">{s.namespace}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {s.hits}/{s.hits + s.misses}
                      </span>
                      <Badge variant={((s.hit_ratio_pct ?? 0) >= 70) ? 'default' : 'secondary'}>
                        {(s.hit_ratio_pct ?? 0).toFixed(1)}%
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Cache — Tamanho</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !data?.cache_size ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Linhas</dt>
                  <dd className="font-semibold text-foreground">{data.cache_size.total_rows.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold text-foreground">{formatBytes(data.cache_size.total_bytes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mais antigo</dt>
                  <dd className="text-xs text-foreground">
                    {data.cache_size.oldest ? new Date(data.cache_size.oldest).toLocaleString('pt-BR') : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mais recente</dt>
                  <dd className="text-xs text-foreground">
                    {data.cache_size.newest ? new Date(data.cache_size.newest).toLocaleString('pt-BR') : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Retenção diária — últimas 10 execuções</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !data?.cron_runs?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma execução registrada ainda. O job roda às 03:30 UTC diariamente.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4">Início</th>
                      <th className="py-2 pr-4">Duração</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cron_runs.map((r) => {
                      const dur = r.end_time
                        ? `${Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 100) / 10}s`
                        : '—';
                      return (
                        <tr key={r.runid} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-xs">{new Date(r.start_time).toLocaleString('pt-BR')}</td>
                          <td className="py-2 pr-4">{dur}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={r.status === 'succeeded' ? 'default' : 'destructive'}>{r.status}</Badge>
                          </td>
                          <td className="py-2 text-xs text-muted-foreground truncate max-w-xs">
                            {r.return_message ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Saúde dos jobs automatizados (7 d)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !data?.cron_health?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum job registrado.</p>
            ) : (
              <ul className="space-y-3">
                {data.cron_health.map((h) => {
                  const fresh = assessCronFreshness(h.schedule, h.last_run);
                  const stale = fresh.status === 'stale';
                  const never = fresh.status === 'never';
                  return (
                    <li key={h.jobname} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-foreground truncate">{h.jobname}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.schedule} · última: {h.last_run ? new Date(h.last_run).toLocaleString('pt-BR') : 'nunca'} · próxima: {fresh.nextRunLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!h.active && <Badge variant="secondary">inativo</Badge>}
                        {never && <Badge variant="secondary">sem execução</Badge>}
                        {stale && <Badge variant="destructive">atrasado</Badge>}
                        <Badge variant={h.failed_7d === 0 ? 'default' : 'destructive'}>
                          {h.failed_7d} falha{h.failed_7d === 1 ? '' : 's'}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Partições mensais — últimas execuções</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !data?.partition_runs?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma execução registrada. O job roda dia 1 às 02:00 UTC.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.partition_runs.map((r) => (
                  <li key={r.runid} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                    <span className="font-mono text-xs text-foreground">
                      {new Date(r.start_time).toLocaleString('pt-BR')}
                    </span>
                    <Badge variant={r.status === 'succeeded' ? 'default' : 'destructive'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <CameraVaultAuditCard />
      </section>

      <section>
        <EnvelopeEncryptionCard />
      </section>

      <section>
        <VaultAuditTimeline />
      </section>

      <section>
        <CameraHealthCard />
      </section>

      <section>
        <SlowQueriesCard limit={20} />
      </section>

      <section>
        <RetentionOverviewCard />
      </section>

      <section>
        <PreviewTelemetryCard defaultWindowHours={24} />
      </section>

      <section>
        <PreviewAlertStatusCard />
      </section>

      <section>
        <EdgeErrorsAuditCard />
      </section>

      <section>
        <ConnectivityResolutionCard windowHours={168} />
      </section>

      <section>
        <CronJobRunsCard />
      </section>

      <section>
        <CronWatchdogRunsCard />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PartitionDrainCard />
        <PartitionQuarantineCard />

        <PartitionBacklogTrendCard />
        <MaintenanceAlertsCard />
        <MaintenanceDispatchCard />
        <CameraClockSkewCard />
        <AgentHealingCard />
        <RootCauseCorrelationCard />

        <MaintenanceEscalationCard />

      </section>



      <section>
        <CronWatchdogEscalationCard />
      </section>





      <section>
        <DbHealthCard />
      </section>

      <section>
        <TableBloatCard />
      </section>

      <section>
        <SessionWatchdogCard />
      </section>

      <section>
        <UnusedIndexesCard />
      </section>

      <section>
        <MissingFkIndexesCard />
      </section>

      <section>
        <TableCacheStatsCard />
      </section>

      <section>
        <DuplicateIndexesCard />
      </section>

      <section>
        <TableSizeStatsCard />
      </section>

      <section>
        <StatsStalenessCard />
      </section>

      <section>
        <SeqScanHotspotsCard />
      </section>

      <section>
        <BgWriterStatsCard />
      </section>

      <section>
        <ConnectionSaturationCard />
      </section>

      <section>
        <MaintenanceProgressCard />
      </section>

      <section>
        <TempFileOffendersCard />
      </section>

      <section>
        <TxidWraparoundCard />
      </section>

      <section>
        <ReplicationSlotsCard />
      </section>

      <section>
        <SequenceExhaustionCard />
      </section>

      <section>
        <TablesWithoutPkCard />
      </section>

      <section>
        <NullableForeignKeysCard />
      </section>

      <section>
        <AutovacuumOverridesCard />
      </section>

      <section>
        <UnvalidatedConstraintsCard />
      </section>

      <section>
        <DisabledTriggersCard />
      </section>

      <section>
        <PermissiveRlsCard />
      </section>

      <section>
        <DefinerSearchPathCard />
      </section>

      <section>
        <MissingUpdatedAtTriggersCard />
      </section>

      <section>
        <InvalidIndexesCard />
      </section>

      <section>
        <StorageTierCostsCard />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ForgetUserMediaCard />
        <LegalHoldManagerCard />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <GlacierRestoreMonitorCard />
        <GlacierStuckAlertsCard />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <StorageTieringSloCard />
        <PrometheusMetricsCard />
      </section>





      <section>
        <BlockingChainsCard />
      </section>

      <section>
        <RlsCoverageCard />
      </section>

      <section>
        <AlertmanagerSilencesCard />
      </section>









      {data?.generated_at && (
        <p className="text-xs text-muted-foreground">
          Gerado em {new Date(data.generated_at).toLocaleString('pt-BR')} · auto-refresh 30 s
        </p>
      )}
    </PageContent>
  );
}
