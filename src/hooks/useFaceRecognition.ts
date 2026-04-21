/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceRecognition - Gerenciamento de reconhecimento facial
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KnownFace {
  id: string;
  name: string;
  document?: string;
  list_type: 'whitelist' | 'blacklist' | 'vip' | 'unknown';
  notes?: string;
  image_url?: string;
  encoding?: number[];
  created_at: string;
  last_seen?: string;
  detection_count: number;
}

export interface FaceDetection {
  id: string;
  camera_id: string;
  camera_name: string;
  person_id?: string;
  person_name?: string;
  confidence: number;
  timestamp: string;
  image_url?: string;
  is_known: boolean;
  list_type?: string;
}

export interface UseFaceRecognitionReturn {
  knownFaces: KnownFace[];
  detections: FaceDetection[];
  isLoading: boolean;
  error: string | null;
  fetchKnownFaces: () => Promise<void>;
  fetchDetections: (limit?: number) => Promise<void>;
  addPerson: (person: Omit<KnownFace, 'id' | 'created_at' | 'detection_count'>) => Promise<boolean>;
  updatePerson: (id: string, person: Partial<KnownFace>) => Promise<boolean>;
  deletePerson: (id: string) => Promise<boolean>;
  uploadFaceImage: (file: File) => Promise<string | null>;
  searchPerson: (query: string) => KnownFace[];
  getBlacklist: () => KnownFace[];
  getWhitelist: () => KnownFace[];
  getVIPs: () => KnownFace[];
}

export function useFaceRecognition(): UseFaceRecognitionReturn {
  const { toast } = useToast();
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [detections, setDetections] = useState<FaceDetection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKnownFaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('known_faces' as never)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setKnownFaces(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar faces';
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
        .from('face_detections' as never)
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

  const uploadFaceImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `faces/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('faces' as never)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('faces' as never).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (_err) {
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível fazer upload da imagem',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const addPerson = useCallback(async (person: Omit<KnownFace, 'id' | 'created_at' | 'detection_count'>) => {
    setIsLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('known_faces' as never)
        .insert([{ ...person, detection_count: 0 }] as never);
      
      if (insertError) throw insertError;
      
      toast({ title: 'Pessoa cadastrada com sucesso!' });
      await fetchKnownFaces();
      return true;
    } catch (_err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar pessoa',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKnownFaces, toast]);

  const updatePerson = useCallback(async (id: string, person: Partial<KnownFace>) => {
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('known_faces' as never)
        .update(person as never)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast({ title: 'Pessoa atualizada com sucesso!' });
      await fetchKnownFaces();
      return true;
    } catch (_err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar pessoa',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKnownFaces, toast]);

  const deletePerson = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('known_faces' as never)
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      toast({ title: 'Pessoa excluída com sucesso!' });
      await fetchKnownFaces();
      return true;
    } catch (_err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir pessoa',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKnownFaces, toast]);

  const searchPerson = useCallback((query: string): KnownFace[] => {
    const lowerQuery = query.toLowerCase();
    return knownFaces.filter(f => 
      f.name.toLowerCase().includes(lowerQuery) ||
      f.document?.toLowerCase().includes(lowerQuery)
    );
  }, [knownFaces]);

  const getBlacklist = useCallback(() => 
    knownFaces.filter(f => f.list_type === 'blacklist'), [knownFaces]);
  
  const getWhitelist = useCallback(() => 
    knownFaces.filter(f => f.list_type === 'whitelist'), [knownFaces]);
  
  const getVIPs = useCallback(() => 
    knownFaces.filter(f => f.list_type === 'vip'), [knownFaces]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('faces-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'known_faces' }, () => {
        fetchKnownFaces();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'face_detections' }, (payload) => {
        const detection = payload.new as FaceDetection;
        setDetections(prev => [detection, ...prev.slice(0, 99)]);
        
        // Alert for blacklisted person
        if (detection.list_type === 'blacklist') {
          toast({
            title: '🚨 ALERTA: Pessoa Bloqueada!',
            description: `${detection.person_name || 'Pessoa desconhecida'} detectada`,
            variant: 'destructive'
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKnownFaces, toast]);

  return {
    knownFaces,
    detections,
    isLoading,
    error,
    fetchKnownFaces,
    fetchDetections,
    addPerson,
    updatePerson,
    deletePerson,
    uploadFaceImage,
    searchPerson,
    getBlacklist,
    getWhitelist,
    getVIPs
  };
}
