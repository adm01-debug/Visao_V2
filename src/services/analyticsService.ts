/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Analytics Service - Análises e métricas do sistema
 * 
 * @module services/analyticsService
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS
// ============================================

export interface AlertsByTypeResult {
  [type: string]: number;
}

export interface AlertByCameraResult {
  camera_id: string;
  cameras: {
    name: string;
  } | null;
  count?: number;
}

export interface AlertTrendPoint {
  date: string;
  count: number;
}

export interface RecognitionRateResult {
  total: number;
  successful: number;
  failed: number;
  rate: number;
  averageConfidence: number;
}

export interface DashboardMetrics {
  totalAlerts: number;
  totalCameras: number;
  onlineCameras: number;
  recognitionRate: number;
  alertsTrend: AlertTrendPoint[];
}

// ============================================
// SERVICE
// ============================================

export const analyticsService = {
  /**
   * Agrupar alertas por tipo
   */
  async getAlertsByType(): Promise<AlertsByTypeResult> {
    const { data, error } = await supabase
      .from("alerts")
      .select("type");
    
    if (error) throw error;
    
    const grouped: AlertsByTypeResult = {};
    data?.forEach((alert) => {
      const type = alert.type || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    
    return grouped;
  },

  /**
   * Agrupar alertas por câmera
   */
  async getAlertsByCamera(): Promise<AlertByCameraResult[]> {
    const { data, error } = await supabase
      .from("alerts")
      .select("camera_id, cameras(name)");
    
    if (error) throw error;
    
    // Agrupar e contar
    const grouped: Record<string, AlertByCameraResult> = {};
    data?.forEach((alert) => {
      const camId = alert.camera_id || 'unknown';
      if (!grouped[camId]) {
        grouped[camId] = {
          camera_id: camId,
          cameras: alert.cameras,
          count: 0,
        };
      }
      grouped[camId].count = (grouped[camId].count || 0) + 1;
    });
    
    return Object.values(grouped).sort((a, b) => (b.count || 0) - (a.count || 0));
  },

  /**
   * Obter tendência de alertas nos últimos N dias
   */
  async getAlertsTrend(days: number = 7): Promise<AlertTrendPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from("alerts")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    
    // Agrupar por dia
    const byDay: Record<string, number> = {};
    data?.forEach((alert) => {
      const date = alert.created_at.split('T')[0];
      byDay[date] = (byDay[date] || 0) + 1;
    });
    
    // Preencher dias sem alertas
    const result: AlertTrendPoint[] = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: byDay[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  },

  /**
   * Calcular taxa de reconhecimento
   */
  async getRecognitionRate(): Promise<RecognitionRateResult> {
    const { data, error } = await supabase
      .from("recognition_logs")
      .select("confidence");
    
    if (error) throw error;
    
    const logs = data || [];
    const total = logs.length;
    
    if (total === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        rate: 0,
        averageConfidence: 0,
      };
    }
    
    const successful = logs.filter((l) => (l.confidence || 0) >= 0.7).length;
    const avgConfidence = logs.reduce((sum, l) => sum + (l.confidence || 0), 0) / total;
    
    return {
      total,
      successful,
      failed: total - successful,
      rate: Math.round((successful / total) * 100),
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    };
  },

  /**
   * Obter métricas do dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [alertsCount, camerasData, recognitionRate, alertsTrend] = await Promise.all([
      supabase.from("alerts").select("*", { count: "exact", head: true }),
      supabase.from("cameras").select("status"),
      this.getRecognitionRate(),
      this.getAlertsTrend(7),
    ]);
    
    const totalCameras = camerasData.data?.length || 0;
    const onlineCameras = camerasData.data?.filter((c) => c.status === 'online').length || 0;
    
    return {
      totalAlerts: alertsCount.count || 0,
      totalCameras,
      onlineCameras,
      recognitionRate: recognitionRate.rate,
      alertsTrend,
    };
  },

  /**
   * Obter horários de pico de alertas
   */
  async getPeakHours(days: number = 30): Promise<Record<number, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from("alerts")
      .select("created_at")
      .gte("created_at", startDate.toISOString());
    
    if (error) throw error;
    
    const byHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      byHour[i] = 0;
    }
    
    data?.forEach((alert) => {
      const hour = new Date(alert.created_at).getHours();
      byHour[hour]++;
    });
    
    return byHour;
  },
};

export default analyticsService;
