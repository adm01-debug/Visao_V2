/**
 * VISÃO - Página de Segurança (Modularizada)
 */
import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Download, FileText, Lock, Users, Smartphone } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  SecurityStatsCards,
  AuditLogTable,
  AccessEventsList,
  SecurityListsPanel,
  SecurityMFAPanel,
  type SecurityPerson,
  type SecurityStats,
  type ListType,
} from '@/components/security';
import { PageContent } from '@/components/layout/MainLayout';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useAccessEvents } from '@/hooks/useAccessEvents';

export function SecurityPage() {
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(true);
  const [securityPersons, setSecurityPersons] = useState<SecurityPerson[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);

  const { logs, refetch: refetchLogs } = useAuditLogs();
  const { events: accessEvents, refetch: refetchAccess } = useAccessEvents();

  const loadData = useCallback(async () => {
    try {
      await Promise.all([refetchLogs(), refetchAccess()]);

      const { data: persons } = await supabase
        .from('registered_persons')
        .select('*')
        .in('list_type', ['whitelist', 'blacklist', 'watchlist']);
      const mapped = (persons || []).map((p) => ({
        id: p.id,
        name: p.name,
        photo: p.photo_url ?? undefined,
        listType: p.list_type as ListType,
        reason: p.notes ?? undefined,
        addedAt: p.created_at,
      }));
      setSecurityPersons(mapped);
    } catch {
      toast.error('Erro ao carregar dados de segurança');
    } finally {
      setLoading(false);
    }
  }, [refetchLogs, refetchAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading) return;
    setStats({
      totalLogs: logs.length,
      errorCount: logs.filter((l) => l.level === 'error' || l.level === 'critical').length,
      warningCount: logs.filter((l) => l.level === 'warning').length,
      accessGranted: accessEvents.filter((a) => a.status === 'granted').length,
      accessDenied: accessEvents.filter((a) => a.status === 'denied').length,
      blacklistCount: securityPersons.filter((p) => p.listType === 'blacklist').length,
      whitelistCount: securityPersons.filter((p) => p.listType === 'whitelist').length,
    });
  }, [logs, accessEvents, securityPersons, loading]);

  const exportLogs = () => {
    const headers = ['Data/Hora', 'Nível', 'Categoria', 'Ação', 'Descrição', 'Usuário', 'IP'];
    const rows = logs.map((log) => [
      format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      log.level,
      log.category,
      log.action,
      log.description,
      log.userName || '',
      log.ipAddress || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `logs-seguranca-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Logs exportados');
  };

  if (loading) {
    return (
      <PageContent>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div role="main" aria-label="Segurança" className="space-y-6 contents">
        <PageMeta
          title="Segurança"
          description="Logs de auditoria, controle de acesso e listas de segurança"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Segurança
            </h1>
            <p className="text-sm text-muted-foreground">Logs de auditoria e controle de acesso</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {stats && <SecurityStatsCards stats={stats} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="logs">
              <FileText className="w-4 h-4 mr-2" />
              Logs de Auditoria
            </TabsTrigger>
            <TabsTrigger value="access">
              <Lock className="w-4 h-4 mr-2" />
              Controle de Acesso
            </TabsTrigger>
            <TabsTrigger value="lists">
              <Users className="w-4 h-4 mr-2" />
              Listas de Segurança
            </TabsTrigger>
            <TabsTrigger value="mfa">
              <Smartphone className="w-4 h-4 mr-2" />
              Segurança da Conta
            </TabsTrigger>
          </TabsList>
          <TabsContent value="logs" className="mt-4">
            <AuditLogTable logs={logs} />
          </TabsContent>
          <TabsContent value="access" className="mt-4">
            <AccessEventsList events={accessEvents} />
          </TabsContent>
          <TabsContent value="lists" className="mt-4">
            <SecurityListsPanel persons={securityPersons} onPersonsChange={setSecurityPersons} />
          </TabsContent>
          <TabsContent value="mfa" className="mt-4">
            <SecurityMFAPanel />
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}

export default SecurityPage;
