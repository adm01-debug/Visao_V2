import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Home, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { usePtzControl } from '@/hooks/usePtzControl';

/**
 * Curso total assumido em ms para uma varredura completa (extremo → extremo).
 * Estimativa conservadora usada para normalizar o "jog" acumulado do usuário
 * em coordenadas [-1..1] quando o dispositivo não expõe `GetStatus` ONVIF.
 * Ajustar por marca/perfil no futuro se necessário.
 */
const FULL_SWEEP_MS = 8000;

export type PtzAxis = 'pan' | 'tilt' | 'zoom';
export type PtzLimits = Record<PtzAxis, { min: number; max: number }>;

interface PtzCalibrationPanelProps {
  ptz: ReturnType<typeof usePtzControl>;
  limits: PtzLimits;
  onChange: (next: PtzLimits) => void;
}

const AXIS_LABEL: Record<PtzAxis, string> = {
  pan: 'Horizontal (Pan)',
  tilt: 'Vertical (Tilt)',
  zoom: 'Zoom',
};

const AXIS_BOUNDS: Record<PtzAxis, [number, number]> = {
  pan: [-1, 1],
  tilt: [-1, 1],
  zoom: [0, 1],
};

export function PtzCalibrationPanel({ ptz, limits, onChange }: PtzCalibrationPanelProps) {
  // Posição estimada pelo tempo de jog acumulado (câmera real pode diferir).
  const [position, setPosition] = useState<Record<PtzAxis, number>>({ pan: 0, tilt: 0, zoom: 0 });
  const jogStartRef = useRef<{ axis: PtzAxis; dir: number; startedAt: number } | null>(null);

  const clamp = useCallback((axis: PtzAxis, v: number) => {
    const [lo, hi] = AXIS_BOUNDS[axis];
    return Math.max(lo, Math.min(hi, v));
  }, []);

  const beginJog = useCallback(async (axis: PtzAxis, dir: -1 | 1) => {
    if (jogStartRef.current) return;
    jogStartRef.current = { axis, dir, startedAt: Date.now() };
    try {
      if (axis === 'zoom') {
        await ptz.zoom(dir * 0.6, 4);
      } else {
        const params = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };
        await ptz.startMove({ ...params, speed: 4 });
      }
    } catch {
      jogStartRef.current = null;
    }
  }, [ptz]);

  const endJog = useCallback(async () => {
    const j = jogStartRef.current;
    jogStartRef.current = null;
    if (!j) return;
    const elapsed = Date.now() - j.startedAt;
    const delta = (elapsed / FULL_SWEEP_MS) * (AXIS_BOUNDS[j.axis][1] - AXIS_BOUNDS[j.axis][0]) * j.dir;
    setPosition((prev) => ({ ...prev, [j.axis]: clamp(j.axis, prev[j.axis] + delta) }));
    try {
      if (j.axis === 'zoom') await ptz.send('stop');
      else await ptz.stopMove();
    } catch {
      /* silencioso: o cleanup do lock cobre timeouts */
    }
  }, [ptz, clamp]);

  useEffect(() => {
    const abort = () => { void endJog(); };
    window.addEventListener('mouseup', abort);
    window.addEventListener('touchend', abort);
    window.addEventListener('blur', abort);
    return () => {
      window.removeEventListener('mouseup', abort);
      window.removeEventListener('touchend', abort);
      window.removeEventListener('blur', abort);
    };
  }, [endJog]);

  const capture = useCallback((axis: PtzAxis, edge: 'min' | 'max') => {
    const cur = position[axis];
    const other = edge === 'min' ? limits[axis].max : limits[axis].min;
    if (edge === 'min' && cur >= other) {
      toast.error(`Mínimo (${cur.toFixed(2)}) precisa ser menor que o máximo (${other.toFixed(2)})`);
      return;
    }
    if (edge === 'max' && cur <= other) {
      toast.error(`Máximo (${cur.toFixed(2)}) precisa ser maior que o mínimo (${other.toFixed(2)})`);
      return;
    }
    onChange({ ...limits, [axis]: { ...limits[axis], [edge]: Number(cur.toFixed(3)) } });
    toast.success(`${AXIS_LABEL[axis]} · limite ${edge === 'min' ? 'mínimo' : 'máximo'} capturado em ${cur.toFixed(2)}`);
  }, [position, limits, onChange]);

  const resetOrigin = useCallback(async () => {
    try { await ptz.home(); } catch { /* alguns firmwares recusam Home sem preset 1 */ }
    setPosition({ pan: 0, tilt: 0, zoom: 0 });
    toast.info('Origem redefinida (0, 0, 0)');
  }, [ptz]);

  const resetAxis = useCallback((axis: PtzAxis) => {
    onChange({ ...limits, [axis]: { min: AXIS_BOUNDS[axis][0], max: AXIS_BOUNDS[axis][1] } });
  }, [limits, onChange]);

  const JogButton = ({ axis, dir, icon }: { axis: PtzAxis; dir: -1 | 1; icon: React.ReactNode }) => (
    <Button
      size="sm"
      variant="outline"
      className="h-9 w-9 p-0 select-none"
      onMouseDown={() => void beginJog(axis, dir)}
      onTouchStart={(e) => { e.preventDefault(); void beginJog(axis, dir); }}
      onMouseUp={() => void endJog()}
      onMouseLeave={() => { if (jogStartRef.current) void endJog(); }}
      aria-label={`Mover ${axis} ${dir > 0 ? 'positivo' : 'negativo'}`}
    >
      {icon}
    </Button>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-md border p-3 bg-muted/30 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Segure os botões de jog para posicionar o dome e clique em <b>Marcar mínimo/máximo</b> para capturar
          o extremo desejado. A posição estimada usa uma varredura de referência de {(FULL_SWEEP_MS / 1000).toFixed(0)}s.
        </div>
        <Button size="sm" variant="secondary" onClick={() => void resetOrigin()}>
          <Home className="w-3.5 h-3.5 mr-1" /> Origem
        </Button>
      </div>

      {(['pan', 'tilt', 'zoom'] as const).map((axis) => {
        const l = limits[axis];
        const [lo, hi] = AXIS_BOUNDS[axis];
        return (
          <div key={axis} className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{AXIS_LABEL[axis]}</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  <Crosshair className="w-3 h-3 mr-1" /> pos {position[axis].toFixed(2)}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {l.min.toFixed(2)} → {l.max.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {axis === 'pan' && (
                <>
                  <JogButton axis="pan" dir={-1} icon={<ArrowLeft className="w-4 h-4" />} />
                  <JogButton axis="pan" dir={1} icon={<ArrowRight className="w-4 h-4" />} />
                </>
              )}
              {axis === 'tilt' && (
                <>
                  <JogButton axis="tilt" dir={1} icon={<ArrowUp className="w-4 h-4" />} />
                  <JogButton axis="tilt" dir={-1} icon={<ArrowDown className="w-4 h-4" />} />
                </>
              )}
              {axis === 'zoom' && (
                <>
                  <JogButton axis="zoom" dir={-1} icon={<ZoomOut className="w-4 h-4" />} />
                  <JogButton axis="zoom" dir={1} icon={<ZoomIn className="w-4 h-4" />} />
                </>
              )}
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => capture(axis, 'min')}>
                Marcar mínimo
              </Button>
              <Button size="sm" variant="outline" onClick={() => capture(axis, 'max')}>
                Marcar máximo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => resetAxis(axis)}>
                Reset
              </Button>
            </div>

            <Slider
              value={[l.min, l.max]}
              min={lo}
              max={hi}
              step={0.05}
              onValueChange={([min, max]) =>
                onChange({ ...limits, [axis]: { min: min ?? lo, max: max ?? hi } })
              }
            />
          </div>
        );
      })}

      <div className="text-[11px] text-muted-foreground">
        Dica: o comando PTZ em runtime aplica <code className="font-mono">clamp(valor, min, max)</code> antes
        de enviar ao firmware — valores fora do intervalo são rejeitados e registrados em
        <code className="font-mono"> ptz_connection_attempts</code>.
      </div>
    </div>
  );
}
