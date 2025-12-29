/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Zones Service - Gerenciamento de zonas de monitoramento
 * 
 * @module services/zonesService
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS
// ============================================

export type ZoneType = 'detection' | 'exclusion' | 'counting' | 'intrusion' | 'ppe' | 'custom';

export interface ZoneCoordinate {
  x: number;
  y: number;
}

export interface Zone {
  id: string;
  name: string;
  camera_id: string;
  type: ZoneType;
  coordinates: ZoneCoordinate[];
  color?: string;
  enabled: boolean;
  sensitivity?: number;
  min_object_size?: number;
  alert_on_enter?: boolean;
  alert_on_exit?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ZoneCreateInput {
  name: string;
  camera_id: string;
  type: ZoneType;
  coordinates: ZoneCoordinate[];
  color?: string;
  enabled?: boolean;
  sensitivity?: number;
  min_object_size?: number;
  alert_on_enter?: boolean;
  alert_on_exit?: boolean;
}

export interface ZoneUpdateInput extends Partial<ZoneCreateInput> {}

// ============================================
// SERVICE
// ============================================

export const zonesService = {
  /**
   * Buscar todas as zonas
   */
  async getAll(): Promise<Zone[]> {
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Buscar zona por ID
   */
  async getById(id: string): Promise<Zone> {
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Criar nova zona
   */
  async create(zone: ZoneCreateInput): Promise<Zone> {
    const { data, error } = await supabase
      .from("zones")
      .insert({
        ...zone,
        enabled: zone.enabled ?? true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Atualizar zona existente
   */
  async update(id: string, zone: ZoneUpdateInput): Promise<Zone> {
    const { data, error } = await supabase
      .from("zones")
      .update(zone)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Deletar zona
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("zones")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  /**
   * Buscar zonas por câmera
   */
  async getByCamera(cameraId: string): Promise<Zone[]> {
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("camera_id", cameraId)
      .order("name");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Ativar/desativar zona
   */
  async toggle(id: string, enabled: boolean): Promise<Zone> {
    return this.update(id, { enabled });
  },

  /**
   * Buscar zonas por tipo
   */
  async getByType(type: ZoneType): Promise<Zone[]> {
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("type", type)
      .order("name");
    
    if (error) throw error;
    return data || [];
  },
};

export default zonesService;
