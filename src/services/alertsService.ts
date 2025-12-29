/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Alerts Service - Gerenciamento de alertas
 * 
 * @module services/alertsService
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS
// ============================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertType = 'motion' | 'intrusion' | 'face' | 'plate' | 'ppe' | 'anomaly' | 'system' | 'custom';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  camera_id?: string;
  zone_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_clip_url?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AlertCreateInput {
  camera_id?: string;
  zone_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_clip_url?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertUpdateInput extends Partial<AlertCreateInput> {
  status?: AlertStatus;
  read?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export interface AlertFilters {
  camera_id?: string;
  zone_id?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  read?: boolean;
  startDate?: string;
  endDate?: string;
}

// ============================================
// SERVICE
// ============================================

export const alertsService = {
  /**
   * Buscar todos os alertas
   */
  async getAll(filters?: AlertFilters): Promise<Alert[]> {
    let query = supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters) {
      if (filters.camera_id) query = query.eq("camera_id", filters.camera_id);
      if (filters.zone_id) query = query.eq("zone_id", filters.zone_id);
      if (filters.type) query = query.eq("type", filters.type);
      if (filters.severity) query = query.eq("severity", filters.severity);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.read !== undefined) query = query.eq("read", filters.read);
      if (filters.startDate) query = query.gte("created_at", filters.startDate);
      if (filters.endDate) query = query.lte("created_at", filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Buscar alerta por ID
   */
  async getById(id: string): Promise<Alert> {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Criar novo alerta
   */
  async create(alert: AlertCreateInput): Promise<Alert> {
    const { data, error } = await supabase
      .from("alerts")
      .insert({
        ...alert,
        status: 'active',
        read: false,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Atualizar alerta existente
   */
  async update(id: string, alert: AlertUpdateInput): Promise<Alert> {
    const { data, error } = await supabase
      .from("alerts")
      .update(alert)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Deletar alerta
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  /**
   * Marcar alerta como lido
   */
  async markAsRead(id: string): Promise<Alert> {
    return this.update(id, { read: true });
  },

  /**
   * Marcar múltiplos alertas como lidos
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .in("id", ids);
    
    if (error) throw error;
  },

  /**
   * Reconhecer alerta
   */
  async acknowledge(id: string, userId: string): Promise<Alert> {
    return this.update(id, {
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    });
  },

  /**
   * Resolver alerta
   */
  async resolve(id: string, userId: string): Promise<Alert> {
    return this.update(id, {
      status: 'resolved',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    });
  },

  /**
   * Dispensar alerta
   */
  async dismiss(id: string): Promise<Alert> {
    return this.update(id, { status: 'dismissed' });
  },

  /**
   * Contar alertas não lidos
   */
  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("read", false);
    
    if (error) throw error;
    return count || 0;
  },

  /**
   * Contar alertas por severidade
   */
  async countBySeverity(): Promise<Record<AlertSeverity, number>> {
    const { data, error } = await supabase
      .from("alerts")
      .select("severity")
      .eq("status", "active");
    
    if (error) throw error;
    
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    
    data?.forEach((alert) => {
      if (alert.severity in counts) {
        counts[alert.severity]++;
      }
    });
    
    return counts as Record<AlertSeverity, number>;
  },

  /**
   * Buscar alertas recentes (últimas 24h)
   */
  async getRecent(limit = 10): Promise<Alert[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },
};

export default alertsService;
