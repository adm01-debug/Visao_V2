/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ClipRecorderControls
 * 
 * Controles visuais para gravação de clips.
 * Mostra status, duração, frames e botões de ação.
 */

import { useState } from 'react';
import {
  Video,
  Square,
  Circle,
  Clock,
  Film,
  Download,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  RecordingStatus,
  RecordingConfig,
  ClipFormat,
  ClipQuality,
  formatDuration,
} from '@/types/clips';

// ============================================
// TIPOS
// ============================================

interface ClipRecorderControlsProps {
  /** Está gravando */
  isRecording: boolean;
  
  /** Status atual */
  status: RecordingStatus;
  
  /** Duração atual (segundos) */
  currentDuration: number;
  
  /** Frames capturados */
  frameCount: number;
  
  /** Configuração atual */
  config?: Partial<RecordingConfig>;
  
  /** Callbacks */
  onStartRecording: () => void;
  onStopRecording: () => void;
  onConfigUpdate?: (updates: Partial<RecordingConfig>) => void;
  
  /** Erro atual */
  error?: string | null;
  
  /** Modo compacto */
  compact?: boolean;
  
  /** Mostrar configurações */
  showConfig?: boolean;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// STATUS BADGE
// ============================================

function RecordingStatusBadge({ status }: { status: RecordingStatus }) {
  const config = {
    idle: { color: 'bg-gray-500', label: 'Aguardando', icon: Video },
    recording: { color: 'bg-red-500', label: 'Gravando', icon: Circle, pulse: true },
    processing: { color: 'bg-yellow-500', label: 'Processando', icon: Film },
    ready: { color: 'bg-green-500', label: 'Pronto', icon: Video },
    uploading: { color: 'bg-blue-500', label: 'Enviando', icon: Video },
    error: { color: 'bg-red-600', label: 'Erro', icon: AlertTriangle },
  };

  const { color, label, icon: Icon, pulse } = config[status];

  return (
    <Badge className={cn('gap-1.5 text-white border-0', color)}>
      <Icon className={cn('w-3 h-3', pulse && 'animate-pulse')} />
      {label}
    </Badge>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ClipRecorderControls({
  isRecording,
  status,
  currentDuration,
  frameCount,
  config,
  onStartRecording,
  onStopRecording,
  onConfigUpdate,
  error,
  compact = false,
  showConfig: showConfigProp = false,
  className,
}: ClipRecorderControlsProps) {
  const [showConfig, setShowConfig] = useState(showConfigProp);

  // Estado local para configurações
  const [format, setFormat] = useState<ClipFormat>(config?.format || 'mp4');
  const [quality, setQuality] = useState<ClipQuality>(config?.quality || 'high');
  const [maxDuration, setMaxDuration] = useState(config?.maxDuration || 60);
  const [preEventSeconds, setPreEventSeconds] = useState(config?.preEventSeconds || 5);
  const [postEventSeconds, setPostEventSeconds] = useState(config?.postEventSeconds || 10);
  const [autoOnAlert, setAutoOnAlert] = useState(config?.autoTriggers?.onAlert ?? true);
  const [autoOnRule, setAutoOnRule] = useState(config?.autoTriggers?.onRule ?? true);

  const handleConfigChange = (key: string, value: any) => {
    onConfigUpdate?.({ [key]: value });
  };

  const handleAutoTriggersChange = (key: string, value: boolean) => {
    onConfigUpdate?.({
      autoTriggers: {
        ...config?.autoTriggers,
        [key]: value,
      },
    });
  };

  // ============================================
  // RENDER: Modo Compacto
  // ============================================

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          {/* Botão de gravação */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isRecording ? 'destructive' : 'default'}
                size="sm"
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={status === 'processing' || status === 'uploading'}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 mr-1" />
                    Parar
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 mr-1 text-red-500" />
                    Gravar
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isRecording ? 'Parar gravação' : 'Iniciar gravação manual'}
            </TooltipContent>
          </Tooltip>

          {/* Indicadores durante gravação */}
          {isRecording && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="destructive" className="animate-pulse">
                <Circle className="w-3 h-3 mr-1 fill-current" />
                REC
              </Badge>
              <span className="font-mono">{formatDuration(currentDuration)}</span>
              <span className="text-muted-foreground">{frameCount} frames</span>
            </div>
          )}

          {/* Status */}
          {!isRecording && status !== 'idle' && (
            <RecordingStatusBadge status={status} />
          )}
        </div>
      </TooltipProvider>
    );
  }

  // ============================================
  // RENDER: Modo Completo
  // ============================================

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header com status e botão principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-semibold">Gravação de Clips</span>
            <RecordingStatusBadge status={status} />
          </div>

          <Button
            variant={isRecording ? 'destructive' : 'default'}
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={status === 'processing' || status === 'uploading'}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Parar Gravação
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 mr-2 text-red-500" />
                Iniciar Gravação
              </>
            )}
          </Button>
        </div>

        {/* Indicadores durante gravação */}
        {isRecording && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="destructive" className="animate-pulse text-lg px-3 py-1">
                  <Circle className="w-4 h-4 mr-2 fill-current" />
                  GRAVANDO
                </Badge>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-lg">{formatDuration(currentDuration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-muted-foreground" />
                  <span>{frameCount} frames</span>
                </div>
              </div>
            </div>

            {/* Barra de progresso para duração máxima */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{Math.round((currentDuration / maxDuration) * 100)}%</span>
              </div>
              <div className="h-2 bg-destructive/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-destructive transition-all duration-300"
                  style={{ width: `${Math.min((currentDuration / maxDuration) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Configurações */}
        <Collapsible open={showConfig} onOpenChange={setShowConfig}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações de Gravação
              </span>
              {showConfig ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-4">
            {/* Formato e Qualidade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Formato</Label>
                <Select
                  value={format}
                  onValueChange={(v: ClipFormat) => {
                    setFormat(v);
                    handleConfigChange('format', v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="gif">GIF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Qualidade</Label>
                <Select
                  value={quality}
                  onValueChange={(v: ClipQuality) => {
                    setQuality(v);
                    handleConfigChange('quality', v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa (500kbps)</SelectItem>
                    <SelectItem value="medium">Média (1.5Mbps)</SelectItem>
                    <SelectItem value="high">Alta (3Mbps)</SelectItem>
                    <SelectItem value="original">Original (5Mbps)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duração máxima */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Duração máxima</Label>
                <span className="text-sm font-medium">{maxDuration}s</span>
              </div>
              <Slider
                value={[maxDuration]}
                onValueChange={([v]) => {
                  setMaxDuration(v);
                  handleConfigChange('maxDuration', v);
                }}
                min={10}
                max={300}
                step={10}
              />
            </div>

            {/* Pre/Post event */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Pré-evento</Label>
                  <span className="text-sm">{preEventSeconds}s</span>
                </div>
                <Slider
                  value={[preEventSeconds]}
                  onValueChange={([v]) => {
                    setPreEventSeconds(v);
                    handleConfigChange('preEventSeconds', v);
                  }}
                  min={0}
                  max={30}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Pós-evento</Label>
                  <span className="text-sm">{postEventSeconds}s</span>
                </div>
                <Slider
                  value={[postEventSeconds]}
                  onValueChange={([v]) => {
                    setPostEventSeconds(v);
                    handleConfigChange('postEventSeconds', v);
                  }}
                  min={5}
                  max={60}
                  step={5}
                />
              </div>
            </div>

            {/* Triggers automáticos */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Gravação Automática</Label>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Gravar em alertas de IA</span>
                </div>
                <Switch
                  checked={autoOnAlert}
                  onCheckedChange={(v) => {
                    setAutoOnAlert(v);
                    handleAutoTriggersChange('onAlert', v);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Gravar em violação de regras</span>
                </div>
                <Switch
                  checked={autoOnRule}
                  onCheckedChange={(v) => {
                    setAutoOnRule(v);
                    handleAutoTriggersChange('onRule', v);
                  }}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}

export default ClipRecorderControls;
