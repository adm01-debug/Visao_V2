/**
 * VISÃO - Sistema de Vigilância Inteligente
 * AlertHistory Component
 */

import { memo, useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Clock,
  Filter,
  Download,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface HistoricalAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  cameraName: string;
  timestamp: Date | string;
  isRead: boolean;
}

interface AlertHistoryProps {
  alerts: HistoricalAlert[];
  onAlertClick?: (alert: HistoricalAlert) => void;
  onExport?: () => void;
  itemsPerPage?: number;
  className?: string;
}

const severityColors: Record<AlertSeverity, string> = {
  low: 'bg-secondary text-secondary-foreground',
  medium: 'bg-warning text-warning-foreground',
  high: 'bg-destructive text-destructive-foreground',
  critical: 'bg-destructive text-destructive-foreground animate-pulse',
};

function AlertHistoryComponent({ 
  alerts, 
  onAlertClick, 
  onExport,
  itemsPerPage = 10,
  className 
}: AlertHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           alert.cameraName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesType = typeFilter === 'all' || alert.type === typeFilter;
      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [alerts, searchQuery, severityFilter, typeFilter]);

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Histórico de Alertas
          </CardTitle>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar alertas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AlertType | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="security">Segurança</SelectItem>
              <SelectItem value="safety">Trabalho</SelectItem>
              <SelectItem value="operations">Operações</SelectItem>
              <SelectItem value="access">Acesso</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert List */}
        <div className="space-y-2">
          {paginatedAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum alerta encontrado</p>
            </div>
          ) : (
            paginatedAlerts.map((alert) => {
              const timestamp = alert.timestamp instanceof Date ? alert.timestamp : new Date(alert.timestamp);
              return (
                <div
                  key={alert.id}
                  onClick={() => onAlertClick?.(alert)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
                    !alert.isRead && "border-l-4 border-l-destructive bg-destructive/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={severityColors[alert.severity]}>
                        {alert.severity}
                      </Badge>
                      <span className="font-medium truncate max-w-[300px]">{alert.message}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(timestamp, { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.cameraName}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} de {filteredAlerts.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">{currentPage} / {totalPages}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const AlertHistory = memo(AlertHistoryComponent);
