import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, MessageCircle, Smartphone, UserX, AlertTriangle, Eye, Clock, Users } from 'lucide-react';
import type { AnalysisRecord } from './useBehaviorAnalysis';

const PATTERN_CONFIG: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  excessive_conversation: { icon: MessageCircle, label: 'Conversa Excessiva', color: 'text-warning' },
  cell_phone_usage: { icon: Smartphone, label: 'Uso de Celular', color: 'text-destructive' },
  prolonged_absence: { icon: UserX, label: 'Ausência Prolongada', color: 'text-destructive' },
  distraction: { icon: Eye, label: 'Distração', color: 'text-warning' },
  drowsiness: { icon: Clock, label: 'Sonolência', color: 'text-destructive' },
  unauthorized_break: { icon: Clock, label: 'Pausa Não Autorizada', color: 'text-warning' },
  crowding: { icon: Users, label: 'Aglomeração', color: 'text-warning' },
};

function getSeverityBadge(severity: string) {
  const map: Record<string, { cls: string; label: string }> = {
    low: { cls: 'bg-success/20 text-success border-success/30', label: 'Baixo' },
    medium: { cls: 'bg-warning/20 text-warning border-warning/30', label: 'Médio' },
    high: { cls: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Alto' },
    critical: { cls: 'bg-destructive/30 text-destructive border-destructive/50', label: 'Crítico' },
  };
  const cfg = map[severity] || map.low;
  return <Badge className={`${cfg!.cls} text-[10px]`}>{cfg!.label}</Badge>;
}

export function BehaviorResultCard({ record }: { record: AnalysisRecord }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4 text-primary" />{record.cameraName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">Score: {record.analysis.productivity_score}%</Badge>
            <span className="text-[10px] text-muted-foreground">{new Date(record.timestamp).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{record.analysis.summary}</p>
        {record.analysis.behavioral_patterns?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground mb-1">Padrões Detectados:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {record.analysis.behavioral_patterns.map((pattern, i) => {
                const cfg = PATTERN_CONFIG[pattern.pattern_type] || { icon: AlertTriangle, label: pattern.pattern_type, color: 'text-muted-foreground' };
                const PatternIcon = cfg.icon;
                return (
                  <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <PatternIcon className={`h-4 w-4 ${cfg.color}`} />
                        <span className="text-xs font-medium">{cfg.label}</span>
                      </div>
                      {getSeverityBadge(pattern.severity)}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{pattern.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span>👥 {pattern.people_involved} pessoa(s)</span>
                      <span>⏱️ ~{pattern.estimated_duration_minutes}min</span>
                      <span>📍 {pattern.location}</span>
                      <span>🎯 {Math.round(pattern.confidence * 100)}%</span>
                    </div>
                    {pattern.recommendation && <p className="text-[10px] text-primary mt-1">💡 {pattern.recommendation}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-success">✓ Nenhum padrão comportamental negativo detectado</p>
        )}
        {record.analysis.recommendations?.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-medium text-primary mb-1">Recomendações:</p>
            <ul className="text-[10px] text-muted-foreground space-y-0.5">
              {record.analysis.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
