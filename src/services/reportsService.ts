/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Reports Service - Geração de relatórios
 * 
 * @module services/reportsService
 */

import { supabase } from "@/integrations/supabase/client";
import type { Alert } from "./alertsService";
import type { Camera } from "./camerasService";

// ============================================
// TIPOS
// ============================================

export type ReportType = 'alerts' | 'cameras' | 'recognition' | 'analytics' | 'audit' | 'custom';
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  cameraIds?: string[];
  zoneIds?: string[];
  alertTypes?: string[];
  severities?: string[];
}

export interface AlertsSummary {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byCamera: Record<string, number>;
  timeline: { date: string; count: number }[];
}

export interface CameraStats {
  id: string;
  name: string;
  status: string;
  uptime?: number;
  alertCount?: number;
}

export interface RecognitionStats {
  total: number;
  successful: number;
  failed: number;
  averageConfidence: number;
  byType: Record<string, number>;
}

export interface ExportedReport<T = unknown> {
  type: ReportType;
  format: ExportFormat;
  data: T;
  filters: ReportFilters;
  generatedAt: string;
  generatedBy?: string;
}

// ============================================
// SERVICE
// ============================================

export const reportsService = {
  /**
   * Obter resumo de alertas
   */
  async getAlertsSummary(startDate: string, endDate: string): Promise<Alert[]> {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Obter estatísticas de câmeras
   */
  async getCameraStats(): Promise<CameraStats[]> {
    const { data, error } = await supabase
      .from("cameras")
      .select("id, name, status");
    
    if (error) throw error;
    return (data || []) as CameraStats[];
  },

  /**
   * Obter estatísticas de reconhecimento
   */
  async getRecognitionStats(startDate: string, endDate: string): Promise<RecognitionStats> {
    const { data, error } = await supabase
      .from("recognition_logs")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);
    
    if (error) throw error;
    
    const logs = data || [];
    const successful = logs.filter((l) => l.confidence >= 0.7).length;
    const avgConfidence = logs.length > 0
      ? logs.reduce((sum, l) => sum + (l.confidence || 0), 0) / logs.length
      : 0;
    
    const byType: Record<string, number> = {};
    logs.forEach((l) => {
      const type = l.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    return {
      total: logs.length,
      successful,
      failed: logs.length - successful,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      byType,
    };
  },

  /**
   * Exportar relatório
   */
  async exportReport<T>(
    type: ReportType,
    data: T,
    format: ExportFormat = 'json',
    filters?: ReportFilters
  ): Promise<ExportedReport<T>> {
    return {
      type,
      format,
      data,
      filters: filters || {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Gerar relatório completo de alertas
   */
  async generateAlertReport(filters: ReportFilters): Promise<AlertsSummary> {
    const alerts = await this.getAlertsSummary(filters.startDate, filters.endDate);
    
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byCamera: Record<string, number> = {};
    const byDate: Record<string, number> = {};
    
    alerts.forEach((alert) => {
      // Por severidade
      const sev = alert.severity || 'unknown';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      
      // Por tipo
      const type = alert.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
      
      // Por câmera
      const cam = alert.camera_id || 'unknown';
      byCamera[cam] = (byCamera[cam] || 0) + 1;
      
      // Por data
      const date = alert.created_at.split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });
    
    const timeline = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      total: alerts.length,
      bySeverity,
      byType,
      byCamera,
      timeline,
    };
  },
};

export default reportsService;
