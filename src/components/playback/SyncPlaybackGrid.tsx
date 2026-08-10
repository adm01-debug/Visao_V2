/**
 * VISÃO — Grid de playback multi-câmera sincronizado
 *
 * Renderiza N players HTML5 lado a lado e mantém todos ancorados ao
 * mesmo cursor temporal. Feito para gravações servidas por HTTP (MP4,
 * HLS estático ou clips do storage). Cada player recebe uma `sourceUrl`
 * e o componente coordena play/pause/seek/velocidade.
 *
 * Sem dependências externas de player para manter bundle enxuto.
 * Compatível com futura evolução para HLS/live (basta trocar `<video>`
 * pelo `VideoStreamPlayer` já existente e propagar as mesmas ações).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Gauge, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SyncPlaybackSource {
  cameraId: string;
  cameraName: string;
  /** URL HTTP direta para o vídeo (MP4/WebM/HLS `.m3u8`). */
  sourceUrl: string;
  /** Timestamp ISO do início do clip — usado como âncora do cursor. */
  startsAt: string;
  /** Duração conhecida em segundos, quando disponível. */
  durationSec?: number;
}

interface Props {
  sources: SyncPlaybackSource[];
  columns?: 1 | 2 | 3 | 4;
  onRemove?: (cameraId: string) => void;
  className?: string;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2, 4] as const;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function SyncPlaybackGrid({ sources, columns = 2, onRemove, className }: Props) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [cursorSec, setCursorSec] = useState(0);
  const [rate, setRate] = useState<PlaybackRate>(1);
  const [readyCount, setReadyCount] = useState(0);

  // Duração máxima entre todas as fontes — vira o eixo do slider.
  const maxDuration = useMemo(() => {
    let max = 0;
    for (const s of sources) {
      const el = videoRefs.current.get(s.cameraId);
      const d = el?.duration ?? s.durationSec ?? 0;
      if (Number.isFinite(d) && d > max) max = d;
    }
    return max;
  }, [sources, readyCount]);

  const applyToAll = useCallback((fn: (v: HTMLVideoElement) => void) => {
    videoRefs.current.forEach((el) => {
      try {
        fn(el);
      } catch {
        /* player pode estar em transição — ignorar */
      }
    });
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) applyToAll((v) => void v.play().catch(() => setIsPlaying(false)));
      else applyToAll((v) => v.pause());
      return next;
    });
  }, [applyToAll]);

  const seekTo = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(sec, maxDuration || sec));
      setCursorSec(clamped);
      applyToAll((v) => {
        if (Number.isFinite(v.duration)) v.currentTime = Math.min(clamped, v.duration);
      });
    },
    [applyToAll, maxDuration]
  );

  const jump = useCallback((delta: number) => seekTo(cursorSec + delta), [cursorSec, seekTo]);

  useEffect(() => {
    applyToAll((v) => {
      v.playbackRate = rate;
    });
  }, [rate, applyToAll]);

  // Cursor mestre: atualizamos a partir do vídeo com maior progresso
  // para que a UI reflita drift real entre streams (todos com o mesmo
  // startsAt, mas latências de buffering variam).
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      let leader = 0;
      videoRefs.current.forEach((v) => {
        if (v.currentTime > leader) leader = v.currentTime;
      });
      setCursorSec(leader);
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const gridCols =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  if (sources.length === 0) {
    return (
      <div
        className={cn(
          'flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground',
          className
        )}
      >
        Selecione uma ou mais câmeras para iniciar o playback sincronizado.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className={cn('grid gap-3', gridCols)}>
        {sources.map((s) => (
          <div
            key={s.cameraId}
            className="group relative overflow-hidden rounded-lg border border-border bg-black"
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(s.cameraId, el);
                else videoRefs.current.delete(s.cameraId);
              }}
              src={s.sourceUrl}
              muted
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
              onLoadedMetadata={() => setReadyCount((c) => c + 1)}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-2">
              <Badge
                variant="secondary"
                className="pointer-events-auto max-w-[70%] truncate text-xs"
              >
                {s.cameraName}
              </Badge>
              {onRemove && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="pointer-events-auto h-6 w-6 text-white hover:bg-white/10"
                  onClick={() => onRemove(s.cameraId)}
                  aria-label={`Remover ${s.cameraName} do playback`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => jump(-10)}
            aria-label="Retroceder 10 segundos"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => jump(10)}
            aria-label="Avançar 10 segundos"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 items-center gap-3 px-2">
            <span className="tabular-nums text-xs text-muted-foreground">
              {formatTime(cursorSec)}
            </span>
            <Slider
              value={[cursorSec]}
              max={Math.max(maxDuration, 1)}
              step={0.5}
              onValueChange={(v) => seekTo(v[0] ?? 0)}
              aria-label="Cursor de playback"
              className="flex-1"
            />
            <span className="tabular-nums text-xs text-muted-foreground">
              {formatTime(maxDuration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <Select value={String(rate)} onValueChange={(v) => setRate(Number(v) as PlaybackRate)}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAYBACK_RATES.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

export default SyncPlaybackGrid;
