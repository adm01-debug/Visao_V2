import { getRelativeTime, formatDuration, formatDate } from "@/lib/dateUtils";
import { TimeAgo } from "@/components/TimeAgo";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useInterval } from "@/hooks/useInterval";
import { SeverityBadge } from "@/components/SeverityBadge";

/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Alertas
 *
 * Funcionalidades:
 * - Lista completa de alertas com paginação
 * - Filtros avançados (tipo, severidade, câmera, data)
 * - Ações em lote (marcar lido, excluir)
 * - Visualização de detalhes com snapshot
 * - Timeline de alertas
 * - Notificações em tempo real
 */

import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Download,
  Eye,
  EyeOff,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useCameras } from "@/hooks/useCameras";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { useFaceRecognitionAlerts } from "@/hooks/useFaceRecognitionAlerts";
import { useI18n } from "@/contexts/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaginationControls, usePagination } from "@/components/PaginationControls";
import { ExportMenu } from "@/components/ExportMenu";
import { EventTimeline } from "@/components/EventTimeline";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";


// ============================================
// TIPOS
// ============================================

type ViewMode = 'grid' | 'list' | 'timeline';
type SortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc';

interface AlertFilters {
  search: string;
  type: string;
  severity: string;
  cameraId: string;
  dateRange: string;
  readStatus: 'all' | 'read' | 'unread';
}

const defaultFilters: AlertFilters = {
  search: '',
  type: 'all',
  severity: 'all',
  cameraId: 'all',
  dateRange: 'all',
  readStatus: 'all',
};

// ============================================
// HELPERS
// ============================================

const severityConfig = {
  critical: { color: 'bg-red-500', label: 'Crítico', order: 4 },
  high: { color: 'bg-orange-500', label: 'Alto', order: 3 },
  medium: { color: 'bg-yellow-500', label: 'Médio', order: 2 },
  low: { color: 'bg-blue-500', label: 'Baixo', order: 1 },
};

const typeConfig = {
  security: { icon: Shield, label: 'Segurança', color: 'text-red-500' },
  productivity: { icon: Zap, label: 'Produtividade', color: 'text-blue-500' },
  safety: { icon: AlertTriangle, label: 'Segurança do Trabalho', color: 'text-orange-500' },
  intrusion: { icon: Eye, label: 'Intrusão', color: 'text-purple-500' },
  zone: { icon: Camera, label: 'Zona', color: 'text-green-500' },
  face: { icon: Eye, label: 'Reconhecimento', color: 'text-pink-500' },
};

// ============================================
// COMPONENTE: Alert Item (Grid)
// ============================================

interface AlertItemProps {
  alert: unknown;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  viewMode: ViewMode;
}

function AlertItem({ 
  alert, 
  isSelected, 
  onSelect, 
  onView, 
  onMarkRead, 
  onDelete,
  viewMode,
}: AlertItemProps) {
  const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
  const type = typeConfig[alert.type as keyof typeof typeConfig] || typeConfig.security;
  const TypeIcon = type.icon;
  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: ptBR });

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer',
          !alert.is_read && 'border-l-4 border-l-primary',
          isSelected && 'ring-2 ring-primary'
        )}
        onClick={onView}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
        />

        <div className={cn('w-2 h-2 rounded-full', severity.color)} />

        <div role="main" aria-label="Central de alertas" className="flex-1 min-w-0">
          <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
            <TypeIcon className={cn('w-4 h-4', type.color)} />
            <span className="font-medium truncate">{alert.message}</span>
          </div>
          <div role="main" aria-label="Central de alertas" className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Camera className="w-3 h-3" />
            <span>{alert.camera_name}</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
          <Badge variant="outline" className={type.color}>
            {type.label}
          </Badge>
          <Badge className={cn('text-white', severity.color)}>
            {severity.label}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button aria-label="Ação" variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkRead(); }}>
              {alert.is_read ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Marcar como não lido
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Marcar como lido
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive" 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Grid view
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        !alert.is_read && 'ring-2 ring-primary/20',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onView}
    >
      <CardHeader className="p-4 pb-2">
        <div role="main" aria-label="Central de alertas" className="flex items-start justify-between">
          <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <div className={cn('w-3 h-3 rounded-full', severity.color)} />
            <Badge variant="outline" className={cn('text-xs', type.color)}>
              {type.label}
            </Badge>
          </div>
          <Badge className={cn('text-white text-xs', severity.color)}>
            {severity.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {alert.thumbnail && (
          <div role="main" aria-label="Central de alertas" className="mb-3 rounded-lg overflow-hidden">
            <img
              src={alert.thumbnail}
              alt="Snapshot"
              className="w-full h-32 object-cover"
            />
          </div>
        )}
        <p className="font-medium text-sm line-clamp-2 mb-2">{alert.message}</p>
        <div role="main" aria-label="Central de alertas" className="flex items-center justify-between text-xs text-muted-foreground">
          <div role="main" aria-label="Central de alertas" className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{alert.camera_name}</span>
          </div>
          <span>{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE: Alert Details Dialog
// ============================================

interface AlertDetailsDialogProps {
  alert: unknown;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

function AlertDetailsDialog({
  alert,
  isOpen,
  onClose,
  onMarkRead,
  onDelete,
}: AlertDetailsDialogProps) {
  if (!alert) return null;

  const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
  const type = typeConfig[alert.type as keyof typeof typeConfig] || typeConfig.security;
  const TypeIcon = type.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={cn('w-5 h-5', type.color)} />
            Detalhes do Alerta
          </DialogTitle>
          <DialogDescription>
            Criado em {new Date(alert.timestamp).toLocaleString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        <div role="main" aria-label="Central de alertas" className="space-y-4">
          {/* Badges */}
          <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
            <Badge className={cn('text-white', severity.color)}>
              {severity.label}
            </Badge>
            <Badge variant="outline" className={type.color}>
              {type.label}
            </Badge>
            {!alert.is_read && (
              <Badge variant="secondary">Não lido</Badge>
            )}
          </div>

          {/* Message */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Mensagem</h4>
            <p className="text-lg">{alert.message}</p>
          </div>

          {/* Camera */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Câmera</h4>
            <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>{alert.camera_name}</span>
            </div>
          </div>

          {/* Snapshot */}
          {alert.thumbnail && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Snapshot</h4>
              <img
                src={alert.thumbnail}
                alt="Snapshot do alerta"
                className="w-full rounded-lg border"
              />
            </div>
          )}

          {/* Actions */}
          <div role="main" aria-label="Central de alertas" className="flex items-center gap-2 pt-4 border-t">
            <Button aria-label="Ação" variant="outline" onClick={onMarkRead}>
              {alert.is_read ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Marcar não lido
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Marcar como lido
                </>
              )}
            </Button>
            <Button aria-label="Ação" variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AlertsPage() {
  const { events: recognitionEvents, stats: recognitionStats } = useFaceRecognitionAlerts();

  // Estado
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<AlertFilters>(defaultFilters);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [detailsAlert, setDetailsAlert] = useState<Alert | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Hooks
  const { t } = useI18n();
  const {
    alerts,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteAlert,
    refetch,
  } = useAlerts();
  const { cameras } = useCameras();

  // Realtime updates are already handled in useAlerts hook

  // Filtrar e ordenar
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(a => 
        a.message.toLowerCase().includes(query) ||
        a.camera_name.toLowerCase().includes(query)
      );
    }

    // Type
    if (filters.type !== 'all') {
      result = result.filter(a => a.type === filters.type);
    }

    // Severity
    if (filters.severity !== 'all') {
      result = result.filter(a => a.severity === filters.severity);
    }

    // Camera
    if (filters.cameraId !== 'all') {
      result = result.filter(a => a.camera_id === filters.cameraId);
    }

    // Read status
    if (filters.readStatus === 'read') {
      result = result.filter(a => a.is_read);
    } else if (filters.readStatus === 'unread') {
      result = result.filter(a => !a.is_read);
    }

    // Date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let minDate: Date;
      switch (filters.dateRange) {
        case '1h':
          minDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          minDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          minDate = new Date(0);
      }
      result = result.filter(a => new Date(a.timestamp) >= minDate);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'severity-desc':
          return (severityConfig[b.severity as keyof typeof severityConfig]?.order || 0) -
                 (severityConfig[a.severity as keyof typeof severityConfig]?.order || 0);
        case 'severity-asc':
          return (severityConfig[a.severity as keyof typeof severityConfig]?.order || 0) -
                 (severityConfig[b.severity as keyof typeof severityConfig]?.order || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [alerts, filters, sortBy]);

  // Paginação
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems,
    totalItems,
  } = usePagination(filteredAlerts, viewMode === 'grid' ? 12 : 10);

  // Handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAlerts(new Set(paginatedItems.map(a => a.id)));
    } else {
      setSelectedAlerts(new Set());
    }
  }, [paginatedItems]);

  const handleSelectAlert = useCallback((id: string, selected: boolean) => {
    const newSelection = new Set(selectedAlerts);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedAlerts(newSelection);
  }, [selectedAlerts]);

  const handleMarkSelectedRead = useCallback(async () => {
    for (const id of selectedAlerts) {
      await markAsRead(id);
    }
    setSelectedAlerts(new Set());
    toast.success(`${selectedAlerts.size} alertas marcados como lidos`);
  }, [selectedAlerts, markAsRead]);

  const handleDeleteSelected = useCallback(async () => {
    for (const id of selectedAlerts) {
      await deleteAlert(id);
    }
    setSelectedAlerts(new Set());
    toast.success(`${selectedAlerts.size} alertas excluídos`);
  }, [selectedAlerts, deleteAlert]);

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'search') return value !== '';
    return value !== 'all';
  });

  // Stats
  const stats = useMemo(() => ({
    total: alerts.length,
    unread: unreadCount,
    critical: alerts.filter(a => a.severity === 'critical').length,
    today: alerts.filter(a => {
      const alertDate = new Date(a.timestamp);
      const today = new Date();
      return alertDate.toDateString() === today.toDateString();
    }).length,
  }), [alerts, unreadCount]);

  if (loading) {
    return (
      <div role="main" aria-label="Central de alertas" className="p-6 space-y-6">
        <div role="main" aria-label="Central de alertas" className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div role="main" aria-label="Central de alertas" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div role="main" aria-label="Central de alertas" className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div role="main" aria-label="Central de alertas" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} alertas • {stats.unread} não lidos
          </p>
        </div>

        <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
          <Button aria-label="Ação" variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {unreadCount > 0 && (
            <Button aria-label="Ação" variant="outline" size="sm" onClick={() => markAllAsRead()}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todos como lidos
            </Button>
          )}
          <ExportMenu
            onExportCSV={() => {}}
            onExportPDF={() => {}}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div role="main" aria-label="Central de alertas" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div role="main" aria-label="Central de alertas" className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div role="main" aria-label="Central de alertas" className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Não Lidos</p>
                <p className="text-2xl font-bold text-primary">{stats.unread}</p>
              </div>
              <EyeOff className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div role="main" aria-label="Central de alertas" className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div role="main" aria-label="Central de alertas" className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Controls */}
      <div role="main" aria-label="Central de alertas" className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div role="main" aria-label="Central de alertas" className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("alerts.searchPlaceholder", "Buscar alertas...")}
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-9"
          />
        </div>

        {/* Quick filters */}
        <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
          <Select
            value={filters.severity}
            onValueChange={(v) => setFilters(f => ({ ...f, severity: v }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("alerts.filterSeverity", "Severidade")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="low">Baixo</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.dateRange}
            onValueChange={(v) => setFilters(f => ({ ...f, dateRange: v }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("alerts.filterPeriod", "Período")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("alerts.sortBy", "Ordenar")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Mais recentes</SelectItem>
              <SelectItem value="date-asc">Mais antigos</SelectItem>
              <SelectItem value="severity-desc">Maior severidade</SelectItem>
              <SelectItem value="severity-asc">Menor severidade</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button aria-label="Ação" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* View mode */}
        <div role="main" aria-label="Central de alertas" className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedAlerts.size > 0 && (
        <div role="main" aria-label="Central de alertas" className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedAlerts.size} alertas selecionados
          </span>
          <Button aria-label="Ação" size="sm" variant="outline" onClick={handleMarkSelectedRead}>
            <Check className="w-4 h-4 mr-1" />
            Marcar como lidos
          </Button>
          <Button aria-label="Ação" size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir
          </Button>
          <Button aria-label="Ação" size="sm" variant="ghost" onClick={() => setSelectedAlerts(new Set())}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Results info */}
      <div role="main" aria-label="Central de alertas" className="flex items-center justify-between text-sm text-muted-foreground">
        <div role="main" aria-label="Central de alertas" className="flex items-center gap-2">
          <Checkbox
            checked={paginatedItems.length > 0 && paginatedItems.every(a => selectedAlerts.has(a.id))}
            onCheckedChange={handleSelectAll}
          />
          <span>
            Mostrando {paginatedItems.length} de {totalItems} alertas
          </span>
        </div>
      </div>

      {/* Alerts List/Grid */}
      <div className={cn(
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'flex flex-col gap-2'
      )}>
        {paginatedItems.map(alert => (
          <AlertItem
            key={alert.id}
            alert={alert}
            isSelected={selectedAlerts.has(alert.id)}
            onSelect={(selected) => handleSelectAlert(alert.id, selected)}
            onView={() => setDetailsAlert(alert)}
            onMarkRead={() => markAsRead(alert.id)}
            onDelete={() => deleteAlert(alert.id)}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredAlerts.length === 0 && (
        <div role="main" aria-label="Central de alertas" className="text-center py-12">
          <BellOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum alerta encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters 
              ? 'Tente ajustar os filtros de busca'
              : 'Quando houver alertas, eles aparecerão aqui'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={viewMode === 'grid' ? 12 : 10}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Alert Details Dialog */}
      <AlertDetailsDialog
        alert={detailsAlert}
        isOpen={!!detailsAlert}
        onClose={() => setDetailsAlert(null)}
        onMarkRead={() => {
          markAsRead(detailsAlert.id);
          setDetailsAlert(null);
        }}
        onDelete={() => {
          deleteAlert(detailsAlert.id);
          setDetailsAlert(null);
        }}
      />
    </div>
  );
}

export default AlertsPage;
