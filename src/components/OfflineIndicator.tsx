/**
 * Offline Indicator Component
 * Shows connection status and pending sync actions
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CloudOff, 
  Cloud, 
  CheckCircle2,
  AlertCircle,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  variant?: 'minimal' | 'full';
  className?: string;
}

export function OfflineIndicator({ 
  variant = 'minimal',
  className 
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingActionsCount,
    lastSyncAt,
    syncNow,
    getStats
  } = useOfflineSync();

  const [stats, setStats] = useState({
    pendingActionsCount: 0,
    cachedAlertsCount: 0,
    cachedCamerasCount: 0,
    cachedPersonsCount: 0
  });
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(!isOnline);
  }, [isOnline]);

  useEffect(() => {
    getStats().then(setStats).catch(() => { /* Error handled silently */ });
  }, [getStats, pendingActionsCount]);

  if (variant === 'minimal') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'relative',
              !isOnline && 'text-yellow-500',
              className
            )}
            onClick={() => isOnline && syncNow()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {pendingActionsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {pendingActionsCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isSyncing 
            ? 'Sincronizando...' 
            : isOnline 
              ? pendingActionsCount > 0 
                ? `${pendingActionsCount} ações pendentes` 
                : 'Online - Clique para sincronizar'
              : 'Offline - Trabalhando com cache local'
          }
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500/10 border-b border-yellow-500/20 overflow-hidden"
          >
            <div className="container flex items-center justify-between py-2 px-4">
              <div className="flex items-center gap-2 text-yellow-500">
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Você está offline
                </span>
                <span className="text-xs text-yellow-500/70">
                  — Alterações serão sincronizadas quando a conexão voltar
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBanner(false)}
                className="text-yellow-500 hover:text-yellow-400 h-6 px-2"
              >
                Fechar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-2',
              !isOnline && 'text-yellow-500',
              className
            )}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isOnline ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <CloudOff className="h-4 w-4" />
            )}
            <span className="text-xs">
              {isSyncing ? 'Sincronizando' : isOnline ? 'Online' : 'Offline'}
            </span>
            {pendingActionsCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {pendingActionsCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {isOnline ? 'Conectado' : 'Offline'}
                  </p>
                  {lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Última sync: {lastSyncAt.toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={syncNow}
                disabled={isSyncing || !isOnline}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Pending Actions */}
            {pendingActionsCount > 0 && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {pendingActionsCount} ação(ões) pendente(s)
                  </span>
                </div>
              </div>
            )}

            {/* Cache Stats */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                Cache Local
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-lg font-bold">{stats.cachedAlertsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Alertas</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-lg font-bold">{stats.cachedCamerasCount}</p>
                  <p className="text-[10px] text-muted-foreground">Câmeras</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-lg font-bold">{stats.cachedPersonsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Pessoas</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <p className="text-[10px] text-muted-foreground text-center">
              {isOnline 
                ? 'Dados sincronizados automaticamente a cada 5 min'
                : 'Trabalhando com dados em cache local'
              }
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export default OfflineIndicator;
