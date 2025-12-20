/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: usePlateDetections
 * 
 * Hook para gerenciar detecções de placas com persistência no Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PlateDetection {
  id: string;
  plate: string;
  confidence: number;
  camera_id: string | null;
  camera_name: string;
  image_url: string | null;
  vehicle_type: string;
  status: 'authorized' | 'unauthorized' | 'unknown' | 'blacklist';
  direction: string | null;
  timestamp: Date;
  created_at: Date;
}

export interface RegisteredPlate {
  id: string;
  plate: string;
  owner_name: string | null;
  vehicle_type: string;
  color: string | null;
  notes: string | null;
  list_type: 'whitelist' | 'blacklist' | 'visitor';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PlateDetectionInsert {
  plate: string;
  confidence: number;
  camera_id?: string | null;
  camera_name: string;
  image_url?: string | null;
  vehicle_type?: string;
  status: string;
  direction?: string | null;
}

export interface RegisteredPlateInsert {
  plate: string;
  owner_name?: string;
  vehicle_type?: string;
  color?: string;
  notes?: string;
  list_type: 'whitelist' | 'blacklist' | 'visitor';
}

export function usePlateDetections() {
  const { user } = useAuth();
  const [detections, setDetections] = useState<PlateDetection[]>([]);
  const [registeredPlates, setRegisteredPlates] = useState<RegisteredPlate[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar detecções
  const fetchDetections = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('plate_detections')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) throw error;

      setDetections(data?.map(d => ({
        ...d,
        timestamp: new Date(d.timestamp),
        created_at: new Date(d.created_at),
        status: d.status as PlateDetection['status']
      })) || []);
    } catch (error) {
      console.error('Error fetching detections:', error);
    }
  }, [user]);

  // Carregar placas registradas
  const fetchRegisteredPlates = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('registered_plates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRegisteredPlates(data?.map(p => ({
        ...p,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at),
        list_type: p.list_type as RegisteredPlate['list_type']
      })) || []);
    } catch (error) {
      console.error('Error fetching registered plates:', error);
    }
  }, [user]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDetections(), fetchRegisteredPlates()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, fetchDetections, fetchRegisteredPlates]);

  // Verificar status da placa
  const checkPlateStatus = useCallback((plate: string): PlateDetection['status'] => {
    const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const registered = registeredPlates.find(
      p => p.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedPlate && p.is_active
    );
    
    if (!registered) return 'unknown';
    if (registered.list_type === 'blacklist') return 'blacklist';
    if (registered.list_type === 'whitelist') return 'authorized';
    return 'unknown';
  }, [registeredPlates]);

  // Adicionar detecção
  const addDetection = useCallback(async (detection: PlateDetectionInsert): Promise<PlateDetection | null> => {
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
          direction: detection.direction
        })
        .select()
        .single();

      if (error) throw error;

      const newDetection: PlateDetection = {
        ...data,
        timestamp: new Date(data.timestamp),
        created_at: new Date(data.created_at),
        status: data.status as PlateDetection['status']
      };

      setDetections(prev => [newDetection, ...prev].slice(0, 500));
      
      // Alertar se for blacklist
      if (status === 'blacklist') {
        toast.error(`ALERTA: Veículo na blacklist detectado! Placa: ${detection.plate}`);
      }

      return newDetection;
    } catch (error) {
      console.error('Error adding detection:', error);
      toast.error('Erro ao salvar detecção');
      return null;
    }
  }, [user, checkPlateStatus]);

  // Deletar detecção
  const deleteDetection = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('plate_detections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDetections(prev => prev.filter(d => d.id !== id));
      toast.success('Detecção removida');
    } catch (error) {
      console.error('Error deleting detection:', error);
      toast.error('Erro ao remover detecção');
    }
  }, []);

  // Adicionar placa registrada
  const addRegisteredPlate = useCallback(async (plate: RegisteredPlateInsert): Promise<RegisteredPlate | null> => {
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
          list_type: plate.list_type
        })
        .select()
        .single();

      if (error) throw error;

      const newPlate: RegisteredPlate = {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        list_type: data.list_type as RegisteredPlate['list_type']
      };

      setRegisteredPlates(prev => [newPlate, ...prev]);
      toast.success('Placa registrada com sucesso');

      return newPlate;
    } catch (error) {
      console.error('Error adding registered plate:', error);
      toast.error('Erro ao registrar placa');
      return null;
    }
  }, [user]);

  // Atualizar placa registrada
  const updateRegisteredPlate = useCallback(async (id: string, updates: Partial<RegisteredPlateInsert>) => {
    try {
      const { error } = await supabase
        .from('registered_plates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchRegisteredPlates();
      toast.success('Placa atualizada');
    } catch (error) {
      console.error('Error updating registered plate:', error);
      toast.error('Erro ao atualizar placa');
    }
  }, [fetchRegisteredPlates]);

  // Deletar placa registrada
  const deleteRegisteredPlate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('registered_plates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRegisteredPlates(prev => prev.filter(p => p.id !== id));
      toast.success('Placa removida');
    } catch (error) {
      console.error('Error deleting registered plate:', error);
      toast.error('Erro ao remover placa');
    }
  }, []);

  // Estatísticas
  const stats = {
    totalDetections: detections.length,
    todayDetections: detections.filter(d => {
      const today = new Date();
      return d.timestamp.toDateString() === today.toDateString();
    }).length,
    uniquePlates: new Set(detections.map(d => d.plate)).size,
    blacklistAlerts: detections.filter(d => d.status === 'blacklist').length,
    authorizedRate: detections.length > 0 
      ? (detections.filter(d => d.status === 'authorized').length / detections.length) * 100 
      : 0,
    avgConfidence: detections.length > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length * 100
      : 0
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
    refresh: () => Promise.all([fetchDetections(), fetchRegisteredPlates()])
  };
}
