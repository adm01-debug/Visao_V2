/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ContinuousAnalysisPanel
 * 
 * Painel de controle para análise contínua de vídeo.
 * Permite configurar, iniciar, pausar e monitorar análises automáticas.
 */

import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Settings,
  Activity,
  AlertTriangle,
  Users,
  Clock,
  TrendingUp,
  History,
  RefreshCw,
  Zap,
  Eye,
  Shield,
  HardHat,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AnalysisSession,
  AnalysisHistoryEntry,
  ContinuousAnalysisConfig,
  defaultAlertThresholds,
} from '@/types/continuousAnalysis';
import { AnalysisType, AnalysisResult } from '@/hooks/useImageAnalysis';
import { useMLModels } from '@/hooks/useMLModels';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS
// ============================================

interface ContinuousAnalysisPanelProps {
  /** Sessão atual */
  session: AnalysisSession | null;
  
  /** Histórico de análises */
  history: AnalysisHistoryEntry[];
  
  /** Está analisando agora? */
  isAnalyzing: boolean;
  
  /** Callbacks */
  onStart: (config?: Partial<ContinuousAnalysisConfig>) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfigUpdate: (updates: Partial<ContinuousAnalysisConfig>) => void;
  onClearHistory: () => void;
  onExportHistory: () => AnalysisHistoryEntry[];
  onAnalyzeOnce: (type?: AnalysisType) => Promise<AnalysisResult | null>;
  
  /** Mostrar configurações expandidas inicialmente */
  showConfigByDefault?: boolean;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// STATUS BADGE
// ============================================

function SessionStatusBadge({ status }: { status: AnalysisSession['status'] }) {
  const config: Record<AnalysisSession['status'], { color: string; label: string; pulse?: boolean }> = {
    idle: { color: 'bg-gray-500', label: 'Aguardando' },
    running: { color: 'bg-green-500', label: 'Executando', pulse: true },
    paused: { color: 'bg-yellow-500', label: 'Pausado' },
    error: { color: 'bg-red-500', label: 'Erro' },
    stopped: { color: 'bg-gray-500', label: 'Parado' },
    scheduled: { color: 'bg-blue-500', label: 'Agendado' },
  };

  const statusConfig = config[status];
  const pulse = statusConfig.pulse;

  return (
    <Badge className={cn('gap-1.5 text-white border-0', statusConfig.color)}>
      {pulse && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
      {statusConfig.label}
    </Badge>
  );
}

// ============================================
// STATS CARD
// ============================================

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <div className={cn('bg-card/50 rounded-lg p-3', className)}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">{value}</span>
        {trend && (
          <TrendingUp
            className={cn(
              'w-4 h-4',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500 rotate-180',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// HISTORY ITEM
// ============================================

function HistoryItem({ entry }: { entry: AnalysisHistoryEntry }) {
  const typeIcons = {
    security: Shield,
    safety: HardHat,
    productivity: BarChart3,
  };
  const Icon = typeIcons[entry.analysisType] || Eye;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        entry.success ? 'hover:bg-card/50' : 'bg-destructive/10'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg',
          entry.success ? 'bg-primary/10' : 'bg-destructive/20'
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4',
            entry.success ? 'text-primary' : 'text-destructive'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm capitalize">
            {entry.analysisType}
          </span>
          {entry.alertsGenerated > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {entry.alertsGenerated} alerta{entry.alertsGenerated > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{entry.result.people_count || 0} pessoas</span>
          <span>•</span>
          <span>{entry.duration}ms</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ptBR })}
      </span>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ContinuousAnalysisPanel({
  session,
  history,
  isAnalyzing,
  onStart,
  onStop,
  onPause,
  onResume,
  onConfigUpdate,
  onClearHistory,
  onExportHistory,
  onAnalyzeOnce,
  showConfigByDefault = false,
  className,
}: ContinuousAnalysisPanelProps) {
  // Estados locais para configuração
  const [showConfig, setShowConfig] = useState(showConfigByDefault);
  const [showHistory, setShowHistory] = useState(true);
  
  // Configurações editáveis
  const [interval, setInterval] = useState(5000);
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>(['security']);
  const [maxPeopleCount, setMaxPeopleCount] = useState<number | undefined>(undefined);
  const [minPPECompliance, setMinPPECompliance] = useState(90);
  const [minConfidence, setMinConfidence] = useState(0.7);

  // Hook de detecção ML para objetos em tempo real
  const {
    loadModel,
    detectObjects,
    isLoading: isMLLoading,
    isModelLoaded,
    detectedObjects,
    error: mlError,
  } = useMLModels();

  // Estado para habilitar/desabilitar detecção ML local
  const [enableMLDetection, setEnableMLDetection] = useState(true);

  // Sincronizar com sessão ativa
  // Carregar modelo ML quando componente montar
  useEffect(() => {
    if (enableMLDetection && !isModelLoaded && !isMLLoading) {
      loadModel("coco-ssd").catch(err => {
        console.error("Erro ao carregar modelo ML:", err);
      });
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
    onStart({
      interval,
      analysisTypes,
      alertThresholds: {
        ...defaultAlertThresholds,
        maxPeopleCount,
        minPPECompliance,
        minConfidence,
      },
    });
  };

  const handleAnalysisTypeToggle = (type: AnalysisType) => {
    const newTypes = analysisTypes.includes(type)
      ? analysisTypes.filter(t => t !== type)
      : [...analysisTypes, type];
    
    if (newTypes.length > 0) {
      setAnalysisTypes(newTypes);
      if (session) {
        onConfigUpdate({ analysisTypes: newTypes });
      }
    }
  };

  const handleIntervalChange = (value: number[]) => {
    const newInterval = value[0];
    setInterval(newInterval);
    if (session) {
      onConfigUpdate({ interval: newInterval });
    }
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
              <Activity className="w-5 h-5 text-primary" />
              Análise Contínua
            </CardTitle>
            {session && <SessionStatusBadge status={session.status} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controles principais */}
          <div className="flex items-center gap-2">
            {isStopped ? (
              <Button onClick={handleStart} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Iniciar Análise
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button onClick={onPause} variant="secondary" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar
                  </Button>
                ) : isPaused ? (
                  <Button onClick={onResume} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Retomar
                  </Button>
                ) : null}
                <Button onClick={onStop} variant="destructive">
                  <Square className="w-4 h-4" />
                </Button>
              </>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onAnalyzeOnce()}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analisar uma vez</TooltipContent>
            </Tooltip>
          </div>

          {/* Indicador de análise em progresso */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span>Analisando imagem...</span>
            </div>
          )}

          {/* Estatísticas da sessão */}
          {session && session.status !== 'stopped' && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                icon={Activity}
                label="Análises"
                value={session.stats.totalAnalyses}
              />
              <StatCard
                icon={AlertTriangle}
                label="Alertas"
                value={session.stats.alertsGenerated}
                trend={session.stats.alertsGenerated > 0 ? 'up' : 'neutral'}
              />
              <StatCard
                icon={Users}
                label="Média Pessoas"
                value={session.stats.avgPeoplePerAnalysis.toFixed(1)}
              />
              <StatCard
                icon={Clock}
                label="Tempo Médio"
                value={`${Math.round(session.stats.avgAnalysisTime)}ms`}
              />
            </div>
          )}

          {/* Taxa de sucesso */}
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

          {/* Configurações */}
          <Collapsible open={showConfig} onOpenChange={setShowConfig}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </span>
                {showConfig ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Tipos de análise */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipos de Análise</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { type: 'security' as const, icon: Shield, label: 'Segurança' },
                    { type: 'safety' as const, icon: HardHat, label: 'EPI' },
                    { type: 'productivity' as const, icon: BarChart3, label: 'Produtividade' },
                  ].map(({ type, icon: Icon, label }) => (
                    <Button
                      key={type}
                      variant={analysisTypes.includes(type) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAnalysisTypeToggle(type)}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Intervalo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Intervalo entre análises
                  </Label>
                  <span className="text-sm font-medium">{interval / 1000}s</span>
                </div>
                <Slider
                  value={[interval]}
                  onValueChange={handleIntervalChange}
                  min={3000}
                  max={60000}
                  step={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo: 3s | Máximo: 60s
                </p>
              </div>

              {/* Thresholds */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Thresholds para Alertas</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Máximo de pessoas</span>
                    <Select
                      value={maxPeopleCount?.toString() || 'none'}
                      onValueChange={(v) => setMaxPeopleCount(v === 'none' ? undefined : parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem limite</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Conformidade EPI mínima</span>
                    <span className="text-sm font-medium">{minPPECompliance}%</span>
                  </div>
                  <Slider
                    value={[minPPECompliance]}
                    onValueChange={([v]) => setMinPPECompliance(v)}
                    min={50}
                    max={100}
                    step={5}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confiança mínima</span>
                    <span className="text-sm font-medium">{(minConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[minConfidence * 100]}
                    onValueChange={([v]) => setMinConfidence(v / 100)}
                    min={50}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Histórico */}
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Histórico ({history.length})
                </span>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {history.length > 0 ? (
                <>
                  <ScrollArea className="h-48 pr-4">
                    <div className="space-y-1">
                      {history.map((entry) => (
                        <HistoryItem key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="w-4 h-4 mr-1" />
                      Exportar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClearHistory}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma análise no histórico</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ContinuousAnalysisPanel;

