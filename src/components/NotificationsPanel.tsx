import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Check, CheckCheck, Trash2, Filter, X, Shield, HardHat, Briefcase, DoorOpen, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAlerts, DbAlert } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

const alertTypeConfig: Record<AlertType, { icon: React.ElementType; label: string; color: string }> = {
  security: { icon: Shield, label: 'Segurança', color: 'text-red-500' },
  safety: { icon: HardHat, label: 'Segurança do Trabalho', color: 'text-orange-500' },
  operations: { icon: Briefcase, label: 'Operações', color: 'text-blue-500' },
  access: { icon: DoorOpen, label: 'Controle de Acesso', color: 'text-purple-500' },
  analytics: { icon: BarChart3, label: 'Análise', color: 'text-cyan-500' },
};

const severityConfig: Record<AlertSeverity, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Baixa', variant: 'secondary' },
  medium: { label: 'Média', variant: 'default' },
  high: { label: 'Alta', variant: 'destructive' },
  critical: { label: 'Crítica', variant: 'destructive' },
};

interface NotificationsPanelProps {
  trigger?: React.ReactNode;
}

export function NotificationsPanel({ trigger }: NotificationsPanelProps) {
  const { alerts, loading, markAsRead, markAllAsRead, deleteAlert, unreadCount } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (readFilter === 'unread' && alert.is_read) return false;
      if (readFilter === 'read' && !alert.is_read) return false;
      return true;
    });
  }, [alerts, typeFilter, severityFilter, readFilter]);

  const clearFilters = () => {
    setTypeFilter('all');
    setSeverityFilter('all');
    setReadFilter('all');
  };

  const hasActiveFilters = typeFilter !== 'all' || severityFilter !== 'all' || readFilter !== 'all';

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAlert(id);
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} não lidas
                </Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="flex-shrink-0 space-y-3 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 ml-auto">
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="security">Segurança</SelectItem>
                <SelectItem value="safety">Seg. Trabalho</SelectItem>
                <SelectItem value="operations">Operações</SelectItem>
                <SelectItem value="access">Acesso</SelectItem>
                <SelectItem value="analytics">Análise</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 text-xs">
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

            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Não lidas</SelectItem>
                <SelectItem value="read">Lidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="w-full">
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Alerts List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Nenhuma notificação encontrada</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Mostrando {filteredAlerts.length} de {alerts.length} notificações
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface AlertItemProps {
  alert: DbAlert;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function AlertItem({ alert, onMarkAsRead, onDelete }: AlertItemProps) {
  const typeConfig = alertTypeConfig[alert.type as AlertType] || alertTypeConfig.security;
  const sevConfig = severityConfig[alert.severity as AlertSeverity] || severityConfig.medium;
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={cn(
        'group relative p-3 rounded-lg border transition-colors',
        alert.is_read
          ? 'bg-card border-border'
          : 'bg-primary/5 border-primary/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full bg-background', typeConfig.color)}>
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={sevConfig.variant} className="text-xs">
              {sevConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {typeConfig.label}
            </span>
            {!alert.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary ml-auto" />
            )}
          </div>
          <p className="text-sm font-medium line-clamp-2">{alert.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{alert.camera_name}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(alert.timestamp), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!alert.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMarkAsRead(alert.id)}
            title="Marcar como lida"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(alert.id)}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
