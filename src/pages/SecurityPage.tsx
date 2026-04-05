/**
 * VISÃO - Página de Segurança (Modularizada)
 */
import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Download, FileText, Lock, Users } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

import { SecurityStatsCards } from '@/components/security/SecurityStatsCards';
import { AuditLogTable } from '@/components/security/AuditLogTable';
import { AccessEventsList } from '@/components/security/AccessEventsList';
import { SecurityListsPanel } from '@/components/security/SecurityListsPanel';

import type { AuditLog, AccessEvent, SecurityPerson, SecurityStats, ListType } from '@/components/security/SecurityTypes';

export function SecurityPage() {
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [securityPersons, setSecurityPersons] = useState<SecurityPerson[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mockLogs: AuditLog[] = [
        { id: '1', timestamp: new Date().toISOString(), level: 'info', category: 'auth', action: 'Login realizado', description: 'Usuário admin realizou login no sistema', userName: 'admin', ipAddress: '192.168.1.100' },
        { id: '2', timestamp: subDays(new Date(), 0.1).toISOString(), level: 'warning', category: 'access', action: 'Acesso negado', description: 'Tentativa de acesso não autorizado detectada', userName: 'desconhecido', ipAddress: '10.0.0.50' },
        { id: '3', timestamp: subDays(new Date(), 0.2).toISOString(), level: 'error', category: 'camera', action: 'Câmera offline', description: 'Câmera "Entrada Principal" ficou offline' },
        { id: '4', timestamp: subDays(new Date(), 0.3).toISOString(), level: 'critical', category: 'alert', action: 'Intruso detectado', description: 'Pessoa não autorizada detectada na área restrita' },
        { id: '5', timestamp: subDays(new Date(), 0.5).toISOString(), level: 'info', category: 'config', action: 'Configuração alterada', description: 'Configurações de notificação foram atualizadas', userName: 'admin' },
      ];
      setLogs(mockLogs);

      const mockAccess: AccessEvent[] = [
        { id: '1', timestamp: new Date().toISOString(), personId: 'p1', personName: 'João Silva', status: 'granted', cameraName: 'Entrada Principal', location: 'Portaria', confidence: 0.95 },
        { id: '2', timestamp: subDays(new Date(), 0.05).toISOString(), personId: 'p2', personName: 'Desconhecido', status: 'denied', cameraName: 'Área Restrita', location: 'Depósito', confidence: 0.72, reason: 'Pessoa não cadastrada' },
        { id: '3', timestamp: subDays(new Date(), 0.1).toISOString(), personId: 'p3', personName: 'Maria Santos', status: 'granted', cameraName: 'Recepção', location: 'Lobby', confidence: 0.98 },
      ];
      setAccessEvents(mockAccess);

      const { data: persons } = await supabase.from('registered_persons').select('*').in('list_type', ['whitelist', 'blacklist', 'watchlist']);
      const mapped = (persons || []).map(p => ({ id: p.id, name: p.name, photo: p.photo_url ?? undefined, listType: p.list_type as ListType, reason: p.notes ?? undefined, addedAt: p.created_at }));
      setSecurityPersons(mapped);

      setStats({
        totalLogs: mockLogs.length,
        errorCount: mockLogs.filter(l => l.level === 'error' || l.level === 'critical').length,
        warningCount: mockLogs.filter(l => l.level === 'warning').length,
        accessGranted: mockAccess.filter(a => a.status === 'granted').length,
        accessDenied: mockAccess.filter(a => a.status === 'denied').length,
        blacklistCount: mapped.filter(p => p.listType === 'blacklist').length,
        whitelistCount: mapped.filter(p => p.listType === 'whitelist').length,
      });
    } catch { toast.error('Erro ao carregar dados de segurança'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const exportLogs = () => {
    const headers = ['Data/Hora', 'Nível', 'Categoria', 'Ação', 'Descrição', 'Usuário', 'IP'];
    const rows = logs.map(log => [
      format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss'), log.level, log.category, log.action, log.description, log.userName || '', log.ipAddress || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `logs-seguranca-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Logs exportados');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div role="main" aria-label="Segurança" className="page-container space-y-6 h-[calc(100vh-4rem)] overflow-auto mb-mobile-nav">
      <PageMeta title="Segurança" description="Logs de auditoria, controle de acesso e listas de segurança" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" />Segurança</h1>
          <p className="text-sm text-muted-foreground">Logs de auditoria e controle de acesso</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
          <Button variant="outline" size="sm" onClick={exportLogs}><Download className="w-4 h-4 mr-2" />Exportar</Button>
        </div>
      </div>

      {stats && <SecurityStatsCards stats={stats} />}
      

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs"><FileText className="w-4 h-4 mr-2" />Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="access"><Lock className="w-4 h-4 mr-2" />Controle de Acesso</TabsTrigger>
          <TabsTrigger value="lists"><Users className="w-4 h-4 mr-2" />Listas de Segurança</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-4"><AuditLogTable logs={logs} /></TabsContent>
        <TabsContent value="access" className="mt-4"><AccessEventsList events={accessEvents} /></TabsContent>
        <TabsContent value="lists" className="mt-4"><SecurityListsPanel persons={securityPersons} onPersonsChange={setSecurityPersons} /></TabsContent>
      </Tabs>
    </div>
  );
}

export default SecurityPage;
