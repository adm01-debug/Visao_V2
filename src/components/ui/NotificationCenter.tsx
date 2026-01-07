/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Notification Center - Centro de notificações avançado
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  Filter,
  AlertTriangle,
  Info,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  isRead: boolean;
  category?: string;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: Check
};

const typeColors = {
  info: 'text-blue-500 bg-blue-500/10',
  warning: 'text-yellow-500 bg-yellow-500/10',
  error: 'text-destructive bg-destructive/10',
  success: 'text-green-500 bg-green-500/10'
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  className
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(
    () => filter === 'unread' 
      ? notifications.filter(n => !n.isRead)
      : notifications,
    [notifications, filter]
  );

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onMarkAllAsRead}
                      className="text-xs"
                    >
                      <CheckCheck className="w-4 h-4 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <div className="px-4 pt-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">
                      Todas
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="flex-1">
                      Não lidas ({unreadCount})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value={filter} className="mt-0">
                  <ScrollArea className="h-80">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Bell className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredNotifications.map((notification, index) => {
                          const Icon = typeIcons[notification.type];
                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                "p-4 hover:bg-muted/50 transition-colors cursor-pointer group",
                                !notification.isRead && "bg-primary/5"
                              )}
                              onClick={() => onMarkAsRead(notification.id)}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  typeColors[notification.type]
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={cn(
                                      "text-sm font-medium truncate",
                                      !notification.isRead && "font-semibold"
                                    )}>
                                      {notification.title}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(notification.id);
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 mt-2">
                                    {formatDistanceToNow(notification.timestamp, {
                                      addSuffix: true,
                                      locale: ptBR
                                    })}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {notifications.length > 0 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="w-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar todas
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Toast Notification Stack
interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
}

interface ToastStackProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastStack({ 
  toasts, 
  onDismiss,
  position = 'top-right' 
}: ToastStackProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={cn("fixed z-50 flex flex-col gap-2 w-80", positionClasses[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = typeIcons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              layout
              className="bg-card border rounded-lg shadow-lg p-4 flex items-start gap-3"
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                typeColors[toast.type]
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-muted-foreground mt-1">{toast.message}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 flex-shrink-0"
                onClick={() => onDismiss(toast.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
