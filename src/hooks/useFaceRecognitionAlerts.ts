/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceRecognitionAlerts
 * 
 * Integra reconhecimento facial com sistema de alertas:
 * - Monitoramento em tempo real de rostos
 * - Alertas automáticos para blacklist
 * - Notificações para VIPs
 * - Logging de reconhecimentos
 * - Estatísticas de presença
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFaceAPI, FaceDetection, FaceMatch } from './useFaceAPI';
import { useNotificationFlow } from './useNotificationFlow';
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
  uniquePeople: number;
  unknownFaces: number;
  blacklistAlerts: number;
  vipVisits: number;
  averageSimilarity: number;
}

export interface FaceRecognitionAlertsConfig {
  enabled: boolean;
  alertOnBlacklist: boolean;
  alertOnUnknown: boolean;
  notifyOnVIP: boolean;
  saveUnknownFaces: boolean;
  minSimilarityForMatch: number;
  cooldownSeconds: number;
  captureSnapshot: boolean;
  logAllRecognitions: boolean;
}

// ============================================
// CONFIGURAÇÃO PADRÃO
// ============================================

const DEFAULT_CONFIG: FaceRecognitionAlertsConfig = {
  enabled: true,
  alertOnBlacklist: true,
  alertOnUnknown: false,
  notifyOnVIP: true,
  saveUnknownFaces: true,
  minSimilarityForMatch: 0.6,
  cooldownSeconds: 60,
  captureSnapshot: true,
  logAllRecognitions: true,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseFaceRecognitionAlertsOptions {
  cameraId: string;
  cameraName: string;
  videoElement?: HTMLVideoElement | null;
  config?: Partial<FaceRecognitionAlertsConfig>;
  onRecognition?: (event: RecognitionEvent) => void;
  onBlacklistAlert?: (person: BlacklistPerson, event: RecognitionEvent) => void;
  onVIPDetected?: (person: VIPPerson, event: RecognitionEvent) => void;
}

interface UseFaceRecognitionAlertsReturn {
  isRunning: boolean;
  currentDetections: FaceDetection[];
  currentMatches: Map<string, FaceMatch>;
  recentEvents: RecognitionEvent[];
  stats: RecognitionStats;
  blacklist: BlacklistPerson[];
  vipList: VIPPerson[];
  
  // Controles
  start: () => void;
  stop: () => void;
  toggle: () => void;
  
  // Blacklist
  addToBlacklist: (personId: string, reason: string) => Promise<boolean>;
  removeFromBlacklist: (personId: string) => Promise<boolean>;
  
  // VIP
  addToVIP: (personId: string, welcomeMessage?: string) => Promise<boolean>;
  removeFromVIP: (personId: string) => Promise<boolean>;
  
  // Config
  config: FaceRecognitionAlertsConfig;
  updateConfig: (updates: Partial<FaceRecognitionAlertsConfig>) => void;
}

export function useFaceRecognitionAlerts(
  options: UseFaceRecognitionAlertsOptions
): UseFaceRecognitionAlertsReturn {
  const {
    cameraId,
    cameraName,
    videoElement,
    config: initialConfig,
    onRecognition,
    onBlacklistAlert,
    onVIPDetected,
  } = options;

  const { user } = useAuth();
  const { send: sendNotification } = useNotificationFlow();

  const [config, setConfig] = useState<FaceRecognitionAlertsConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentDetections, setCurrentDetections] = useState<FaceDetection[]>([]);
  const [currentMatches, setCurrentMatches] = useState<Map<string, FaceMatch>>(new Map());
  const [recentEvents, setRecentEvents] = useState<RecognitionEvent[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistPerson[]>([]);
  const [vipList, setVIPList] = useState<VIPPerson[]>([]);

  const lastRecognitionTime = useRef<Map<string, number>>(new Map());
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  // Usar hook de face-api
  const {
    modelsLoaded,
    detectFaces,
    matchAllFaces,
    extractDescriptor,
    registerFace,
  } = useFaceAPI({
    onFaceMatched: (match, face) => {
      handleFaceMatched(match, face);
    },
  });

  // Carregar blacklist
  const loadBlacklist = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('registered_persons')
        .select('id, name, notes, photo_url, created_at, user_id')
        .eq('status', 'blacklist');

      if (data) {
        setBlacklist(data.map(p => ({
          id: p.id,
          name: p.name,
          reason: p.notes || 'Sem motivo informado',
          photoUrl: p.photo_url,
          addedAt: new Date(p.created_at),
          addedBy: p.user_id || '',
          isActive: true,
        })));
      }
    } catch (err) {
      console.error('[FaceRecognition] Erro ao carregar blacklist:', err);
    }
  }, []);

  // Carregar VIPs
  const loadVIPList = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('registered_persons')
        .select('id, name, company, notes, photo_url')
        .eq('status', 'vip');

      if (data) {
        setVIPList(data.map(p => ({
          id: p.id,
          name: p.name,
          company: p.company,
          notes: p.notes,
          photoUrl: p.photo_url,
          welcomeMessage: `Bem-vindo(a), ${p.name}!`,
        })));
      }
    } catch (err) {
      console.error('[FaceRecognition] Erro ao carregar VIPs:', err);
    }
  }, []);

  // Carregar listas ao iniciar
  useEffect(() => {
    loadBlacklist();
    loadVIPList();
  }, [loadBlacklist, loadVIPList]);

  // Verificar cooldown
  const isInCooldown = useCallback((personId: string): boolean => {
    const lastTime = lastRecognitionTime.current.get(personId);
    if (!lastTime) return false;
    
    const elapsed = Date.now() - lastTime;
    return elapsed < config.cooldownSeconds * 1000;
  }, [config.cooldownSeconds]);

  // Capturar snapshot
  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    if (!videoElement || !config.captureSnapshot) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      return null;
    }
  }, [videoElement, config.captureSnapshot]);

  // Handler para face matched
  const handleFaceMatched = useCallback(async (
    match: FaceMatch, 
    face: FaceDetection
  ) => {
    if (!config.enabled) return;
    if (isInCooldown(match.personId)) return;

    // Atualizar tempo do último reconhecimento
    lastRecognitionTime.current.set(match.personId, Date.now());

    // Capturar snapshot
    const snapshot = await captureSnapshot();

    // Criar evento
    const event: RecognitionEvent = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cameraId,
      cameraName,
      personId: match.personId === 'unknown' ? null : match.personId,
      personName: match.personName,
      status: match.status,
      similarity: match.similarity,
      timestamp: new Date(),
      snapshotUrl: snapshot || undefined,
      alertCreated: false,
      notificationSent: false,
    };

    // Processar baseado no status
    if (match.status === 'blacklist' && config.alertOnBlacklist) {
      // ALERTA BLACKLIST
      const blacklistPerson = blacklist.find(p => p.id === match.personId);
      
      // Criar alerta
      try {
        await supabase.from('alerts').insert({
          camera_id: cameraId,
          type: 'blacklist',
          severity: 'critical',
          message: `Pessoa na blacklist detectada: ${match.personName}`,
          metadata: {
            personId: match.personId,
            personName: match.personName,
            similarity: match.similarity,
            reason: blacklistPerson?.reason,
          },
          snapshot_url: snapshot,
        });
        event.alertCreated = true;
      } catch (err) {
        console.error('[FaceRecognition] Erro ao criar alerta:', err);
      }

      // Enviar notificação
      await sendNotification({
        title: '🚨 ALERTA: Pessoa na Blacklist',
        message: `${match.personName} foi detectado na câmera ${cameraName}. Motivo: ${blacklistPerson?.reason || 'N/A'}`,
        severity: 'critical',
        type: 'blacklist',
        cameraId,
        cameraName,
        metadata: { personId: match.personId },
      });
      event.notificationSent = true;

      // Callback
      if (blacklistPerson) {
        onBlacklistAlert?.(blacklistPerson, event);
      }

      toast.error(`ALERTA: ${match.personName} está na blacklist!`, {
        duration: 10000,
      });

    } else if (match.status === 'vip' && config.notifyOnVIP) {
      // NOTIFICAÇÃO VIP
      const vipPerson = vipList.find(p => p.id === match.personId);

      // Registrar visita
      try {
        await supabase.from('recognition_logs').insert({
          camera_id: cameraId,
          person_id: match.personId,
          event_type: 'vip_arrival',
          similarity_score: match.similarity,
          snapshot_url: snapshot,
        });
      } catch (err) {
        console.error('[FaceRecognition] Erro ao registrar visita VIP:', err);
      }

      // Callback
      if (vipPerson) {
        onVIPDetected?.(vipPerson, event);
      }

      toast.success(`${vipPerson?.welcomeMessage || `Bem-vindo, ${match.personName}!`}`, {
        duration: 5000,
      });

    } else if (match.status === 'unknown' && config.alertOnUnknown) {
      // ROSTO DESCONHECIDO
      if (config.saveUnknownFaces && face.descriptor) {
        try {
          await supabase.from('unknown_faces').insert({
            camera_id: cameraId,
            face_encoding: Array.from(face.descriptor),
            snapshot_url: snapshot,
            detected_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[FaceRecognition] Erro ao salvar rosto desconhecido:', err);
        }
      }
    }

    // Log do reconhecimento
    if (config.logAllRecognitions && match.isMatch) {
      try {
        await supabase.from('recognition_logs').insert({
          camera_id: cameraId,
          person_id: match.personId === 'unknown' ? null : match.personId,
          event_type: 'recognition',
          similarity_score: match.similarity,
          snapshot_url: snapshot,
          metadata: {
            status: match.status,
            cameraName,
          },
        });
      } catch (err) {
        console.error('[FaceRecognition] Erro ao registrar log:', err);
      }
    }

    // Atualizar eventos recentes
    setRecentEvents(prev => [event, ...prev].slice(0, 50));

    // Callback
    onRecognition?.(event);
  }, [
    config, 
    cameraId, 
    cameraName, 
    blacklist, 
    vipList, 
    captureSnapshot, 
    isInCooldown,
    sendNotification,
    onRecognition,
    onBlacklistAlert,
    onVIPDetected,
  ]);

  // Loop de detecção
  const runDetection = useCallback(async () => {
    if (!videoElement || !modelsLoaded || !config.enabled) return;

    try {
      const detections = await detectFaces(videoElement);
      setCurrentDetections(detections);

      if (detections.length > 0) {
        const matches = await matchAllFaces(detections);
        setCurrentMatches(matches);
      } else {
        setCurrentMatches(new Map());
      }
    } catch (err) {
      console.error('[FaceRecognition] Erro no loop de detecção:', err);
    }
  }, [videoElement, modelsLoaded, config.enabled, detectFaces, matchAllFaces]);

  // Iniciar detecção
  const start = useCallback(() => {
    if (isRunning || !modelsLoaded) return;

    setIsRunning(true);
    detectionInterval.current = setInterval(runDetection, 500); // 2 FPS
    console.log(`[FaceRecognition] Iniciado para câmera ${cameraName}`);
  }, [isRunning, modelsLoaded, runDetection, cameraName]);

  // Parar detecção
  const stop = useCallback(() => {
    if (!isRunning) return;

    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }

    setIsRunning(false);
    setCurrentDetections([]);
    setCurrentMatches(new Map());
    console.log(`[FaceRecognition] Parado para câmera ${cameraName}`);
  }, [isRunning, cameraName]);

  // Toggle
  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Adicionar à blacklist
  const addToBlacklist = useCallback(async (
    personId: string, 
    reason: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ status: 'blacklist', notes: reason })
        .eq('id', personId);

      if (error) throw error;

      await loadBlacklist();
      toast.success('Pessoa adicionada à blacklist');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadBlacklist]);

  // Remover da blacklist
  const removeFromBlacklist = useCallback(async (personId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ status: 'active', notes: null })
        .eq('id', personId);

      if (error) throw error;

      await loadBlacklist();
      toast.success('Pessoa removida da blacklist');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadBlacklist]);

  // Adicionar como VIP
  const addToVIP = useCallback(async (
    personId: string, 
    welcomeMessage?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ status: 'vip', notes: welcomeMessage })
        .eq('id', personId);

      if (error) throw error;

      await loadVIPList();
      toast.success('Pessoa marcada como VIP');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadVIPList]);

  // Remover de VIP
  const removeFromVIP = useCallback(async (personId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .update({ status: 'active', notes: null })
        .eq('id', personId);

      if (error) throw error;

      await loadVIPList();
      toast.success('Status VIP removido');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadVIPList]);

  // Calcular estatísticas
  const stats: RecognitionStats = {
    totalRecognitions: recentEvents.length,
    uniquePeople: new Set(recentEvents.filter(e => e.personId).map(e => e.personId)).size,
    unknownFaces: recentEvents.filter(e => e.status === 'unknown').length,
    blacklistAlerts: recentEvents.filter(e => e.status === 'blacklist').length,
    vipVisits: recentEvents.filter(e => e.status === 'vip').length,
    averageSimilarity: recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + e.similarity, 0) / recentEvents.length
      : 0,
  };

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<FaceRecognitionAlertsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    isRunning,
    currentDetections,
    currentMatches,
    recentEvents,
    stats,
    blacklist,
    vipList,
    start,
    stop,
    toggle,
    addToBlacklist,
    removeFromBlacklist,
    addToVIP,
    removeFromVIP,
    config,
    updateConfig,
  };
}

export default useFaceRecognitionAlerts;
