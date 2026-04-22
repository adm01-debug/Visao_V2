/**
 * VISÃO - Página de Alertas (Modularizada)
 */
import { useState, useMemo, useCallback } from "react";
import { Bell, BellOff, Check, CheckCheck, LayoutGrid, List, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useCameras } from "@/hooks/useCameras";
import { useFaceRecognitionAlerts } from "@/hooks/useFaceRecognitionAlerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListSkeleton } from "@/components/ui/LoadingState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls, usePagination } from "@/components/PaginationControls";
import { ExportMenu } from "@/components/ExportMenu";
import { EmptyState } from "@/components/EmptyState";
import { PageMeta } from "@/components/PageMeta";
import { exportAlerts } from '@/lib/exportUtils';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { AlertItem } from "@/components/alerts/AlertItem";
import { AlertDetailsDialog } from "@/components/alerts/AlertDetailsDialog";
import { AlertStatsCards } from "@/components/alerts/AlertStatsCards";
import { AlertSeveritySummary } from "@/components/alerts/AlertSeveritySummary";
import type { AlertRecord, AlertFilters, ViewMode, SortOption } from "@/components/alerts/AlertTypes";
import { defaultFilters, severityConfig } from "@/components/alerts/AlertTypes";
import { PageContent } from "@/components/layout/MainLayout";

export function AlertsPage() {
  const { events: _recognitionEvents } = useFaceRecognitionAlerts({ cameraId: '', cameraName: '' });

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<AlertFilters>(defaultFilters);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [detailsAlert, setDetailsAlert] = useState<AlertRecord | null>(null);
  const [removingAlerts, setRemovingAlerts] = useState<Set<string>>(new Set());

  const { alerts, loading, unreadCount, markAsRead, markAllAsRead, deleteAlert, refetch } = useAlerts();
  const { cameras: _cameras } = useCameras();

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    if (filters.search) { const q = filters.search.toLowerCase(); result = result.filter(a => a.message.toLowerCase().includes(q) || a.camera_name.toLowerCase().includes(q)); }
    if (filters.type !== 'all') result = result.filter(a => a.type === filters.type);
    if (filters.severity !== 'all') result = result.filter(a => a.severity === filters.severity);
    if (filters.cameraId !== 'all') result = result.filter(a => a.camera_id === filters.cameraId);
    if (filters.readStatus === 'read') result = result.filter(a => a.is_read);
    else if (filters.readStatus === 'unread') result = result.filter(a => !a.is_read);
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const ms: Record<string, number> = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
      const min = now - (ms[filters.dateRange] || 0);
      result = result.filter(a => new Date(a.timestamp).getTime() >= min);
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc': return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'severity-desc': return (severityConfig[b.severity as keyof typeof severityConfig]?.order || 0) - (severityConfig[a.severity as keyof typeof severityConfig]?.order || 0);
        case 'severity-asc': return (severityConfig[a.severity as keyof typeof severityConfig]?.order || 0) - (severityConfig[b.severity as keyof typeof severityConfig]?.order || 0);
        default: return 0;
      }
    });
    return result;
  }, [alerts, filters, sortBy]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems, totalItems } = usePagination(filteredAlerts, viewMode === 'grid' ? 12 : 10);

  const handleSelectAll = useCallback((checked: boolean) => { setSelectedAlerts(checked ? new Set(paginatedItems.map(a => a.id)) : new Set()); }, [paginatedItems]);
  const handleSelectAlert = useCallback((id: string, selected: boolean) => { setSelectedAlerts(prev => { const s = new Set(prev); selected ? s.add(id) : s.delete(id); return s; }); }, []);
  const handleMarkSelectedRead = useCallback(async () => { for (const id of selectedAlerts) await markAsRead(id); setSelectedAlerts(new Set()); toast.success(`${selectedAlerts.size} alertas marcados como lidos`); }, [selectedAlerts, markAsRead]);
  const animateAndDelete = useCallback(async (ids: string[]) => {
    setRemovingAlerts(new Set(ids));
    await new Promise(r => setTimeout(r, 300));
    for (const id of ids) await deleteAlert(id);
    setRemovingAlerts(new Set());
  }, [deleteAlert]);
  const handleDeleteSelected = useCallback(async () => { const ids = [...selectedAlerts]; await animateAndDelete(ids); setSelectedAlerts(new Set()); toast.success(`${ids.length} alertas excluídos`); }, [selectedAlerts, animateAndDelete]);
  const clearFilters = () => { setFilters(defaultFilters); setActiveStatsFilter(null); };
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key === 'search' ? value !== '' : value !== 'all');
  const [activeStatsFilter, setActiveStatsFilter] = useState<'total' | 'unread' | 'critical' | 'today' | null>(null);

  const handleStatsFilterClick = (key: 'total' | 'unread' | 'critical' | 'today') => {
    if (activeStatsFilter === key) {
      setActiveStatsFilter(null);
      setFilters(defaultFilters);
      return;
    }
    setActiveStatsFilter(key);
    switch (key) {
      case 'total': setFilters(defaultFilters); break;
      case 'unread': setFilters({ ...defaultFilters, readStatus: 'unread' }); break;
      case 'critical': setFilters({ ...defaultFilters, severity: 'critical' }); break;
      case 'today': setFilters({ ...defaultFilters, dateRange: '24h' }); break;
    }
  };

  const severityCounts = useMemo(() => ({
    low: alerts.filter(a => a.severity === 'low').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    high: alerts.filter(a => a.severity === 'high').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
  }), [alerts]);

  const stats = useMemo(() => ({
    total: alerts.length,
    unread: unreadCount,
    critical: severityCounts.critical,
    today: alerts.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString()).length,
  }), [alerts, unreadCount, severityCounts]);


  return (
    <PageContent>
      <div role="main" aria-label="Central de alertas" className="space-y-6">
      <PageMeta title="Alertas" description="Central de alertas e notificações do sistema de vigilância" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" />Alertas</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '— alertas • — não lidos' : `${stats.total} alertas • ${stats.unread} não lidos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Atualizar
          </Button>
          {!loading && unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => markAllAsRead()}><CheckCheck className="w-4 h-4 mr-2" />Marcar todos como lidos</Button>}
          <ExportMenu onExportCSV={() => exportAlerts(filteredAlerts, 'csv')} onExportPDF={() => exportAlerts(filteredAlerts, 'pdf')} />
        </div>
      </div>

      <AlertStatsCards stats={stats} activeFilter={activeStatsFilter} onFilterClick={handleStatsFilterClick} loading={loading} />
      <AlertSeveritySummary
        counts={severityCounts}
        total={stats.total}
        activeSeverity={filters.severity !== 'all' ? filters.severity : undefined}
        onSeverityClick={(severity) => {
          setActiveStatsFilter(null);
          setFilters(_f => ({ ...defaultFilters, severity }));
        }}
        loading={loading}
      />

      <AlertStatsCards stats={stats} activeFilter={activeStatsFilter} onFilterClick={handleStatsFilterClick} />
      <AlertSeveritySummary
        counts={severityCounts}
        total={stats.total}
        activeSeverity={filters.severity !== 'all' ? filters.severity : undefined}
        onSeverityClick={(severity) => {
          setActiveStatsFilter(null);
          setFilters(_f => ({ ...defaultFilters, severity }));
        }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar alertas..." value={filters.search} disabled={loading} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({ ...f, severity: v }))} disabled={loading}><SelectTrigger className="w-32"><SelectValue placeholder="Severidade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="critical">Crítico</SelectItem><SelectItem value="high">Alto</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="low">Baixo</SelectItem></SelectContent></Select>
          <Select value={filters.dateRange} onValueChange={(v) => setFilters(f => ({ ...f, dateRange: v }))} disabled={loading}><SelectTrigger className="w-32"><SelectValue placeholder="Período" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="1h">Última hora</SelectItem><SelectItem value="24h">Últimas 24h</SelectItem><SelectItem value="7d">Últimos 7 dias</SelectItem><SelectItem value="30d">Últimos 30 dias</SelectItem></SelectContent></Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)} disabled={loading}><SelectTrigger className="w-36"><SelectValue placeholder="Ordenar" /></SelectTrigger><SelectContent><SelectItem value="date-desc">Mais recentes</SelectItem><SelectItem value="date-asc">Mais antigos</SelectItem><SelectItem value="severity-desc">Maior severidade</SelectItem><SelectItem value="severity-asc">Menor severidade</SelectItem></SelectContent></Select>
          {!loading && hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Limpar</Button>}
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')} disabled={loading}><List className="w-4 h-4" /></Button>
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')} disabled={loading}><LayoutGrid className="w-4 h-4" /></Button>
        </div>
      </div>

      {!loading && selectedAlerts.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">{selectedAlerts.size} alertas selecionados</span>
          <Button size="sm" variant="outline" onClick={handleMarkSelectedRead}><Check className="w-4 h-4 mr-1" />Marcar como lidos</Button>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedAlerts(new Set())}>Cancelar</Button>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Checkbox checked={!loading && paginatedItems.length > 0 && paginatedItems.every(a => selectedAlerts.has(a.id))} disabled={loading} onCheckedChange={handleSelectAll} />
          <span>{loading ? 'Carregando alertas...' : `Mostrando ${paginatedItems.length} de ${totalItems} alertas`}</span>
        </div>
      </div>

      <div aria-busy={loading} aria-live="polite">
        {loading ? (
          <ListSkeleton count={viewMode === 'grid' ? 8 : 6} />
        ) : (
          <div className={cn(
            viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-2',
            'transition-all duration-300 ease-out'
          )}>
            {paginatedItems.map((alert, index) => (
              <div
                key={alert.id}
                className={cn(
                  'animate-fade-in transition-all duration-300 ease-out',
                  removingAlerts.has(alert.id) && 'opacity-0 scale-95 -translate-x-4'
                )}
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
              >
                <AlertItem alert={alert} isSelected={selectedAlerts.has(alert.id)} onSelect={(selected) => handleSelectAlert(alert.id, selected)} onView={() => setDetailsAlert(alert)} onMarkRead={() => markAsRead(alert.id)} onDelete={() => animateAndDelete([alert.id])} viewMode={viewMode} />
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && filteredAlerts.length === 0 && (
        <EmptyState icon={BellOff} title={hasActiveFilters ? 'Nenhum alerta encontrado' : 'Nenhum alerta registrado'}
          description={hasActiveFilters ? 'Nenhum alerta corresponde aos filtros aplicados.' : 'Seu sistema está tranquilo!'}
          secondaryActionLabel={hasActiveFilters ? 'Limpar filtros' : undefined}
          onSecondaryAction={hasActiveFilters ? clearFilters : undefined} />
      )}

      {!loading && totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={viewMode === 'grid' ? 12 : 10} onPageChange={setCurrentPage} />}

      <AlertDetailsDialog alert={detailsAlert} isOpen={!!detailsAlert} onClose={() => setDetailsAlert(null)}
        onMarkRead={() => { if (detailsAlert) markAsRead(detailsAlert.id); setDetailsAlert(null); }}
        onDelete={() => { if (detailsAlert) { animateAndDelete([detailsAlert.id]); } setDetailsAlert(null); }} />
    </div>
  );
}

export default AlertsPage;
