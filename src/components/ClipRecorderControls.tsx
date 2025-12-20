/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ClipRecorderControls
 * 
 * Controles para gravação de clips de vídeo:
 * - Botão de iniciar/parar gravação
 * - Timer de duração
 * - Status de gravação
 * - Download do clip
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Circle,
  Square,
  Download,
  Trash2,
  Clock,
  Video,
  Pause,
  Play,
  Camera,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

interface ClipRecorderControlsProps {
  cameraId: string;
  cameraName: string;
  streamRef?: React.RefObject<HTMLVideoElement>;
  maxDuration?: number; // segundos
  onClipSaved?: (clip: SavedClip) => void;
  className?: string;
  compact?: boolean;
}

interface SavedClip {
  id: string;
  cameraId: string;
  cameraName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  blob: Blob;
  url: string;
  thumbnail?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'saved';

// ============================================
// HELPER: Format Duration
// ============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ClipRecorderControls({
  cameraId,
  cameraName,
  streamRef,
  maxDuration = 300, // 5 minutos
  onClipSaved,
  className,
  compact = false,
}: ClipRecorderControlsProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [savedClip, setSavedClip] = useState<SavedClip | null>(null);
  const [clipDurationSetting, setClipDurationSetting] = useState(60);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Iniciar gravação
  const startRecording = useCallback(async () => {
    try {
      // Verificar se temos acesso ao stream
      let stream: MediaStream | null = null;

      if (streamRef?.current?.captureStream) {
        stream = streamRef.current.captureStream();
      } else if (streamRef?.current?.srcObject instanceof MediaStream) {
        stream = streamRef.current.srcObject;
      }

      if (!stream) {
        // Fallback: capturar a tela do vídeo como canvas
        toast.error('Stream não disponível para gravação');
        return;
      }

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setState('processing');
        
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const endTime = new Date();
          const clipDuration = Math.round((endTime.getTime() - (startTimeRef.current?.getTime() || 0)) / 1000);

          // Gerar thumbnail (primeiro frame)
          let thumbnail: string | undefined;
          if (streamRef?.current) {
            const canvas = document.createElement('canvas');
            canvas.width = streamRef.current.videoWidth || 320;
            canvas.height = streamRef.current.videoHeight || 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(streamRef.current, 0, 0, canvas.width, canvas.height);
              thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            }
          }

          const clip: SavedClip = {
            id: `clip-${Date.now()}`,
            cameraId,
            cameraName,
            startTime: startTimeRef.current || new Date(),
            endTime,
            duration: clipDuration,
            blob,
            url,
            thumbnail,
          };

          setSavedClip(clip);
          setState('saved');
          onClipSaved?.(clip);
          toast.success(`Clip salvo: ${formatDuration(clipDuration)}`);
        } catch (error) {
          console.error('Erro ao processar clip:', error);
          setState('idle');
          toast.error('Erro ao processar gravação');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('Erro no MediaRecorder:', event);
        setState('idle');
        toast.error('Erro na gravação');
      };

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = new Date();
      setDuration(0);

      // Iniciar gravação
      mediaRecorder.start(1000); // Chunks a cada 1s
      setState('recording');

      // Timer de duração
      timerRef.current = setInterval(() => {
        setDuration(d => {
          const newDuration = d + 1;
          // Auto-stop se atingir duração máxima
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      toast.success('Gravação iniciada');
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error('Não foi possível iniciar a gravação');
    }
  }, [cameraId, cameraName, streamRef, maxDuration, onClipSaved]);

  // Parar gravação
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Pausar/Retomar (se suportado)
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else if (state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
  }, [state]);

  // Download do clip
  const downloadClip = useCallback(() => {
    if (!savedClip) return;

    const a = document.createElement('a');
    a.href = savedClip.url;
    a.download = `${cameraName.replace(/\s+/g, '_')}_${savedClip.startTime.toISOString().slice(0, 19).replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download iniciado');
  }, [savedClip, cameraName]);

  // Descartar clip
  const discardClip = useCallback(() => {
    if (savedClip?.url) {
      URL.revokeObjectURL(savedClip.url);
    }
    setSavedClip(null);
    setState('idle');
    setDuration(0);
  }, [savedClip]);

  // Progresso da gravação
  const progress = (duration / maxDuration) * 100;

  // Versão compacta
  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-1', className)}>
          {state === 'idle' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={startRecording}
                >
                  <Circle className="w-4 h-4 fill-red-500 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Iniciar gravação</TooltipContent>
            </Tooltip>
          )}

          {(state === 'recording' || state === 'paused') && (
            <>
              <Badge 
                variant="destructive" 
                className="gap-1 animate-pulse"
              >
                <Circle className="w-2 h-2 fill-current" />
                {formatDuration(duration)}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={stopRecording}
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Parar gravação</TooltipContent>
              </Tooltip>
            </>
          )}

          {state === 'processing' && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processando
            </Badge>
          )}

          {state === 'saved' && savedClip && (
            <>
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3" />
                {formatDuration(savedClip.duration)}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={downloadClip}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={discardClip}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Descartar</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Versão completa
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4" />
          <span className="text-sm font-medium">Gravação</span>
        </div>
        
        {state !== 'idle' && (
          <Badge 
            variant={state === 'recording' ? 'destructive' : 'secondary'}
            className={cn(state === 'recording' && 'animate-pulse')}
          >
            {state === 'recording' && 'Gravando'}
            {state === 'paused' && 'Pausado'}
            {state === 'processing' && 'Processando'}
            {state === 'saved' && 'Salvo'}
          </Badge>
        )}
      </div>

      {/* Timer e Progresso */}
      {(state === 'recording' || state === 'paused') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-lg">{formatDuration(duration)}</span>
            <span className="text-muted-foreground">/ {formatDuration(maxDuration)}</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2">
        {state === 'idle' && (
          <>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={startRecording}
            >
              <Circle className="w-4 h-4 mr-2 fill-current" />
              Gravar
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Clock className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <Label>Duração máxima: {formatDuration(clipDurationSetting)}</Label>
                  <Slider
                    value={[clipDurationSetting]}
                    onValueChange={([v]) => setClipDurationSetting(v)}
                    min={10}
                    max={maxDuration}
                    step={10}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {(state === 'recording' || state === 'paused') && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={togglePause}
            >
              {state === 'recording' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Retomar
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={stopRecording}
            >
              <Square className="w-4 h-4 mr-2 fill-current" />
              Parar
            </Button>
          </>
        )}

        {state === 'processing' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Processando clip...</span>
          </div>
        )}

        {state === 'saved' && savedClip && (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={downloadClip}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={discardClip}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Descartar
            </Button>
          </>
        )}
      </div>

      {/* Info do clip salvo */}
      {state === 'saved' && savedClip && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          {savedClip.thumbnail && (
            <img 
              src={savedClip.thumbnail} 
              alt="Thumbnail" 
              className="w-full h-20 object-cover rounded"
            />
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Duração:</span>
              <span className="font-medium">{formatDuration(savedClip.duration)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tamanho:</span>
              <span className="font-medium">
                {(savedClip.blob.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClipRecorderControls;
