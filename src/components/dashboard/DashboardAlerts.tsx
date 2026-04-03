import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCheck,
  ArrowUpDown,
  X,
  TrendingUp,
} from 'lucide-react';
import { AlertCard, UIAlert } from '@/components/AlertCard';
import { AlertFiltersComponent, filterAlerts, defaultFilters, AlertFilters, CameraOption } from '@/components/AlertFilters';
import { ExportMenu } from '@/components/ExportMenu';
import { EmptyState } from '@/components/EmptyState';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filterAlertsBySearch } from '@/components/SearchInput';
import { exportAlerts } from '@/lib/exportUtils';
import { sortAlerts, type AlertSortOption } from './types';
import type { UICameraData } from './types';

interface DashboardAlertsProps {
  uiAlerts: UIAlert[];
  uiCameras: UICameraData[];
  searchQuery: string;
  alerts: any[];
  unreadCount: number;
  markAllAsRead: () => void;
}

export function DashboardAlerts({
  uiAlerts,
  uiCameras,
  searchQuery,
  alerts,
  unreadCount,
  markAllAsRead,
}: DashboardAlertsProps) {
  const [alertFilters, setAlertFilters] = useState<AlertFilters>(defaultFilters);
  const [alertSortBy, setAlertSortBy] = useState<AlertSortOption>('date-desc');

  const alertsWithFilters = filterAlerts(
    uiAlerts.map(a => ({ ...a, timestamp: a.timestamp.toISOString() })),
    alertFilters
  );
  const searchedAlerts = filterAlertsBySearch(alertsWithFilters, searchQuery);
  const filteredAlerts = useMemo(() => sortAlerts(searchedAlerts, alertSortBy), [searchedAlerts, alertSortBy]);

  const {
    currentPage: alertsPage,
    setCurrentPage: setAlertsPage,
    totalPages: alertsTotalPages,
    paginatedItems: paginatedAlerts,
    totalItems: alertsTotalItems,
  } = usePagination(filteredAlerts, 5);

  const handleExportAlertsCSV = () => exportAlerts(alerts, 'csv');
  const handleExportAlertsPDF = () => exportAlerts(alerts, 'pdf');

  return (
    <div className="space-y-4 animate-fade-in-delay-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground">Alertas Recentes</h2>
        </div>
        <div className="flex items-center gap-1">
          <Select value={alertSortBy} onValueChange={(v) => setAlertSortBy(v as AlertSortOption)}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Mais recentes</SelectItem>
              <SelectItem value="date-asc">Mais antigos</SelectItem>
              <SelectItem value="severity-desc">Maior severidade</SelectItem>
              <SelectItem value="severity-asc">Menor severidade</SelectItem>
              <SelectItem value="type">Por tipo</SelectItem>
            </SelectContent>
          </Select>
          <AlertFiltersComponent
            filters={alertFilters}
            onFiltersChange={setAlertFilters}
            cameras={uiCameras.map(c => ({ id: c.id, name: c.name })) as CameraOption[]}
          />
          <ExportMenu
            onExportCSV={handleExportAlertsCSV}
            onExportPDF={handleExportAlertsPDF}
            disabled={alerts.length === 0}
          />
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => markAllAsRead()}>
              <CheckCheck className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Camera filter indicator */}
      {alertFilters.cameraId !== 'all' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Filtrando por: {uiCameras.find(c => c.id === alertFilters.cameraId)?.name || 'Câmera'}
          </span>
          <Button
            variant="ghost" size="sm" className="h-6 px-2 ml-auto text-xs"
            onClick={() => setAlertFilters({ ...alertFilters, cameraId: 'all' })}
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      {/* Filter summary */}
      {(alertFilters.type !== 'all' || alertFilters.severity !== 'all' || alertFilters.dateRange !== 'all') && (
        <p className="text-xs text-muted-foreground">
          Mostrando {filteredAlerts.length} de {uiAlerts.length} alertas
        </p>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {paginatedAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={{ ...alert, timestamp: new Date(alert.timestamp) }}
            searchQuery={searchQuery}
            onCameraClick={(cameraId) => setAlertFilters({ ...alertFilters, cameraId })}
          />
        ))}
        {filteredAlerts.length === 0 && uiAlerts.length > 0 && (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhum alerta encontrado"
            description="Nenhum alerta corresponde aos filtros aplicados."
            size="sm"
          />
        )}
        {uiAlerts.length === 0 && (
          <EmptyState
            icon={AlertTriangle}
            title="Tudo tranquilo"
            description="Nenhum alerta registrado no momento."
            size="sm"
          />
        )}
      </div>

      {/* Pagination */}
      {alertsTotalPages > 1 && (
        <PaginationControls
          currentPage={alertsPage}
          totalPages={alertsTotalPages}
          totalItems={alertsTotalItems}
          itemsPerPage={5}
          onPageChange={setAlertsPage}
          compact
          className="mt-4"
        />
      )}

      {/* Productivity Score */}
      <div className="glass-card p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Produtividade</h3>
        </div>
        <div className="relative pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-bold text-primary">87%</span>
            <span className="text-xs text-success">+3% vs ontem</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '87%' }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Baseado em análise de movimentação e atividade
        </p>
      </div>
    </div>
  );
}
