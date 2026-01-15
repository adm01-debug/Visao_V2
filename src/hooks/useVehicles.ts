/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useVehicles - Gerenciamento de veículos para ALPR
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Vehicle {
  id: string;
  plate: string;
  owner: string;
  model: string;
  color: string;
  type: 'whitelist' | 'blacklist' | 'visitor';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PlateDetection {
  id: string;
  plate: string;
  camera_id: string;
  camera_name: string;
  confidence: number;
  timestamp: string;
  image_url?: string;
  is_blacklisted: boolean;
}

export interface UseVehiclesReturn {
  vehicles: Vehicle[];
  detections: PlateDetection[];
  isLoading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
  fetchDetections: (limit?: number) => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<boolean>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  searchPlate: (query: string) => Promise<PlateDetection[]>;
  checkPlate: (plate: string) => Vehicle | null;
}

export function useVehicles(): UseVehiclesReturn {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [detections, setDetections] = useState<PlateDetection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setVehicles(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar veículos';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchDetections = useCallback(async (limit = 100) => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('plate_detections')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (fetchError) throw fetchError;
      setDetections(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar detecções';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addVehicle = useCallback(async (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => {
    setIsLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert([vehicle]);
      
      if (insertError) throw insertError;
      
      toast({ title: 'Veículo cadastrado com sucesso!' });
      await fetchVehicles();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cadastrar veículo';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehicles, toast]);

  const updateVehicle = useCallback(async (id: string, vehicle: Partial<Vehicle>) => {
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(vehicle)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast({ title: 'Veículo atualizado com sucesso!' });
      await fetchVehicles();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar veículo';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehicles, toast]);

  const deleteVehicle = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      toast({ title: 'Veículo excluído com sucesso!' });
      await fetchVehicles();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir veículo';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehicles, toast]);

  const searchPlate = useCallback(async (query: string): Promise<PlateDetection[]> => {
    try {
      const { data, error: searchError } = await supabase
        .from('plate_detections')
        .select('*')
        .ilike('plate', `%${query}%`)
        .order('timestamp', { ascending: false })
        .limit(50);
      
      if (searchError) throw searchError;
      return data || [];
    } catch (err) {
      toast({
        title: 'Erro na busca',
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  const checkPlate = useCallback((plate: string): Vehicle | null => {
    const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return vehicles.find(v => 
      v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedPlate
    ) || null;
  }, [vehicles]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchVehicles();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plate_detections' }, (payload) => {
        const newDetection = payload.new as PlateDetection;
        setDetections(prev => [newDetection, ...prev.slice(0, 99)]);
        
        // Check if blacklisted
        const vehicle = checkPlate(newDetection.plate);
        if (vehicle?.type === 'blacklist') {
          toast({
            title: '🚨 ALERTA: Veículo Bloqueado!',
            description: `Placa ${newDetection.plate} detectada`,
            variant: 'destructive'
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVehicles, checkPlate, toast]);

  return {
    vehicles,
    detections,
    isLoading,
    error,
    fetchVehicles,
    fetchDetections,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    searchPlate,
    checkPlate
  };
}
