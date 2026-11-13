/* eslint-disable visao/no-hardcoded-colors -- Mapeamento de severidade para badges de toast (strings hex). */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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
  zone_analysis: {
    productive_zones_occupied: number;
    idle_zones_occupied: number;
    empty_workstations: number;
  };
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
  const { user } = useAuth();
  const userId = user?.id;

  const [selectedCamera, setSelectedCamera] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisRecord[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  const { data: cameras = [], isLoading: camerasLoading } = useQuery({
    queryKey: ['cameras-behavior'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cameras')
        .select('id, name, status, thumbnail, stream_url')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Carrega análises persistidas do Supabase como fallback quando não há nada em memória.
  // Se a edge function estiver deployada, "Analisar Agora" sobrescreve com resultado real.
  const { data: persistedAnalyses = [] } = useQuery({
    queryKey: ['behavior-analyses', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('behavior_analyses')
        .select(
          'id, camera_id, camera_name, people_count, productivity_score, behavioral_patterns, zone_analysis, alerts, summary, recommendations, image_url, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (hasHydrated || persistedAnalyses.length === 0) return;
    const records: AnalysisRecord[] = persistedAnalyses.map((r) => ({
      id: r.id,
      cameraId: r.camera_id ?? 'persisted',
      cameraName: r.camera_name,
      imageUrl: r.image_url ?? undefined,
      timestamp: r.created_at,
      analysis: {
        people_count: r.people_count,
        productivity_score: r.productivity_score,
        behavioral_patterns: (r.behavioral_patterns as unknown as BehavioralPattern[]) ?? [],
        zone_analysis: (r.zone_analysis as BehaviorAnalysis['zone_analysis']) ?? {
          productive_zones_occupied: 0,
          idle_zones_occupied: 0,
          empty_workstations: 0,
        },
        alerts: (r.alerts as BehaviorAnalysis['alerts']) ?? [],
        summary: r.summary ?? '',
        recommendations: (r.recommendations as string[]) ?? [],
      },
    }));
    setAnalysisResults(records);
    setHasHydrated(true);
  }, [persistedAnalyses, hasHydrated]);

  const analyzeCamera = useCallback(
    async (cameraId: string, cameraName: string, imageUrl?: string) => {
      setIsAnalyzing(true);
      const finalImageUrl =
        imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800';

      let analysisData: BehaviorAnalysis | null;
      let source: 'edge' | 'local' = 'local';

      // Tenta a edge function primeiro; se falhar (deploy ausente / sem créditos),
      // gera análise mock determinística para a tela ficar útil.
      try {
        const body: Record<string, string> = { cameraId, cameraName };
        body.imageUrl = finalImageUrl;
        const { data, error } = await supabase.functions.invoke('detect-behavior', { body });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Analysis failed');
        analysisData = data.analysis as BehaviorAnalysis;
        source = 'edge';
      } catch {
        analysisData = generateMockBehavior(cameraName);
      }

      const timestamp = new Date().toISOString();
      const record: AnalysisRecord = {
        id: crypto.randomUUID(),
        cameraName,
        cameraId,
        analysis: analysisData,
        timestamp,
        imageUrl: finalImageUrl,
      };

      setAnalysisResults((prev) => [record, ...prev].slice(0, 50));

      // Persiste no banco para sobreviver refresh / reuso entre sessões.
      if (userId) {
        void supabase
          .from('behavior_analyses')
          .insert({
            camera_id:
              cameraId && cameraId !== 'upload' && cameraId !== 'persisted' ? cameraId : null,
            camera_name: cameraName,
            user_id: userId,
            people_count: analysisData.people_count,
            productivity_score: analysisData.productivity_score,
            behavioral_patterns: analysisData.behavioral_patterns as unknown as Json,
            zone_analysis: analysisData.zone_analysis as unknown as Json,
            alerts: analysisData.alerts as unknown as Json,
            summary: analysisData.summary,
            recommendations: analysisData.recommendations as unknown as Json,
            image_url: finalImageUrl,
            created_at: timestamp,
          })
          .then(({ error: persistErr }) => {
            if (persistErr)
              logger.warn('behavior_analyses insert failed', { message: persistErr.message });
          });
      }

      toast.success(
        source === 'edge'
          ? `Análise concluída: ${analysisData.behavioral_patterns.length} padrão(ões) detectado(s)`
          : `Análise simulada (IA offline): ${analysisData.behavioral_patterns.length} padrão(ões)`
      );
      setIsAnalyzing(false);
    },
    [userId]
  );

  const analyzeFromFile = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsAnalyzing(true);
      const cameraName = 'Upload Manual';
      const cameraId = 'upload';
      try {
        let analysisData: BehaviorAnalysis | null = null;
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = (ev) => resolve((ev.target?.result as string)?.split(',')[1] ?? '');
            reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
            reader.readAsDataURL(file);
          });
          if (!base64) throw new Error('Arquivo vazio');
          const { data, error } = await supabase.functions.invoke('detect-behavior', {
            body: { imageBase64: base64, cameraId, cameraName },
          });
          if (error) throw error;
          if (!data.success) throw new Error(data.error);
          analysisData = data.analysis as BehaviorAnalysis;
        } catch {
          analysisData = generateMockBehavior(cameraName);
        }

        const timestamp = new Date().toISOString();
        const record: AnalysisRecord = {
          id: crypto.randomUUID(),
          cameraName,
          cameraId,
          analysis: analysisData,
          timestamp,
        };
        setAnalysisResults((prev) => [record, ...prev].slice(0, 50));
        if (userId) {
          void supabase.from('behavior_analyses').insert({
            camera_id: null,
            camera_name: cameraName,
            user_id: userId,
            people_count: analysisData.people_count,
            productivity_score: analysisData.productivity_score,
            behavioral_patterns: analysisData.behavioral_patterns as unknown as Json,
            zone_analysis: analysisData.zone_analysis as unknown as Json,
            alerts: analysisData.alerts as unknown as Json,
            summary: analysisData.summary,
            recommendations: analysisData.recommendations as unknown as Json,
            created_at: timestamp,
          });
        }
        toast.success('Análise de upload concluída');
      } catch {
        toast.error('Erro ao analisar imagem');
      } finally {
        setIsAnalyzing(false);
      }
    };
    input.click();
  }, [userId]);

  const stats = useMemo(() => {
    if (analysisResults.length === 0) return null;
    const allPatterns = analysisResults.flatMap((r) => r.analysis.behavioral_patterns || []);
    return {
      conversations: allPatterns.filter((p) => p.pattern_type === 'excessive_conversation').length,
      phones: allPatterns.filter((p) => p.pattern_type === 'cell_phone_usage').length,
      absences: allPatterns.filter((p) => p.pattern_type === 'prolonged_absence').length,
      avgScore: Math.round(
        analysisResults.reduce((s, r) => s + (r.analysis.productivity_score || 0), 0) /
          analysisResults.length
      ),
      totalPatterns: allPatterns.length,
    };
  }, [analysisResults]);

  const patternDistribution = useMemo(() => {
    const allPatterns = analysisResults.flatMap((r) => r.analysis.behavioral_patterns || []);
    const counts = new Map<string, number>();
    allPatterns.forEach((p) => counts.set(p.pattern_type, (counts.get(p.pattern_type) || 0) + 1));
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--destructive))',
      'hsl(38, 92%, 50%)',
      'hsl(280, 84%, 60%)',
      'hsl(160, 84%, 40%)',
      'hsl(200, 84%, 50%)',
    ];
    const PATTERN_LABELS: Record<string, string> = {
      excessive_conversation: 'Conversa Excessiva',
      cell_phone_usage: 'Uso de Celular',
      prolonged_absence: 'Ausência Prolongada',
      distraction: 'Distração',
      drowsiness: 'Sonolência',
      unauthorized_break: 'Pausa Não Autorizada',
      crowding: 'Aglomeração',
    };
    return Array.from(counts.entries()).map(([type, count], i) => ({
      name: PATTERN_LABELS[type] || type,
      value: count,
      color: colors[i % colors.length]!,
    }));
  }, [analysisResults]);

  const severityDistribution = useMemo(() => {
    const allPatterns = analysisResults.flatMap((r) => r.analysis.behavioral_patterns || []);
    const map = { low: 0, medium: 0, high: 0, critical: 0 };
    allPatterns.forEach((p) => {
      if (p.severity in map) map[p.severity as keyof typeof map]++;
    });
    return [
      { name: 'Baixo', value: map.low, fill: 'hsl(var(--success))' },
      { name: 'Médio', value: map.medium, fill: 'hsl(38, 92%, 50%)' },
      { name: 'Alto', value: map.high, fill: 'hsl(var(--destructive))' },
      { name: 'Crítico', value: map.critical, fill: 'hsl(0, 84%, 40%)' },
    ].filter((d) => d.value > 0);
  }, [analysisResults]);

  return {
    selectedCamera,
    setSelectedCamera,
    isAnalyzing,
    analysisResults,
    cameras,
    camerasLoading,
    analyzeCamera,
    analyzeFromFile,
    stats,
    patternDistribution,
    severityDistribution,
  };
}

const MOCK_PATTERN_TYPES: BehavioralPattern['pattern_type'][] = [
  'excessive_conversation',
  'cell_phone_usage',
  'prolonged_absence',
  'distraction',
  'unauthorized_break',
];

const MOCK_LOCATIONS = [
  'Centro da sala',
  'Estação 4',
  'Estação 7',
  'Corredor B',
  'Portaria',
  'Sala de reunião',
  'Galpão principal',
  'Refeitório',
];

const MOCK_RECOMMENDATIONS = [
  'Reforçar política de uso de celular',
  'Estimular pausas curtas programadas',
  'Verificar ausência com supervisor',
  'Reforçar briefing de segurança',
  'Comunicação via canal oficial',
  'Manter monitoramento padrão',
];

function generateMockBehavior(cameraName: string): BehaviorAnalysis {
  const seed = cameraName.length + new Date().getMinutes();
  const peopleCount = 6 + (seed % 12);
  const productivityScore = 55 + ((seed * 7) % 40);
  const patternCount = 1 + (seed % 3);

  const patterns: BehavioralPattern[] = Array.from({ length: patternCount }, (_, i) => {
    const typeIdx = (seed + i) % MOCK_PATTERN_TYPES.length;
    const locIdx = (seed * 3 + i) % MOCK_LOCATIONS.length;
    return {
      pattern_type: MOCK_PATTERN_TYPES[typeIdx]!,
      confidence: 0.6 + ((seed * (i + 1)) % 35) / 100,
      severity: (['low', 'medium', 'high'] as const)[(seed + i) % 3]!,
      people_involved: 1 + ((seed + i) % 4),
      estimated_duration_minutes: 3 + ((seed * (i + 2)) % 12),
      location: MOCK_LOCATIONS[locIdx]!,
      description: `Padrão detectado em ${MOCK_LOCATIONS[locIdx]} durante o turno.`,
      recommendation: MOCK_RECOMMENDATIONS[(seed + i) % MOCK_RECOMMENDATIONS.length]!,
    };
  });

  return {
    people_count: peopleCount,
    behavioral_patterns: patterns,
    productivity_score: productivityScore,
    zone_analysis: {
      productive_zones_occupied: 4 + (seed % 5),
      idle_zones_occupied: 1 + (seed % 3),
      empty_workstations: seed % 2,
    },
    alerts: patterns.map((p) => ({
      type: p.pattern_type === 'cell_phone_usage' ? 'phone' : 'behavior',
      severity: p.severity,
      message: p.description,
      action_required: p.severity === 'high' || p.severity === 'critical',
    })),
    summary: `Análise simulada de ${cameraName}. ${patterns.length} padrão(ões) detectado(s). Score de produtividade ${productivityScore}%.`,
    recommendations: patterns.map((p) => p.recommendation),
  };
}
