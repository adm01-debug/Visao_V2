import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { mockCameras } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

export type DbCamera = Tables<'cameras'>;
export type DbCameraInsert = TablesInsert<'cameras'>;
export type DbCameraUpdate = TablesUpdate<'cameras'>;

export function useCameras() {
  const [cameras, setCameras] = useState<DbCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCameras(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar câmeras';
      setError(message);
      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  const seedCameras = async () => {
    if (!user) return;
    
    try {
      const { data: existingCameras } = await supabase
        .from('cameras')
        .select('id')
        .limit(1);

      if (existingCameras && existingCameras.length > 0) {
        return; // Already has data
      }

      const camerasToInsert: DbCameraInsert[] = mockCameras.map(c => ({
        name: c.name,
        location: c.location,
        status: c.status,
        detected_people: c.detectedPeople || 0,
        alerts_count: c.alerts || 0,
        last_activity: new Date().toISOString(),
        user_id: user.id,
      }));

      const { error } = await supabase
        .from('cameras')
        .insert(camerasToInsert);

      if (error) throw error;
      await fetchCameras();
      toast.success('Câmeras inicializadas com sucesso');
    } catch (err) {
      console.error('Error seeding cameras:', err);
    }
  };

  const createCamera = async (camera: Omit<DbCameraInsert, 'user_id'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      const { data, error } = await supabase
        .from('cameras')
        .insert({ ...camera, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setCameras(prev => [...prev, data]);
      toast.success('Câmera criada com sucesso');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar câmera';
      toast.error(message);
      throw err;
    }
  };

  const updateCamera = async (id: string, updates: DbCameraUpdate) => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCameras(prev => prev.map(c => c.id === id ? data : c));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar câmera';
      toast.error(message);
      throw err;
    }
  };

  const deleteCamera = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCameras(prev => prev.filter(c => c.id !== id));
      toast.success('Câmera excluída com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir câmera';
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchCameras().then(() => seedCameras());
    }
  }, [user]);

  return {
    cameras,
    loading,
    error,
    fetchCameras,
    createCamera,
    updateCamera,
    deleteCamera,
  };
}
