/**
 * VISÃO - Hook para histórico de análises em tempo real
 *
 * Carrega dados recentes de analysis_history + alerts e
 * se inscreve via Supabase Realtime para atualizações live.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export interface TimelineItem {
  id: string;
  type: 'analysis' | 'alert';
  timestamp: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  analysisType?: string;
  cameraName?: string;
  confidence?: number | null;
  isNew?: boolean;
}

const MAX_ITEMS = 50;

function analysisToTimeline(row: Tables<'analysis_history'>): TimelineItem {
  return {
    id: row.id,
    type: 'analysis',
    timestamp: row.timestamp,
    title: formatAnalysisType(row.analysis_type),
    description: summarizeResult(row.result),
    analysisType: row.analysis_type,
    confidence: row.confidence,
  };
}

function alertToTimeline(row: Tables<'alerts'>): TimelineItem {
  return {
    id: row.id,
    type: 'alert',
    timestamp: row.timestamp,
    title: row.message.slice(0, 80),
    description: row.camera_name,
    severity: row.severity,
    cameraName: row.camera_name,
  };
}

function formatAnalysisType(type: string): string {
  const map: Record<string, string> = {
    security: 'Análise de Segurança',
    safety: 'Análise de Segurança do Trabalho',
    productivity: 'Análise de Produtividade',
    behavior: 'Análise Comportamental',
  };
  return map[type] ?? type;
}

function summarizeResult(result: unknown): string {
  if (!result || typeof result !== 'object') return 'Análise concluída';
  const r = result as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof r.people_count === 'number') parts.push(`${r.people_count} pessoa(s)`);
  if (typeof r.confidence === 'number')
    parts.push(`Confiança: ${Math.round(Number(r.confidence) * 100)}%`);
  if (Array.isArray(r.detections)) parts.push(`${r.detections.length} detecção(ões)`);
  if (typeof r.summary === 'string') parts.push(r.summary as string);
  return parts.length > 0 ? parts.join(' · ') : 'Análise concluída';
}

export function useRealtimeAnalysisHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const addItem = useCallback((item: TimelineItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      const next = [{ ...item, isNew: true }, ...prev];
      return next.slice(0, MAX_ITEMS);
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    async function load() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [analysisRes, alertsRes] = await Promise.all([
        supabase
          .from('analysis_history')
          .select('*')
          .eq('user_id', user!.id)
          .gte('timestamp', since)
          .order('timestamp', { ascending: false })
          .limit(30),
        supabase
          .from('alerts')
          .select('*')
          .eq('user_id', user!.id)
          .gte('timestamp', since)
          .order('timestamp', { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      const all: TimelineItem[] = [];
      if (analysisRes.data) all.push(...analysisRes.data.map(analysisToTimeline));
      if (alertsRes.data) all.push(...alertsRes.data.map(alertToTimeline));

      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setItems(all.slice(0, MAX_ITEMS));
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return undefined;

    const channel = supabase
      .channel('analysis-timeline')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analysis_history',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Tables<'analysis_history'>;
          addItem(analysisToTimeline(row));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Tables<'alerts'>;
          addItem(alertToTimeline(row));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, addItem]);

  const clearNewFlags = useCallback(() => {
    setItems((prev) => prev.map((i) => (i.isNew ? { ...i, isNew: false } : i)));
  }, []);

  return { items, isLoading, clearNewFlags };
}
