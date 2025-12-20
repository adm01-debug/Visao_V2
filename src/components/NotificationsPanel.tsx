/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: NotificationsPanel
 * 
 * Painel de notificações com:
 * - Lista de notificações
 * - Marcar como lida
 * - Ações rápidas
 * - Configurações
 */

import { useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Volume2,
  VolumeX,
  Mail,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Clock,
  Camera,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS
// ============================================

type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  isRead: boolean;
  createdAt: string;
  cameraName?: string;
  onRead: () => void;
  onDelete: () => void;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const severityConfig: Record<NotificationSeverity, {
  icon: any;
  color: string;
  bgColor: string;
  label: string;
}> = {
  low: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Baixa',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Média',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'Alta',
  },
  critical: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Crítica',
  },
};

// ============================================
// COMPONENTE: Notification Item
// ============================================

function NotificationItem({
  id,
  title,
  message,
  severity,
  isRead,
  createdAt,
  cameraName,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'p-3 rounded-lg transition-colors cursor-pointer group',
        isRead ? 'bg-background hover:bg-muted/50' : 'bg-muted/50 hover:bg-muted',
        !isRead && 'border-l-2 border-primary'
      )}
      onClick={onRead}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm truncate',
                !isRead && 'font-medium'
              )}>
                {title}
              </p>
              {cameraName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Camera className="w-3 h-3" />
                  {cameraName}
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {message}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={cn('text-[10px] h-5', config.color)}>
              {config.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const {
    notifications,
    unreadCount,
    config,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    saveConfig,
    playAlertSound,
    sendTestNotification,
  } = useNotifications();

  // Filtrar por tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return n.status !== 'read';
    if (activeTab === 'critical') return n.severity === 'critical' || n.severity === 'high';
    return true;
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Header */}
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Notificações</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => playAlertSound()}
                  title="Testar som"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={markAllAsRead}>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Marcar todas como lidas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={clearAll}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar todas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Sons</Label>
                        <Switch 
                          checked={config?.soundEnabled ?? true}
                          onCheckedChange={(checked) => saveConfig({ soundEnabled: checked })}
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                Todas
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Não lidas {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="critical" className="text-xs">
                Críticas
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator />

          {/* Content */}
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <BellOff className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'all' 
                      ? 'Nenhuma notificação'
                      : activeTab === 'unread'
                      ? 'Nenhuma notificação não lida'
                      : 'Nenhuma notificação crítica'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    id={notification.id}
                    title={notification.title}
                    message={notification.message}
                    severity={notification.severity}
                    isRead={notification.status === 'read'}
                    createdAt={notification.createdAt}
                    cameraName={notification.data?.cameraName}
                    onRead={() => markAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    // Navegar para página de configurações
                    window.location.href = '/settings';
                  }}
                >
                  Ver todas as configurações
                </Button>
              </div>
            </>
          )}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsPanel;
