/**
 * VISÃO - Continuous Analysis Panel (Refactored)
 */
import { memo, useEffect, useState } from 'react';
import { Play, Pause, Square, RefreshCw, Zap, Activity, AlertTriangle, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnalysisSession, AnalysisHistoryEntry, ContinuousAnalysisConfig, defaultAlertThresholds } from '@/types/continuousAnalysis';
import { AnalysisType, AnalysisResult } from '@/hooks/useImageAnalysis';
import { useMLModels } from '@/hooks/useMLModels';
import { SessionStatusBadge } from './analysis/SessionStatusBadge';
import { StatCard } from './analysis/StatCard';
import { AnalysisConfigSection } from './analysis/AnalysisConfigSection';
import { AnalysisHistorySection } from './analysis/AnalysisHistorySection';

interface ContinuousAnalysisPanelProps {
  session: AnalysisSession | null;
  history: AnalysisHistoryEntry[];
  isAnalyzing: boolean;
  onStart: (config?: Partial<ContinuousAnalysisConfig>) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfigUpdate: (updates: Partial<ContinuousAnalysisConfig>) => void;
  onClearHistory: () => void;
  onExportHistory: () => AnalysisHistoryEntry[];
  onAnalyzeOnce: (type?: AnalysisType) => Promise<AnalysisResult | null>;
  showConfigByDefault?: boolean;
  className?: string;
}

export function ContinuousAnalysisPanel({
  session, history, isAnalyzing, onStart, onStop, onPause, onResume,
  onConfigUpdate, onClearHistory, onExportHistory, onAnalyzeOnce,
  showConfigByDefault = false, className,
}: ContinuousAnalysisPanelProps) {
  const [showConfig, setShowConfig] = useState(showConfigByDefault);
  const [showHistory, setShowHistory] = useState(true);
  const [interval, setInterval] = useState(5000);
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>(['security']);
  const [maxPeopleCount, setMaxPeopleCount] = useState<number | undefined>(undefined);
  const [minPPECompliance, setMinPPECompliance] = useState(90);
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [enableMLDetection] = useState(true);

  const { loadModel, isLoading: isMLLoading, isModelLoaded } = useMLModels();

  useEffect(() => {
    if (enableMLDetection && !isModelLoaded && !isMLLoading) {
      loadModel("coco-ssd").catch(() => {});
    }
  }, [enableMLDetection, isModelLoaded, isMLLoading, loadModel]);

  useEffect(() => {
    if (session?.config) {
      setInterval(session.config.interval);
      setAnalysisTypes(session.config.analysisTypes);
      setMaxPeopleCount(session.config.alertThresholds.maxPeopleCount);
      setMinPPECompliance(session.config.alertThresholds.minPPECompliance || 90);
      setMinConfidence(session.config.alertThresholds.minConfidence);
    }
  }, [session?.config]);

  const isRunning = session?.status === 'running';
  const isPaused = session?.status === 'paused';
  const isStopped = !session || session.status === 'stopped' || session.status === 'idle';

  const handleStart = () => {
    onStart({ interval, analysisTypes, alertThresholds: { ...defaultAlertThresholds, maxPeopleCount, minPPECompliance, minConfidence } });
  };

  const handleAnalysisTypeToggle = (type: AnalysisType) => {
    const newTypes = analysisTypes.includes(type) ? analysisTypes.filter(t => t !== type) : [...analysisTypes, type];
    if (newTypes.length > 0) { setAnalysisTypes(newTypes); if (session) onConfigUpdate({ analysisTypes: newTypes }); }
  };

  const handleIntervalChange = (value: number[]) => {
    const v = value[0]!; setInterval(v); if (session) onConfigUpdate({ interval: v });
  };

  const handleExport = () => {
    const data = onExportHistory();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analise_continua_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <Card className={cn('border-border/50 bg-card/50 backdrop-blur', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />Análise Contínua
            </CardTitle>
            {session && <SessionStatusBadge status={session.status} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            {isStopped ? (
              <Button onClick={handleStart} className="flex-1"><Play className="w-4 h-4 mr-2" />Iniciar Análise</Button>
            ) : (
              <>
                {isRunning && <Button onClick={onPause} variant="secondary" className="flex-1"><Pause className="w-4 h-4 mr-2" />Pausar</Button>}
                {isPaused && <Button onClick={onResume} className="flex-1"><Play className="w-4 h-4 mr-2" />Retomar</Button>}
                <Button onClick={onStop} variant="destructive"><Square className="w-4 h-4" /></Button>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => onAnalyzeOnce()} disabled={isAnalyzing}>
                  {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analisar uma vez</TooltipContent>
            </Tooltip>
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" /><span>Analisando imagem...</span>
            </div>
          )}

          {session && session.status !== 'stopped' && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={Activity} label="Análises" value={session.stats.totalAnalyses} />
              <StatCard icon={AlertTriangle} label="Alertas" value={session.stats.alertsGenerated} trend={session.stats.alertsGenerated > 0 ? 'up' : 'neutral'} />
              <StatCard icon={Users} label="Média Pessoas" value={session.stats.avgPeoplePerAnalysis.toFixed(1)} />
              <StatCard icon={Clock} label="Tempo Médio" value={`${Math.round(session.stats.avgAnalysisTime)}ms`} />
            </div>
          )}

          {session && session.stats.totalAnalyses > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Sucesso</span>
                <span className="font-medium">{session.stats.successRate.toFixed(0)}%</span>
              </div>
              <Progress value={session.stats.successRate} />
            </div>
          )}

          <Separator />

          <AnalysisConfigSection
            open={showConfig} onOpenChange={setShowConfig}
            analysisTypes={analysisTypes} onToggleType={handleAnalysisTypeToggle}
            interval={interval} onIntervalChange={handleIntervalChange}
            maxPeopleCount={maxPeopleCount} onMaxPeopleCountChange={setMaxPeopleCount}
            minPPECompliance={minPPECompliance} onMinPPEComplianceChange={setMinPPECompliance}
            minConfidence={minConfidence} onMinConfidenceChange={setMinConfidence}
          />

          <Separator />

          <AnalysisHistorySection open={showHistory} onOpenChange={setShowHistory} history={history} onExport={handleExport} onClear={onClearHistory} />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default memo(ContinuousAnalysisPanel);
