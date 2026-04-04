import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BehavioralPattern {
  pattern_type: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  people_involved: number;
  estimated_duration_minutes: number;
  location: string;
  description: string;
  recommendation: string;
}

export interface BehaviorAnalysis {
  people_count: number;
  behavioral_patterns: BehavioralPattern[];
  productivity_score: number;
  zone_analysis: { productive_zones_occupied: number; idle_zones_occupied: number; empty_workstations: number };
  alerts: { type: string; severity: string; message: string; action_required: boolean }[];
  summary: string;
  recommendations: string[];
}

export interface AnalysisRecord {
  id: string;
  cameraName: string;
  cameraId: string;
  analysis: BehaviorAnalysis;
  timestamp: string;
  imageUrl?: string;
}

export function useBehaviorAnalysis() {
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisRecord[]>([]);

  const { data: cameras = [], isLoading: camerasLoading } = useQuery({
    queryKey: ['cameras-behavior'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cameras').select('id, name, status, thumbnail, stream_url').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const analyzeCamera = useCallback(async (cameraId: string, cameraName: string, imageUrl?: string) => {
    setIsAnalyzing(true);
    try {
      const body: Record<string, string> = { cameraId, cameraName };
      body.imageUrl = imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800';
      const { data, error } = await supabase.functions.invoke('detect-behavior', { body });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Analysis failed');
      setAnalysisResults(prev => [{ id: crypto.randomUUID(), cameraName, cameraId, analysis: data.analysis, timestamp: data.timestamp, imageUrl: body.imageUrl }, ...prev].slice(0, 50));
      toast.success(`Análise concluída: ${data.analysis.behavioral_patterns?.length || 0} padrão(ões) detectado(s)`);
    } catch (err) {
      toast.error(`Erro na análise: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally { setIsAnalyzing(false); }
  }, []);

  const analyzeFromFile = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsAnalyzing(true);
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = (ev.target?.result as string)?.split(',')[1];
          if (!base64) return;
          const { data, error } = await supabase.functions.invoke('detect-behavior', { body: { imageBase64: base64, cameraId: 'upload', cameraName: 'Upload Manual' } });
          if (error) throw error;
          if (!data.success) throw new Error(data.error);
          setAnalysisResults(prev => [{ id: crypto.randomUUID(), cameraName: 'Upload Manual', cameraId: 'upload', analysis: data.analysis, timestamp: data.timestamp }, ...prev].slice(0, 50));
          toast.success('Análise de upload concluída');
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
      } catch { toast.error('Erro ao analisar imagem'); setIsAnalyzing(false); }
    };
    input.click();
  }, []);

  const stats = useMemo(() => {
    if (analysisResults.length === 0) return null;
    const allPatterns = analysisResults.flatMap(r => r.analysis.behavioral_patterns || []);
    return {
      conversations: allPatterns.filter(p => p.pattern_type === 'excessive_conversation').length,
      phones: allPatterns.filter(p => p.pattern_type === 'cell_phone_usage').length,
      absences: allPatterns.filter(p => p.pattern_type === 'prolonged_absence').length,
      avgScore: Math.round(analysisResults.reduce((s, r) => s + (r.analysis.productivity_score || 0), 0) / analysisResults.length),
      totalPatterns: allPatterns.length,
    };
  }, [analysisResults]);

  const patternDistribution = useMemo(() => {
    const allPatterns = analysisResults.flatMap(r => r.analysis.behavioral_patterns || []);
    const counts = new Map<string, number>();
    allPatterns.forEach(p => counts.set(p.pattern_type, (counts.get(p.pattern_type) || 0) + 1));
    const colors = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(38, 92%, 50%)', 'hsl(280, 84%, 60%)', 'hsl(160, 84%, 40%)', 'hsl(200, 84%, 50%)'];
    const PATTERN_LABELS: Record<string, string> = {
      excessive_conversation: 'Conversa Excessiva', cell_phone_usage: 'Uso de Celular',
      prolonged_absence: 'Ausência Prolongada', distraction: 'Distração', drowsiness: 'Sonolência',
      unauthorized_break: 'Pausa Não Autorizada', crowding: 'Aglomeração',
    };
    return Array.from(counts.entries()).map(([type, count], i) => ({ name: PATTERN_LABELS[type] || type, value: count, color: colors[i % colors.length]! }));
  }, [analysisResults]);

  const severityDistribution = useMemo(() => {
    const allPatterns = analysisResults.flatMap(r => r.analysis.behavioral_patterns || []);
    const map = { low: 0, medium: 0, high: 0, critical: 0 };
    allPatterns.forEach(p => { if (p.severity in map) map[p.severity as keyof typeof map]++; });
    return [
      { name: 'Baixo', value: map.low, fill: 'hsl(var(--success))' },
      { name: 'Médio', value: map.medium, fill: 'hsl(38, 92%, 50%)' },
      { name: 'Alto', value: map.high, fill: 'hsl(var(--destructive))' },
      { name: 'Crítico', value: map.critical, fill: 'hsl(0, 84%, 40%)' },
    ].filter(d => d.value > 0);
  }, [analysisResults]);

  return { selectedCamera, setSelectedCamera, isAnalyzing, analysisResults, cameras, camerasLoading, analyzeCamera, analyzeFromFile, stats, patternDistribution, severityDistribution };
}
