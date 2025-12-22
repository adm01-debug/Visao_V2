/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceRecognitionAlerts
 * 
 * Integra reconhecimento facial com sistema de alertas (versão simplificada)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FaceDetection, FaceMatch } from './useFaceAPI';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export interface RecognitionEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  personId: string | null;
  personName: string;
  status: 'known' | 'unknown' | 'blacklist' | 'vip';
  similarity: number;
  timestamp: Date;
  snapshotUrl?: string;
  alertCreated: boolean;
  notificationSent: boolean;
}

export interface BlacklistPerson {
  id: string;
  name: string;
  reason: string;
  photoUrl?: string;
  addedAt: Date;
  addedBy: string;
  isActive: boolean;
}

export interface VIPPerson {
  id: string;
  name: string;
  company?: string;
  notes?: string;
  photoUrl?: string;
  welcomeMessage?: string;
}

export interface RecognitionStats {
  totalRecognitions: number;
  knownCount: number;
  unknownCount: number;
  blacklistAlerts: number;
  vipVisits: number;
  averageSimilarity: number;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseFaceRecognitionAlertsOptions {
  cameraId: string;
  cameraName: string;
  enabled?: boolean;
  alertOnBlacklist?: boolean;
  alertOnUnknown?: boolean;
  notifyOnVIP?: boolean;
  onBlacklistDetected?: (person: BlacklistPerson, event: RecognitionEvent) => void;
  onVIPDetected?: (person: VIPPerson, event: RecognitionEvent) => void;
  onRecognition?: (event: RecognitionEvent) => void;
}

interface UseFaceRecognitionAlertsReturn {
  events: RecognitionEvent[];
  blacklist: BlacklistPerson[];
  vipList: VIPPerson[];
  stats: RecognitionStats;
  isProcessing: boolean;
  processRecognition: (detection: FaceDetection, match: FaceMatch | null) => Promise<RecognitionEvent>;
  addToBlacklist: (personId: string, reason: string) => Promise<boolean>;
  removeFromBlacklist: (personId: string) => Promise<boolean>;
  addToVIPList: (personId: string, welcomeMessage?: string) => Promise<boolean>;
  removeFromVIPList: (personId: string) => Promise<boolean>;
  clearEvents: () => void;
  loadBlacklist: () => Promise<void>;
  loadVIPList: () => Promise<void>;
}

export function useFaceRecognitionAlerts(
  options: UseFaceRecognitionAlertsOptions
): UseFaceRecognitionAlertsReturn {
  const {
    cameraId,
    cameraName,
    onBlacklistDetected,
    onVIPDetected,
    onRecognition,
  } = options;

  const { user } = useAuth();

  const [events, setEvents] = useState<RecognitionEvent[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistPerson[]>([]);
  const [vipList, setVIPList] = useState<VIPPerson[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estatísticas calculadas
  const stats: RecognitionStats = {
    totalRecognitions: events.length,
    knownCount: events.filter(e => e.status === 'known').length,
    unknownCount: events.filter(e => e.status === 'unknown').length,
    blacklistAlerts: events.filter(e => e.status === 'blacklist').length,
    vipVisits: events.filter(e => e.status === 'vip').length,
    averageSimilarity: events.length > 0 
      ? events.reduce((acc, e) => acc + e.similarity, 0) / events.length 
      : 0,
  };

  // Carregar blacklist usando list_type
  const loadBlacklist = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('registered_persons')
        .select('id, name, notes, photo_url, created_at, user_id')
        .eq('list_type', 'blacklist');

      if (data) {
        setBlacklist(data.map(p => ({
          id: p.id,
          name: p.name,
          reason: p.notes || 'Sem motivo informado',
          photoUrl: p.photo_url || undefined,
          addedAt: new Date(p.created_at),
          addedBy: p.user_id || '',
          isActive: true,
        })));
      }
    } catch (err) {
      // error removed
    }
  }, []);

  // Carregar VIPs usando list_type
  const loadVIPList = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('registered_persons')
        .select('id, name, department, notes, photo_url')
        .eq('list_type', 'vip');

      if (data) {
        setVIPList(data.map(p => ({
          id: p.id,
          name: p.name,
          company: p.department || undefined,
          notes: p.notes || undefined,
          photoUrl: p.photo_url || undefined,
          welcomeMessage: `Bem-vindo(a), ${p.name}!`,
        })));
      }
    } catch (err) {
      // error removed
    }
  }, []);

  // Processar reconhecimento
  const processRecognition = useCallback(async (
    detection: FaceDetection,
    match: FaceMatch | null
  ): Promise<RecognitionEvent> => {
    setIsProcessing(true);

    const event: RecognitionEvent = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cameraId,
      cameraName,
      personId: match?.personId || null,
      personName: match?.personName || 'Desconhecido',
      status: match?.status || 'unknown',
      similarity: match?.similarity || 0,
      timestamp: new Date(),
      alertCreated: false,
      notificationSent: false,
    };

    // Verificar se é blacklist
    if (match?.status === 'blacklist') {
      const blacklistPerson = blacklist.find(b => b.id === match.personId);
      if (blacklistPerson) {
        event.alertCreated = true;
        onBlacklistDetected?.(blacklistPerson, event);
        toast.error(`⚠️ ALERTA: ${match.personName} detectado!`, {
          duration: 10000,
        });
      }
    }

    // Verificar se é VIP
    if (match?.status === 'vip') {
      const vipPerson = vipList.find(v => v.id === match.personId);
      if (vipPerson) {
        event.notificationSent = true;
        onVIPDetected?.(vipPerson, event);
        toast.success(`⭐ VIP: ${match.personName} chegou!`);
      }
    }

    // Adicionar evento
    setEvents(prev => [event, ...prev].slice(0, 100));
    onRecognition?.(event);

    // Registrar log
    if (user) {
      try {
        await supabase.from('recognition_logs').insert({
          camera_id: cameraId,
          person_id: match?.personId || null,
          recognized: match?.isMatch || false,
          confidence: match?.similarity || 0,
          user_id: user.id,
        });
      } catch (err) {
        // error removed
      }
    }

    setIsProcessing(false);
    return event;
  }, [cameraId, cameraName, blacklist, vipList, user, onBlacklistDetected, onVIPDetected, onRecognition]);

  // Adicionar à blacklist
  const addToBlacklist = useCallback(async (personId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ list_type: 'blacklist', notes: reason })
        .eq('id', personId);

      if (error) throw error;

      await loadBlacklist();
      toast.success('Pessoa adicionada à blacklist');
      return true;
    } catch (err) {
      // error removed
      toast.error('Erro ao adicionar à blacklist');
      return false;
    }
  }, [loadBlacklist]);

  // Remover da blacklist
  const removeFromBlacklist = useCallback(async (personId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ list_type: null })
        .eq('id', personId);

      if (error) throw error;

      await loadBlacklist();
      toast.success('Pessoa removida da blacklist');
      return true;
    } catch (err) {
      // error removed
      toast.error('Erro ao remover da blacklist');
      return false;
    }
  }, [loadBlacklist]);

  // Adicionar à lista VIP
  const addToVIPList = useCallback(async (personId: string, _welcomeMessage?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ list_type: 'vip' })
        .eq('id', personId);

      if (error) throw error;

      await loadVIPList();
      toast.success('Pessoa adicionada à lista VIP');
      return true;
    } catch (err) {
      // error removed
      toast.error('Erro ao adicionar à lista VIP');
      return false;
    }
  }, [loadVIPList]);

  // Remover da lista VIP
  const removeFromVIPList = useCallback(async (personId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ list_type: null })
        .eq('id', personId);

      if (error) throw error;

      await loadVIPList();
      toast.success('Pessoa removida da lista VIP');
      return true;
    } catch (err) {
      // error removed
      toast.error('Erro ao remover da lista VIP');
      return false;
    }
  }, [loadVIPList]);

  // Limpar eventos
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    blacklist,
    vipList,
    stats,
    isProcessing,
    processRecognition,
    addToBlacklist,
    removeFromBlacklist,
    addToVIPList,
    removeFromVIPList,
    clearEvents,
    loadBlacklist,
    loadVIPList,
  };
}

export default useFaceRecognitionAlerts;
