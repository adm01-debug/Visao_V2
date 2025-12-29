/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Cameras Service - Gerenciamento de câmeras
 * 
 * @module services/camerasService
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS
// ============================================

export interface Camera {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'recording' | 'error';
  location?: string;
  zone_id?: string;
  rtsp_url?: string;
  hls_url?: string;
  thumbnail_url?: string;
  resolution?: string;
  fps?: number;
  recording_enabled?: boolean;
  motion_detection?: boolean;
  ai_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CameraCreateInput {
  name: string;
  url: string;
  status?: Camera['status'];
  location?: string;
  zone_id?: string;
  rtsp_url?: string;
  hls_url?: string;
  resolution?: string;
  fps?: number;
  recording_enabled?: boolean;
  motion_detection?: boolean;
  ai_enabled?: boolean;
}

export interface CameraUpdateInput extends Partial<CameraCreateInput> {
  thumbnail_url?: string;
}

// ============================================
// SERVICE
// ============================================

export const camerasService = {
  /**
   * Buscar todas as câmeras
   */
  async getAll(): Promise<Camera[]> {
    const { data, error } = await supabase
      .from("cameras")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Buscar câmera por ID
   */
  async getById(id: string): Promise<Camera> {
    const { data, error } = await supabase
      .from("cameras")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Criar nova câmera
   */
  async create(camera: CameraCreateInput): Promise<Camera> {
    const { data, error } = await supabase
      .from("cameras")
      .insert(camera)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Atualizar câmera existente
   */
  async update(id: string, camera: CameraUpdateInput): Promise<Camera> {
    const { data, error } = await supabase
      .from("cameras")
      .update(camera)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Deletar câmera
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("cameras")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  /**
   * Buscar câmeras online
   */
  async getOnline(): Promise<Camera[]> {
    const { data, error } = await supabase
      .from("cameras")
      .select("*")
      .eq("status", "online");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Atualizar status da câmera
   */
  async updateStatus(id: string, status: Camera['status']): Promise<Camera> {
    return this.update(id, { status });
  },

  /**
   * Buscar câmeras por zona
   */
  async getByZone(zoneId: string): Promise<Camera[]> {
    const { data, error } = await supabase
      .from("cameras")
      .select("*")
      .eq("zone_id", zoneId)
      .order("name");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Contar câmeras por status
   */
  async countByStatus(): Promise<Record<Camera['status'], number>> {
    const { data, error } = await supabase
      .from("cameras")
      .select("status");
    
    if (error) throw error;
    
    const counts: Record<string, number> = {
      online: 0,
      offline: 0,
      recording: 0,
      error: 0,
    };
    
    data?.forEach((camera) => {
      if (camera.status in counts) {
        counts[camera.status]++;
      }
    });
    
    return counts as Record<Camera['status'], number>;
  },
};

export default camerasService;
