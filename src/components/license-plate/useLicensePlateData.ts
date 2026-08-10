import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Vehicle {
  id: string;
  plate: string;
  owner_name: string | null;
  vehicle_type: string | null;
  color: string | null;
  list_type: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface PlateDetection {
  id: string;
  plate: string;
  camera_id: string | null;
  camera_name: string;
  confidence: number;
  timestamp: string;
  image_url?: string | null;
  is_blacklisted?: boolean;
  [key: string]: unknown;
}

export interface VehicleFormData {
  plate: string;
  owner_name: string;
  vehicle_type: string;
  color: string;
  list_type: string;
  notes: string;
}

const DEFAULT_FORM: VehicleFormData = {
  plate: '',
  owner_name: '',
  vehicle_type: 'car',
  color: '',
  list_type: 'whitelist',
  notes: '',
};

export function useLicensePlateData() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [detections, setDetections] = useState<PlateDetection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(DEFAULT_FORM);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('registered_plates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles(data ?? []);
    } catch {
      toast({ title: 'Erro ao carregar veículos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchDetections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plate_detections')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (error) throw error;
      setDetections(data ?? []);
    } catch {
      toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    fetchVehicles();
    fetchDetections();
  }, [fetchVehicles, fetchDetections]);

  const handleSaveVehicle = async () => {
    try {
      if (editingVehicle) {
        const { error } = await supabase
          .from('registered_plates')
          .update({
            plate: formData.plate,
            owner_name: formData.owner_name || null,
            vehicle_type: formData.vehicle_type,
            color: formData.color || null,
            list_type: formData.list_type,
            notes: formData.notes || null,
          })
          .eq('id', editingVehicle.id);
        if (error) throw error;
        toast({ title: 'Veículo atualizado com sucesso!' });
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from('registered_plates').insert([
          {
            plate: formData.plate,
            owner_name: formData.owner_name || null,
            vehicle_type: formData.vehicle_type,
            color: formData.color || null,
            list_type: formData.list_type,
            notes: formData.notes || null,
            user_id: user?.id ?? '',
          },
        ]);
        if (error) throw error;
        toast({ title: 'Veículo cadastrado com sucesso!' });
      }
      setIsAddDialogOpen(false);
      setEditingVehicle(null);
      setFormData(DEFAULT_FORM);
      fetchVehicles();
    } catch {
      toast({ title: 'Erro ao salvar veículo', variant: 'destructive' });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    try {
      const { error } = await supabase.from('registered_plates').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Veículo excluído com sucesso!' });
      fetchVehicles();
    } catch {
      toast({ title: 'Erro ao excluir veículo', variant: 'destructive' });
    }
  };

  const handleSearchDetections = async (query: string) => {
    if (!query.trim()) {
      fetchDetections();
      return;
    }
    try {
      const { data, error } = await supabase
        .from('plate_detections')
        .select('*')
        .ilike('plate', `%${query}%`)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      setDetections(data ?? []);
    } catch {
      toast({ title: 'Erro na busca', variant: 'destructive' });
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate: vehicle.plate,
      owner_name: vehicle.owner_name ?? '',
      vehicle_type: vehicle.vehicle_type ?? 'car',
      color: vehicle.color ?? '',
      list_type: vehicle.list_type,
      notes: vehicle.notes ?? '',
    });
    setIsAddDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormData(DEFAULT_FORM);
    setEditingVehicle(null);
    setIsAddDialogOpen(true);
  };

  return {
    vehicles,
    detections,
    isLoading,
    isAddDialogOpen,
    setIsAddDialogOpen,
    editingVehicle,
    formData,
    setFormData,
    fetchVehicles,
    fetchDetections,
    handleSaveVehicle,
    handleDeleteVehicle,
    handleSearchDetections,
    openEditDialog,
    openAddDialog,
  };
}
