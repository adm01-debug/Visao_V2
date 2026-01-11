/**
 * Offline Sync Hook
 * Manages data synchronization between offline cache and server
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  initOfflineDB,
  getPendingActions,
  removePendingAction,
  updatePendingActionRetries,
  cacheAlerts,
  getCachedAlerts,
  cacheCameras,
  getCachedCameras,
  cachePersons,
  getCachedPersons,
  addPendingAction,
  getStorageStats,
  type OfflineAction
} from '@/lib/offlineStorage';

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActionsCount: number;
  lastSyncAt: Date | null;
  syncError: string | null;
}

interface UseOfflineSyncReturn extends OfflineSyncState {
  // Data access
  getAlerts: () => Promise<unknown[]>;
  getCameras: () => Promise<unknown[]>;
  getPersons: () => Promise<unknown[]>;
  
  // Actions
  queueAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) => Promise<void>;
  syncNow: () => Promise<void>;
  refreshCache: () => Promise<void>;
  
  // Stats
  getStats: () => Promise<{
    pendingActionsCount: number;
    cachedAlertsCount: number;
    cachedCamerasCount: number;
    cachedPersonsCount: number;
  }>;
}

const MAX_RETRIES = 3;

export function useOfflineSync(): UseOfflineSyncReturn {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingActionsCount: 0,
    lastSyncAt: null,
    syncError: null
  });
  
  const syncingRef = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize DB on mount
  useEffect(() => {
    initOfflineDB().catch(console.error);
    updatePendingCount();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('Conexão restaurada', {
        description: 'Sincronizando dados...'
      });
      syncPendingActions();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast.warning('Você está offline', {
        description: 'Alterações serão sincronizadas quando a conexão voltar.'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker sync messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_ALERTS') {
        syncPendingActions();
      }
      if (event.data?.type === 'SYNC_ACTIONS') {
        syncPendingActions();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Periodic sync when online
  useEffect(() => {
    if (state.isOnline) {
      syncIntervalRef.current = setInterval(() => {
        refreshCache();
      }, 5 * 60 * 1000); // Every 5 minutes
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.isOnline]);

  const updatePendingCount = async () => {
    try {
      const actions = await getPendingActions();
      setState(prev => ({ ...prev, pendingActionsCount: actions.length }));
    } catch (error) {
}
  };

  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    
    syncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      const actions = await getPendingActions();
      let successCount = 0;
      let failCount = 0;

      for (const action of actions) {
        if (action.retries >= MAX_RETRIES) {
          // Remove after max retries
          await removePendingAction(action.id);
          failCount++;
          continue;
        }

        try {
          await executeSyncAction(action);
          await removePendingAction(action.id);
          successCount++;
        } catch (error) {
          await updatePendingActionRetries(action.id);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ação(ões) sincronizada(s)`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} ação(ões) falharam`);
      }

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        pendingActionsCount: failCount
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: (error as Error).message
      }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const executeSyncAction = async (action: OfflineAction): Promise<void> => {
    const { type, table, data } = action;

    switch (type) {
      case 'create':
        const { error: createError } = await supabase
          .from(table as 'alerts')
          .insert(data as never);
        if (createError) throw createError;
        break;

      case 'update':
        const { id: updateId, ...updateData } = data;
        const { error: updateError } = await supabase
          .from(table as 'alerts')
          .update(updateData as never)
          .eq('id', updateId as string);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table as 'alerts')
          .delete()
          .eq('id', data.id as string);
        if (deleteError) throw deleteError;
        break;
    }
  };

  const refreshCache = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      // Fetch and cache alerts
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (alerts) await cacheAlerts(alerts);

      // Fetch and cache cameras
      const { data: cameras } = await supabase
        .from('cameras')
        .select('*')
        .order('name');
      if (cameras) await cacheCameras(cameras);

      // Fetch and cache registered persons
      const { data: persons } = await supabase
        .from('registered_persons')
        .select('*')
        .order('name');
      if (persons) await cachePersons(persons);

      setState(prev => ({ ...prev, lastSyncAt: new Date() }));
    } catch (error) {
}
  }, []);

  const getAlerts = useCallback(async (): Promise<unknown[]> => {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);
        
        if (!error && data) {
          await cacheAlerts(data);
          return data;
        }
      } catch (error) {
}
    }
    
    return getCachedAlerts();
  }, []);

  const getCameras = useCallback(async (): Promise<unknown[]> => {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('*')
          .order('name');
        
        if (!error && data) {
          await cacheCameras(data);
          return data;
        }
      } catch (error) {
}
    }
    
    return getCachedCameras();
  }, []);

  const getPersons = useCallback(async (): Promise<unknown[]> => {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('registered_persons')
          .select('*')
          .order('name');
        
        if (!error && data) {
          await cachePersons(data);
          return data;
        }
      } catch (error) {
}
    }
    
    return getCachedPersons();
  }, []);

  const queueAction = useCallback(async (
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>
  ): Promise<void> => {
    if (navigator.onLine) {
      // Execute immediately when online
      await executeSyncAction({ 
        ...action, 
        id: '', 
        timestamp: Date.now(), 
        retries: 0 
      });
    } else {
      // Queue for later sync
      await addPendingAction(action);
      await updatePendingCount();
      toast.info('Ação salva offline', {
        description: 'Será sincronizada quando a conexão voltar.'
      });
    }
  }, []);

  const syncNow = useCallback(async () => {
    await syncPendingActions();
    await refreshCache();
  }, [syncPendingActions, refreshCache]);

  const getStats = useCallback(async () => {
    return getStorageStats();
  }, []);

  return {
    ...state,
    getAlerts,
    getCameras,
    getPersons,
    queueAction,
    syncNow,
    refreshCache,
    getStats
  };
}

export default useOfflineSync;
