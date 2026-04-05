/**
 * VISÃO - Overlay de Resultados de Análise Contínua
 * 
 * Exibe em tempo real sobre o vídeo:
 * - Contagem de pessoas e nível de risco
 * - Detecções individuais com confiança
 * - Alertas ativos
 * - Métricas de produtividade/segurança
 * - Histórico compacto de análises
 */

import { memo, useState } from 'react';
import {
  Users,
  AlertTriangle,
  ShieldCheck,
  Eye,
  HardHat,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Brain,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  AnalysisResult,
  SecurityAnalysis,
  ProductivityAnalysis,
  SafetyAnalysis,
  Detection,
  AnalysisAlert,
} from '@/hooks/useImageAnalysis';
import { AnalysisSession } from '@/types/continuousAnalysis';

interface AnalysisResultsOverlayProps {
  lastAnalysis: AnalysisResult | null;
  session: AnalysisSession | null;
  isAnalyzing: boolean;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-warning',
  critical: 'text-destructive',
};

const SEVERITY_BG: Record<string, string> = {
  low: 'bg-success/20 border-success/40',
  medium: 'bg-warning/20 border-warning/40',
  high: 'bg-warning/25 border-warning/40',
  critical: 'bg-destructive/20 border-destructive/40',
};

function isSecurityAnalysis(r: AnalysisResult): r is SecurityAnalysis {
  return 'detections' in r && 'alerts' in r;
}

function isProductivityAnalysis(r: AnalysisResult): r is ProductivityAnalysis {
  return 'working_count' in r && 'idle_count' in r;
}

function isSafetyAnalysis(r: AnalysisResult): r is SafetyAnalysis {
  return 'ppe_compliance' in r && 'hazards' in r;
}

function getRiskLevel(analysis: AnalysisResult): string | null {
  if ('risk_level' in analysis) return String((analysis as Record<string, unknown>).risk_level);
  if (isSecurityAnalysis(analysis) && analysis.alerts.length > 0) {
    const severities = analysis.alerts.map(a => a.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }
  return null;
}

function DetectionItem({ detection }: { detection: Detection }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[10px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', SEVERITY_COLORS[detection.severity]?.replace('text-', 'bg-'))} />
        <span className="truncate">{detection.label}</span>
      </div>
      <span className="text-white/60 flex-shrink-0">{Math.round(detection.confidence * 100)}%</span>
    </div>
  );
}

function AlertItem({ alert }: { alert: AnalysisAlert }) {
  return (
    <div className={cn('rounded px-1.5 py-0.5 border text-[10px]', SEVERITY_BG[alert.severity])}>
      <div className="flex items-center gap-1">
        <AlertTriangle className={cn('w-2.5 h-2.5 flex-shrink-0', SEVERITY_COLORS[alert.severity])} />
        <span className="truncate">{alert.message}</span>
      </div>
    </div>
  );
}

function SecurityOverlay({ analysis }: { analysis: SecurityAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  const visibleDetections = expanded ? analysis.detections : analysis.detections.slice(0, 3);

  return (
    <div className="space-y-1.5">
      {/* Detections */}
      {analysis.detections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/60 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3" /> Detecções ({analysis.detections.length})
            </span>
            {analysis.detections.length > 3 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary hover:text-primary/80">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {visibleDetections.map((d, i) => <DetectionItem key={i} detection={d} />)}
          </div>
        </div>
      )}

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="space-y-0.5">
          {analysis.alerts.slice(0, 3).map((a, i) => <AlertItem key={i} alert={a} />)}
        </div>
      )}
    </div>
  );
}

function ProductivityOverlay({ analysis }: { analysis: ProductivityAnalysis }) {
  const productivityRate = analysis.people_count > 0
    ? Math.round((analysis.working_count / analysis.people_count) * 100)
    : 0;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-success/15 rounded px-1.5 py-1 text-center">
          <div className="text-success text-sm font-bold">{analysis.working_count}</div>
          <div className="text-[9px] text-white/50">Trabalhando</div>
        </div>
        <div className="bg-warning/15 rounded px-1.5 py-1 text-center">
          <div className="text-warning text-sm font-bold">{analysis.idle_count}</div>
          <div className="text-[9px] text-white/50">Ociosos</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <TrendingUp className="w-3 h-3 text-primary" />
        <span className="text-white/70">Produtividade:</span>
        <span className={cn('font-medium', productivityRate >= 70 ? 'text-success' : productivityRate >= 40 ? 'text-warning' : 'text-destructive')}>
          {productivityRate}%
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <Users className="w-3 h-3 text-primary" />
        <span className="text-white/70">Ocupação:</span>
        <span className="font-medium text-white">{Math.round(analysis.occupancy_rate)}%</span>
      </div>
      {analysis.observations.length > 0 && (
        <div className="text-[10px] text-white/50 italic truncate">
          {analysis.observations[0]}
        </div>
      )}
    </div>
  );
}

function SafetyOverlay({ analysis }: { analysis: SafetyAnalysis }) {
  const complianceRate = analysis.ppe_compliance.compliant + analysis.ppe_compliance.non_compliant > 0
    ? Math.round((analysis.ppe_compliance.compliant / (analysis.ppe_compliance.compliant + analysis.ppe_compliance.non_compliant)) * 100)
    : 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px]">
        <HardHat className="w-3 h-3 text-primary" />
        <span className="text-white/70">EPI Conformidade:</span>
        <span className={cn('font-bold', complianceRate >= 90 ? 'text-success' : complianceRate >= 70 ? 'text-warning' : 'text-destructive')}>
          {complianceRate}%
        </span>
      </div>

      {analysis.ppe_compliance.missing_items.length > 0 && (
        <div className="text-[10px]">
          <span className="text-destructive">Faltando: </span>
          <span className="text-white/70">{analysis.ppe_compliance.missing_items.join(', ')}</span>
        </div>
      )}

      {analysis.hazards.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-[10px] text-white/60 uppercase tracking-wider">Riscos ({analysis.hazards.length})</span>
          {analysis.hazards.slice(0, 2).map((h, i) => (
            <div key={i} className={cn('rounded px-1.5 py-0.5 border text-[10px]', SEVERITY_BG[h.severity])}>
              <span className={SEVERITY_COLORS[h.severity]}>{h.type}</span>
              <span className="text-white/50 ml-1">— {h.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisResultsOverlayComponent({
  lastAnalysis,
  session,
  isAnalyzing,
  className,
}: AnalysisResultsOverlayProps) {
  if (!lastAnalysis) return null;

  const riskLevel = getRiskLevel(lastAnalysis);
  const analysisCount = session?.stats.totalAnalyses ?? 0;
  const avgTime = session?.stats.avgAnalysisTime ? Math.round(session.stats.avgAnalysisTime) : null;

  return (
    <div className={cn(
      'absolute top-12 right-3 w-48 flex flex-col gap-1.5 pointer-events-auto',
      className
    )}>
      {/* Header */}
      <div className="bg-black/75 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Brain className={cn('w-3.5 h-3.5', isAnalyzing ? 'animate-pulse text-primary' : 'text-success')} />
            <span className="text-xs font-medium">{isAnalyzing ? 'Analisando...' : 'IA Ativa'}</span>
          </div>
          {riskLevel && (
            <Badge variant="outline" className={cn(
              'text-[9px] h-4 px-1.5 border',
              SEVERITY_BG[riskLevel],
              SEVERITY_COLORS[riskLevel],
            )}>
              {riskLevel.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* People count + stats */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-white/70">Pessoas:</span>
            <span className="font-bold text-white">{lastAnalysis.people_count}</span>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            {analysisCount > 0 && (
              <span className="flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />{analysisCount}
              </span>
            )}
            {avgTime && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />{avgTime}ms
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Type-specific results */}
      <div className="bg-black/75 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-white max-h-48 overflow-y-auto scrollbar-thin">
        {isSecurityAnalysis(lastAnalysis) && <SecurityOverlay analysis={lastAnalysis} />}
        {isProductivityAnalysis(lastAnalysis) && <ProductivityOverlay analysis={lastAnalysis} />}
        {isSafetyAnalysis(lastAnalysis) && <SafetyOverlay analysis={lastAnalysis} />}

        {/* Summary */}
        {lastAnalysis.summary && (
          <p className="text-[10px] text-white/50 mt-1.5 leading-tight border-t border-white/10 pt-1.5">
            {lastAnalysis.summary}
          </p>
        )}
      </div>
    </div>
  );
}

export const AnalysisResultsOverlay = memo(AnalysisResultsOverlayComponent);
