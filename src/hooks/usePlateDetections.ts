/**
 * VISÃO - usePlateDetections (Refactored)
 * Types extracted to ./plate-detections/plateDetectionTypes.ts
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { playCriticalAlertSound } from '@/lib/alertSounds';
import {
  PlateDetection,
  RegisteredPlate,
  PlateDetectionInsert,
  RegisteredPlateInsert,
  TelegramConfig,
  TELEGRAM_CONFIG_KEY,
  ALERT_COOLDOWN_MS,
} from './plate-detections/plateDetectionTypes';

// Re-export types
export type { PlateDetection, RegisteredPlate, PlateDetectionInsert, RegisteredPlateInsert };

export function usePlateDetections() {
  const { user } = useAuth();
  const [detections, setDetections] = useState<PlateDetection[]>([]);
  const [registeredPlates, setRegisteredPlates] = useState<RegisteredPlate[]>([]);
  const [loading, setLoading] = useState(true);
  const lastAlertTime = useRef<Map<string, number>>(new Map());

  const fetchDetections = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('plate_detections')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      if (error) throw error;
      setDetections(
        data?.map((d) => ({
          ...d,
          vehicle_type: d.vehicle_type || 'unknown',
          timestamp: new Date(d.timestamp),
          created_at: new Date(d.created_at),
          status: d.status as PlateDetection['status'],
        })) || []
      );
    } catch {
      /* handled */
    }
  }, [user]);

  const fetchRegisteredPlates = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('registered_plates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRegisteredPlates(
        data?.map((p) => ({
          ...p,
          vehicle_type: p.vehicle_type || 'car',
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at),
          list_type: p.list_type as RegisteredPlate['list_type'],
        })) || []
      );
    } catch {
      /* handled */
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchDetections(), fetchRegisteredPlates()]).then(() => setLoading(false));
    }
  }, [user, fetchDetections, fetchRegisteredPlates]);

  const checkPlateStatus = useCallback(
    (plate: string): PlateDetection['status'] => {
      const norm = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const reg = registeredPlates.find(
        (p) => p.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === norm && p.is_active
      );
      if (!reg) return 'unknown';
      if (reg.list_type === 'blacklist') return 'blacklist';
      if (reg.list_type === 'whitelist') return 'authorized';
      return 'unknown';
    },
    [registeredPlates]
  );

  const sendBlacklistTelegramAlert = useCallback(
    async (plate: string, cameraName: string, ownerName?: string, imageUrl?: string) => {
      const now = Date.now();
      const last = lastAlertTime.current.get(plate);
      if (last && now - last < ALERT_COOLDOWN_MS) return;
      lastAlertTime.current.set(plate, now);
      const configStr = localStorage.getItem(TELEGRAM_CONFIG_KEY);
      if (!configStr) return;
      try {
        const config: TelegramConfig = JSON.parse(configStr);
        if (!config.enabled || !config.botToken || !config.chatId) return;
        const msg = ownerName
          ? `Veículo na blacklist detectado: ${plate} (Proprietário: ${ownerName})`
          : `Veículo na blacklist detectado: ${plate}`;
        await supabase.functions.invoke('send-alert-notification', {
          body: {
            alertId: `alpr-${plate}-${Date.now()}`,
            type: 'security',
            severity: 'critical' as const,
            message: msg,
            cameraName,
            timestamp: new Date().toISOString(),
            snapshotUrl: imageUrl,
            channels: ['telegram'],
            telegram: { botToken: config.botToken, chatId: config.chatId },
          },
        });
      } catch {
        /* silently fail */
      }
    },
    []
  );

  const addDetection = useCallback(
    async (detection: PlateDetectionInsert): Promise<PlateDetection | null> => {
      if (!user) {
        toast.error('Usuário não autenticado');
        return null;
      }
      try {
        const status = checkPlateStatus(detection.plate);
        const { data, error } = await supabase
          .from('plate_detections')
          .insert({
            user_id: user.id,
            plate: detection.plate.toUpperCase(),
            confidence: detection.confidence,
            camera_id: detection.camera_id,
            camera_name: detection.camera_name,
            image_url: detection.image_url,
            vehicle_type: detection.vehicle_type || 'unknown',
            status,
            direction: detection.direction,
          })
          .select()
          .single();
        if (error) throw error;
        const newDet: PlateDetection = {
          ...data,
          vehicle_type: data.vehicle_type || 'unknown',
          timestamp: new Date(data.timestamp),
          created_at: new Date(data.created_at),
          status: data.status as PlateDetection['status'],
        };
        setDetections((prev) => [newDet, ...prev].slice(0, 500));
        if (status === 'blacklist') {
          playCriticalAlertSound();
          toast.error(`🚨 ALERTA: Veículo na blacklist detectado! Placa: ${detection.plate}`, {
            duration: 15000,
          });
          const reg = registeredPlates.find(
            (p) =>
              p.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') ===
              detection.plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
          );
          sendBlacklistTelegramAlert(
            detection.plate,
            detection.camera_name,
            reg?.owner_name || undefined,
            detection.image_url || undefined
          );
          await supabase.from('alerts').insert({
            type: 'security',
            severity: 'critical',
            camera_name: detection.camera_name,
            camera_id: detection.camera_id,
            message: `Veículo na blacklist detectado: ${detection.plate}`,
            thumbnail: detection.image_url,
            user_id: user.id,
          });
        }
        return newDet;
      } catch {
        toast.error('Erro ao salvar detecção');
        return null;
      }
    },
    [user, checkPlateStatus, registeredPlates, sendBlacklistTelegramAlert]
  );

  const deleteDetection = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('plate_detections').delete().eq('id', id);
      if (error) throw error;
      setDetections((prev) => prev.filter((d) => d.id !== id));
      toast.success('Detecção removida');
    } catch {
      toast.error('Erro ao remover detecção');
    }
  }, []);

  const addRegisteredPlate = useCallback(
    async (plate: RegisteredPlateInsert): Promise<RegisteredPlate | null> => {
      if (!user) {
        toast.error('Usuário não autenticado');
        return null;
      }
      try {
        const { data, error } = await supabase
          .from('registered_plates')
          .insert({
            user_id: user.id,
            plate: plate.plate.toUpperCase(),
            owner_name: plate.owner_name,
            vehicle_type: plate.vehicle_type || 'car',
            color: plate.color,
            notes: plate.notes,
            list_type: plate.list_type,
          })
          .select()
          .single();
        if (error) throw error;
        const np: RegisteredPlate = {
          ...data,
          vehicle_type: data.vehicle_type || 'car',
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
          list_type: data.list_type as RegisteredPlate['list_type'],
        };
        setRegisteredPlates((prev) => [np, ...prev]);
        toast.success('Placa registrada com sucesso');
        return np;
      } catch {
        toast.error('Erro ao registrar placa');
        return null;
      }
    },
    [user]
  );

  const updateRegisteredPlate = useCallback(
    async (id: string, updates: Partial<RegisteredPlateInsert>) => {
      try {
        const { error } = await supabase.from('registered_plates').update(updates).eq('id', id);
        if (error) throw error;
        await fetchRegisteredPlates();
        toast.success('Placa atualizada');
      } catch {
        toast.error('Erro ao atualizar placa');
      }
    },
    [fetchRegisteredPlates]
  );

  const deleteRegisteredPlate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('registered_plates').delete().eq('id', id);
      if (error) throw error;
      setRegisteredPlates((prev) => prev.filter((p) => p.id !== id));
      toast.success('Placa removida');
    } catch {
      toast.error('Erro ao remover placa');
    }
  }, []);

  const stats = {
    totalDetections: detections.length,
    todayDetections: detections.filter(
      (d) => d.timestamp.toDateString() === new Date().toDateString()
    ).length,
    uniquePlates: new Set(detections.map((d) => d.plate)).size,
    blacklistAlerts: detections.filter((d) => d.status === 'blacklist').length,
    authorizedRate:
      detections.length > 0
        ? (detections.filter((d) => d.status === 'authorized').length / detections.length) * 100
        : 0,
    avgConfidence:
      detections.length > 0
        ? (detections.reduce((s, d) => s + d.confidence, 0) / detections.length) * 100
        : 0,
  };

  return {
    detections,
    registeredPlates,
    loading,
    stats,
    addDetection,
    deleteDetection,
    addRegisteredPlate,
    updateRegisteredPlate,
    deleteRegisteredPlate,
    checkPlateStatus,
    refresh: () => Promise.all([fetchDetections(), fetchRegisteredPlates()]),
  };
}
