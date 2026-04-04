/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useVehicles - Gerenciamento de veículos para ALPR
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type DbVehicle = Tables<'vehicles'>;
type DbPlateDetection = Tables<'plate_detections'>;

export type Vehicle = DbVehicle;
export type PlateDetection = DbPlateDetection;

export interface UseVehiclesReturn {
  vehicles: DbVehicle[];
  detections: DbPlateDetection[];
  isLoading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
  fetchDetections: (limit?: number) => Promise<void>;
  addVehicle: (vehicle: Omit<DbVehicle, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateVehicle: (id: string, vehicle: Partial<DbVehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  searchPlate: (query: string) => Promise<DbPlateDetection[]>;
  checkPlate: (plate: string) => DbVehicle | null;
}

export function useVehicles(): UseVehiclesReturn {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<DbVehicle[]>([]);
  const [detections, setDetections] = useState<DbPlateDetection[]>([]);
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
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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

  const addVehicle = useCallback(async (vehicle: Omit<DbVehicle, 'id' | 'created_at' | 'updated_at'>) => {
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
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehicles, toast]);

  const updateVehicle = useCallback(async (id: string, vehicle: Partial<DbVehicle>) => {
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
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVehicles, toast]);

  const searchPlate = useCallback(async (query: string): Promise<DbPlateDetection[]> => {
    try {
      const { data, error: searchError } = await supabase
        .from('plate_detections')
        .select('*')
        .ilike('plate', `%${query}%`)
        .order('timestamp', { ascending: false })
        .limit(50);
      
      if (searchError) throw searchError;
      return data || [];
    } catch {
      toast({ title: 'Erro na busca', variant: 'destructive' });
      return [];
    }
  }, [toast]);

  const checkPlate = useCallback((plate: string): DbVehicle | null => {
    const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return vehicles.find(v => 
      v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedPlate
    ) || null;
  }, [vehicles]);

  useEffect(() => {
    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchVehicles();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plate_detections' }, (payload) => {
        const newDetection = payload.new as DbPlateDetection;
        setDetections(prev => [newDetection, ...prev.slice(0, 99)]);
        
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
