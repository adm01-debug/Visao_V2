/**
 * VISÃO - AlertReplayPlayer
 *
 * Player de replay curto (antes/depois do evento) usando frames bufferizados
 * em memória pelo `useFrameBuffer`. Mostra:
 *  - Frame atual da reprodução
 *  - Marcador "EVENTO" no momento do alerta
 *  - Controles de play/pause, scrub e velocidade
 *  - Aviso quando não há frames disponíveis (buffer vazio)
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Camera as CameraIcon, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useReplayQuery, FRAME_BUFFER_CONFIG, type BufferedFrame } from '@/hooks/useFrameBuffer';

export interface AlertReplayPlayerProps {
  cameraId: string;
  cameraName: string;
  eventTime: Date | string;
  /** Segundos antes do evento (default 30) */
  beforeSec?: number;
  /** Segundos depois do evento (default 30) */
  afterSec?: number;
  /** Frames externos (ex.: de um clip já gravado). Se omitido, usa o buffer em memória. */
  frames?: BufferedFrame[];
  className?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const SEVERITY_RING: Record<string, string> = {
  low: 'ring-primary/40',
  medium: 'ring-warning/50',
  high: 'ring-destructive/60',
  critical: 'ring-destructive/80',
};

export function AlertReplayPlayer({
  cameraId,
  cameraName,
  eventTime,
  beforeSec = FRAME_BUFFER_CONFIG.DEFAULT_BEFORE,
  afterSec = FRAME_BUFFER_CONFIG.DEFAULT_AFTER,
  frames: externalFrames,
  className,
  severity = 'medium',
}: AlertReplayPlayerProps) {
  const { getReplay } = useReplayQuery();
  const eventDate = useMemo(
    () => (typeof eventTime === 'string' ? new Date(eventTime) : eventTime),
    [eventTime],
  );

  const frames = useMemo<BufferedFrame[]>(() => {
    if (externalFrames && externalFrames.length > 0) return externalFrames;
    return getReplay(cameraId, eventDate, beforeSec, afterSec);
  }, [externalFrames, getReplay, cameraId, eventDate, beforeSec, afterSec]);

  const totalFrames = frames.length;
  const eventTs = eventDate.getTime();

  // Index inicial = frame mais próximo do evento
  const initialIdx = useMemo(() => {
    if (totalFrames === 0) return 0;
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < totalFrames; i++) {
      const f = frames[i];
      if (!f) continue;
      const d = Math.abs(f.t - eventTs);
      if (d < bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    return best;
  }, [frames, eventTs, totalFrames]);

  const [idx, setIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Reset quando os frames mudam (ex.: outro alerta selecionado)
  useEffect(() => {
    setIdx(initialIdx);
    setIsPlaying(false);
  }, [initialIdx, totalFrames]);

  // Loop de reprodução: ~8 fps base, multiplicado por speed
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return undefined;
    const baseInterval = 125; // ms entre frames (8 fps)
    const interval = baseInterval / speed;

    function tick(now: number) {
      if (now - lastTickRef.current >= interval) {
        lastTickRef.current = now;
        setIdx((i) => {
          if (i >= totalFrames - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, totalFrames]);

  const currentFrame = totalFrames > 0 ? frames[Math.min(idx, totalFrames - 1)] : null;
  const offsetMs = currentFrame ? currentFrame.t - eventTs : 0;
  const offsetLabel =
    offsetMs === 0
      ? 'Evento'
      : offsetMs < 0
        ? `-${(Math.abs(offsetMs) / 1000).toFixed(1)}s`
        : `+${(offsetMs / 1000).toFixed(1)}s`;

  // Posição do marcador "EVENTO" no slider (0..100)
  const eventMarkerPct = useMemo(() => {
    if (totalFrames < 2) return 50;
    const firstF = frames[0];
    const lastF = frames[totalFrames - 1];
    if (!firstF || !lastF || lastF.t === firstF.t) return 50;
    return ((eventTs - firstF.t) / (lastF.t - firstF.t)) * 100;
  }, [frames, totalFrames, eventTs]);

  const handleReset = useCallback(() => {
    setIdx(0);
    setIsPlaying(true);
  }, []);

  const handleJumpToEvent = useCallback(() => {
    setIdx(initialIdx);
    setIsPlaying(false);
  }, [initialIdx]);

  if (totalFrames === 0) {
    return (
      <div
        className={cn(
          'glass-card p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[280px]',
          className,
        )}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <CameraIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">Replay indisponível</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Não há frames bufferizados para <strong>{cameraName}</strong> ao redor do horário do evento.
            O buffer só captura cenas enquanto a câmera está sendo visualizada ao vivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      {/* Frame */}
      <div
        className={cn(
          // eslint-disable-next-line visao/no-hardcoded-colors -- player de vídeo precisa de fundo preto
          'relative aspect-video bg-black ring-2 ring-inset',
          SEVERITY_RING[severity] ?? SEVERITY_RING.medium,
        )}
      >
        {currentFrame ? (
          <img
            src={currentFrame.src}
            alt={`Frame replay ${cameraName} ${offsetLabel}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : null}

        {/* HUD */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <Badge variant="outline" className="bg-background/70 backdrop-blur-sm gap-1">
            <CameraIcon className="w-3 h-3" />
            {cameraName}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'bg-background/70 backdrop-blur-sm font-mono tabular-nums',
              offsetMs === 0 && 'border-destructive text-destructive',
            )}
          >
            {offsetLabel}
          </Badge>
        </div>

        {/* Marcador de evento quando estamos exatamente no momento */}
        {Math.abs(offsetMs) < 600 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse">
            <div className="bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Evento</span>
            </div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="p-3 space-y-3 bg-card/50">
        {/* Slider com marcador */}
        <div className="relative pt-2">
          <Slider
            value={[idx]}
            min={0}
            max={Math.max(0, totalFrames - 1)}
            step={1}
            onValueChange={(v) => {
              setIdx(v[0] ?? 0);
              setIsPlaying(false);
            }}
            aria-label="Linha do tempo do replay"
          />
          {/* Marcador visual do momento do evento */}
          <div
            className="absolute top-0 -translate-x-1/2 pointer-events-none"
            style={{ left: `${eventMarkerPct}%` }}
            aria-hidden
          >
            <div className="w-px h-2 bg-destructive" />
            <div className="text-[9px] font-bold text-destructive uppercase tracking-wider -translate-x-1/2 ml-px">
              ●
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() = aria-label="Pausar"> setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="h-8 w-8"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReset}
              aria-label="Reiniciar do começo"
              className="h-8 w-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleJumpToEvent}
              className="h-8 text-xs gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              Ir ao evento
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gauge className="w-3 h-3" />
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  'px-1.5 py-0.5 rounded font-mono tabular-nums transition-colors',
                  speed === s
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground',
                )}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
            <span className="ml-2 font-mono tabular-nums">
              {idx + 1}/{totalFrames}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertReplayPlayer;
