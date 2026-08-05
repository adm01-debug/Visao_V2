import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Download,
  Gauge,
  History,
  Home,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  Signal,
  Target,
  TriangleAlert,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { usePtzControl } from '@/hooks/usePtzControl';
import { PtzLimitPreflightDialog } from './PtzLimitPreflightDialog';
import { PtzMultiAxisPreflightDialog } from './PtzMultiAxisPreflightDialog';
import { PtzPreflightHistory } from './PtzPreflightHistory';
import { PtzAxisRangeVisualizer } from './PtzAxisRangeVisualizer';
import { formatHistorySummary, type LimitsHistoryItem } from './lib/limitsHistory';
import { PtzLiveStatusPanel } from './PtzLiveStatusPanel';

/**
 * Curso total (ms) assumido como *fallback* quando o dome não expõe ONVIF
 * GetStatus. Quando a medição real por eixo (`sweepMsByAxis`) está
 * disponível, ela é usada em vez deste valor.
 */
const FULL_SWEEP_MS = 8000;

/** Intervalo do polling GetStatus durante "Medir sweep real". */
const POLL_INTERVAL_MS = 200;
/** Timeout máximo por eixo antes de considerar a medição inconclusiva. */
const MEASURE_TIMEOUT_MS = 15_000;
/** Δ mínimo (fração do range) para considerar o dome ainda em movimento. */
const STALL_EPSILON = 0.005;
/** Amostras consecutivas abaixo do épsilon para confirmar parada por limite. */
const STALL_CONFIRM_SAMPLES = 3;

/**
 * Desvio (em % do range) reportado pela revalidação a partir do qual as
 * capturas de min/max daquele eixo são invalidadas automaticamente e o
 * operador é obrigado a executar a recaptura guiada antes de prosseguir.
 */
const RECAPTURE_THRESHOLD_PCT = 10;

export type PtzAxis = 'pan' | 'tilt' | 'zoom';
export type PtzLimits = Record<PtzAxis, { min: number; max: number }>;

interface CalibrationEntry {
  sweep_ms: number;
  min_reported: number;
  max_reported: number;
  measured_at: string;
}
type CalibrationMap = Partial<Record<PtzAxis, CalibrationEntry>>;

interface PtzCalibrationPanelProps {
  ptz: ReturnType<typeof usePtzControl>;
  limits: PtzLimits;
  onChange: (next: PtzLimits) => void;
  /** Necessário para persistir a calibração em `camera_ptz_config.calibration`. */
  cameraId?: string;
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

export function PtzCalibrationPanel({ ptz, limits, onChange, cameraId }: PtzCalibrationPanelProps) {
  // Posição estimada — via GetStatus quando disponível, senão via integração de tempo.
  const [position, setPosition] = useState<Record<PtzAxis, number>>({ pan: 0, tilt: 0, zoom: 0 });
  const jogStartRef = useRef<{ axis: PtzAxis; dir: number; startedAt: number } | null>(null);

  // Suporte a ONVIF GetStatus (detectado no mount).
  const [statusSupported, setStatusSupported] = useState<boolean | null>(null);
  const [statusMoving, setStatusMoving] = useState<{
    pan_tilt: boolean | null;
    zoom: boolean | null;
  }>({
    pan_tilt: null,
    zoom: null,
  });

  // Sweep real medido por eixo (persistido em camera_ptz_config.calibration).
  const [sweepMsByAxis, setSweepMsByAxis] = useState<Partial<Record<PtzAxis, number>>>({});
  const [calibration, setCalibration] = useState<CalibrationMap>({});
  const [measuringAxis, setMeasuringAxis] = useState<PtzAxis | null>(null);
  const measureAbortRef = useRef<boolean>(false);

  // Rastreia quais eixos tiveram min/max capturados NESTA sessão (habilita pré-voo).
  const [freshCaptures, setFreshCaptures] = useState<
    Record<PtzAxis, { min: boolean; max: boolean }>
  >({
    pan: { min: false, max: false },
    tilt: { min: false, max: false },
    zoom: { min: false, max: false },
  });
  const [preflightAxis, setPreflightAxis] = useState<PtzAxis | null>(null);
  const [preflightHistoryKey, setPreflightHistoryKey] = useState<number>(0);
  const [multiPreflightOpen, setMultiPreflightOpen] = useState(false);

  // Revalidação: comando tempo-baseado → posição reportada. Erro estimado por eixo.
  interface RevalidationResult {
    predicted_delta: number;
    actual_delta: number;
    error_abs: number;
    error_pct: number; // |erro| / range em %
    direction: -1 | 1;
    duration_ms: number;
    p0: number;
    p1: number;
    at: string;
  }
  const [validation, setValidation] = useState<Partial<Record<PtzAxis, RevalidationResult>>>({});
  const [revalidatingAxis, setRevalidatingAxis] = useState<PtzAxis | null>(null);

  // Recaptura guiada — disparada quando a revalidação apontar desvio > threshold.
  const [pendingRecaptureAxis, setPendingRecaptureAxis] = useState<PtzAxis | null>(null);
  const [recapturingAxis, setRecapturingAxis] = useState<PtzAxis | null>(null);
  const [recaptureStage, setRecaptureStage] = useState<'idle' | 'to-min' | 'to-max' | 'done'>(
    'idle'
  );
  const [recaptureProgress, setRecaptureProgress] = useState(0);
  const recaptureAbortRef = useRef<boolean>(false);

  // Edição manual do observado (min_reported/max_reported) por eixo.
  const [observedDraft, setObservedDraft] = useState<
    Partial<Record<PtzAxis, { min: string; max: string }>>
  >({});
  const [savingObservedAxis, setSavingObservedAxis] = useState<PtzAxis | null>(null);

  // Versionamento — carregado do banco.
  const [limitsVersion, setLimitsVersion] = useState<string | null>(null);
  const [limitsHistory, setLimitsHistory] = useState<LimitsHistoryItem[]>([]);

  // Export/Import da calibração como JSON (reuso entre câmeras similares).
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importingCalibration, setImportingCalibration] = useState(false);

  const CALIBRATION_EXPORT_VERSION = 1;

  const handleExportCalibration = useCallback(() => {
    if (Object.keys(calibration).length === 0) {
      toast.error('Nenhuma calibração para exportar.');
      return;
    }
    const payload = {
      kind: 'visao.ptz.calibration',
      version: CALIBRATION_EXPORT_VERSION,
      exported_at: new Date().toISOString(),
      camera_id: cameraId ?? null,
      limits,
      calibration,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ptz-calibration-${cameraId ?? 'camera'}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Calibração exportada como JSON.');
  }, [calibration, cameraId, limits]);

  const isValidCalibrationEntry = (e: unknown): e is CalibrationEntry => {
    if (!e || typeof e !== 'object') return false;
    const o = e as Record<string, unknown>;
    return (
      typeof o.sweep_ms === 'number' &&
      Number.isFinite(o.sweep_ms) &&
      o.sweep_ms > 0 &&
      typeof o.min_reported === 'number' &&
      Number.isFinite(o.min_reported) &&
      typeof o.max_reported === 'number' &&
      Number.isFinite(o.max_reported) &&
      typeof o.measured_at === 'string'
    );
  };

  const handleImportCalibration = useCallback(
    async (file: File) => {
      if (!cameraId) {
        toast.error('Câmera sem ID — impossível importar.');
        return;
      }
      setImportingCalibration(true);
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          toast.error('Arquivo inválido: JSON malformado.');
          return;
        }
        const obj = parsed as Record<string, unknown>;
        if (obj?.kind !== 'visao.ptz.calibration') {
          toast.error('Arquivo não parece ser uma calibração PTZ exportada.');
          return;
        }
        const cal = obj.calibration as Record<string, unknown> | undefined;
        if (!cal || typeof cal !== 'object') {
          toast.error('Campo "calibration" ausente ou inválido.');
          return;
        }
        const next: CalibrationMap = {};
        const nextSweep: Partial<Record<PtzAxis, number>> = {};
        for (const axis of ['pan', 'tilt', 'zoom'] as PtzAxis[]) {
          const entry = cal[axis];
          if (entry === undefined) continue;
          if (!isValidCalibrationEntry(entry)) {
            toast.error(`Entrada inválida para o eixo ${AXIS_LABEL[axis]}.`);
            return;
          }
          next[axis] = entry;
          nextSweep[axis] = entry.sweep_ms;
        }
        if (Object.keys(next).length === 0) {
          toast.error('Nenhum eixo válido no arquivo importado.');
          return;
        }
        const { error } = await supabase
          .from('camera_ptz_config')
          .update({ calibration: next as unknown as Json })
          .eq('camera_id', cameraId);
        if (error) {
          toast.error(`Falha ao salvar calibração importada: ${error.message}`);
          return;
        }
        setCalibration(next);
        setSweepMsByAxis(nextSweep);
        toast.success(`Calibração importada (${Object.keys(next).length} eixo(s)).`);
      } finally {
        setImportingCalibration(false);
      }
    },
    [cameraId]
  );

  const clamp = useCallback((axis: PtzAxis, v: number) => {
    const [lo, hi] = AXIS_BOUNDS[axis];
    return Math.max(lo, Math.min(hi, v));
  }, []);

  // Detecção inicial de suporte a GetStatus + sincronização do estado da posição.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const st = await ptz.getStatus();
      if (cancelled) return;
      if (!st) {
        setStatusSupported(false);
        return;
      }
      setStatusSupported(true);
      setStatusMoving(st.moving);
      setPosition((prev) => ({
        pan: st.position.pan != null ? clamp('pan', st.position.pan) : prev.pan,
        tilt: st.position.tilt != null ? clamp('tilt', st.position.tilt) : prev.tilt,
        zoom: st.position.zoom != null ? clamp('zoom', st.position.zoom) : prev.zoom,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [ptz, clamp]);

  // Carrega calibração já persistida em camera_ptz_config.
  useEffect(() => {
    if (!cameraId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('camera_ptz_config')
        .select('calibration, limits_version, limits_history')
        .eq('camera_id', cameraId)
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as {
        calibration: Json | null;
        limits_version: string | null;
        limits_history: Json | null;
      };
      if (row.limits_version) setLimitsVersion(row.limits_version);
      if (Array.isArray(row.limits_history)) {
        setLimitsHistory(row.limits_history as unknown as LimitsHistoryItem[]);
      }
      if (!row.calibration || typeof row.calibration !== 'object') return;
      const cal = row.calibration as CalibrationMap;
      setCalibration(cal);
      const next: Partial<Record<PtzAxis, number>> = {};
      for (const axis of ['pan', 'tilt', 'zoom'] as PtzAxis[]) {
        const entry = cal[axis];
        if (entry && Number.isFinite(entry.sweep_ms) && entry.sweep_ms > 0) {
          next[axis] = entry.sweep_ms;
        }
      }
      setSweepMsByAxis(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  const beginJog = useCallback(
    async (axis: PtzAxis, dir: -1 | 1) => {
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
    },
    [ptz]
  );

  const endJog = useCallback(async () => {
    const j = jogStartRef.current;
    jogStartRef.current = null;
    if (!j) return;
    const elapsed = Date.now() - j.startedAt;
    // Prefere a medição real por eixo; cai para o FULL_SWEEP_MS quando ausente.
    const sweep = sweepMsByAxis[j.axis] ?? FULL_SWEEP_MS;
    const range = AXIS_BOUNDS[j.axis][1] - AXIS_BOUNDS[j.axis][0];
    const delta = (elapsed / sweep) * range * j.dir;
    try {
      if (j.axis === 'zoom') await ptz.send('stop');
      else await ptz.stopMove();
    } catch {
      /* silencioso: o cleanup do lock cobre timeouts */
    }
    // Se o dome expõe GetStatus, prefere a posição autoritativa.
    if (statusSupported) {
      const st = await ptz.getStatus();
      if (st) {
        setStatusMoving(st.moving);
        setPosition((prev) => ({
          pan: st.position.pan != null ? clamp('pan', st.position.pan) : prev.pan,
          tilt: st.position.tilt != null ? clamp('tilt', st.position.tilt) : prev.tilt,
          zoom: st.position.zoom != null ? clamp('zoom', st.position.zoom) : prev.zoom,
        }));
        return;
      }
    }
    setPosition((prev) => ({ ...prev, [j.axis]: clamp(j.axis, prev[j.axis] + delta) }));
  }, [ptz, clamp, sweepMsByAxis, statusSupported]);

  useEffect(() => {
    const abort = () => {
      void endJog();
    };
    window.addEventListener('mouseup', abort);
    window.addEventListener('touchend', abort);
    window.addEventListener('blur', abort);
    return () => {
      window.removeEventListener('mouseup', abort);
      window.removeEventListener('touchend', abort);
      window.removeEventListener('blur', abort);
    };
  }, [endJog]);

  const capture = useCallback(
    (axis: PtzAxis, edge: 'min' | 'max') => {
      const cur = position[axis];
      const other = edge === 'min' ? limits[axis].max : limits[axis].min;
      if (edge === 'min' && cur >= other) {
        toast.error(
          `Mínimo (${cur.toFixed(2)}) precisa ser menor que o máximo (${other.toFixed(2)})`
        );
        return;
      }
      if (edge === 'max' && cur <= other) {
        toast.error(
          `Máximo (${cur.toFixed(2)}) precisa ser maior que o mínimo (${other.toFixed(2)})`
        );
        return;
      }
      onChange({ ...limits, [axis]: { ...limits[axis], [edge]: Number(cur.toFixed(3)) } });
      setFreshCaptures((prev) => ({ ...prev, [axis]: { ...prev[axis], [edge]: true } }));
      toast.success(
        `${AXIS_LABEL[axis]} · limite ${edge === 'min' ? 'mínimo' : 'máximo'} capturado em ${cur.toFixed(2)}`
      );
    },
    [position, limits, onChange]
  );

  const resetOrigin = useCallback(async () => {
    try {
      await ptz.home();
    } catch {
      /* alguns firmwares recusam Home sem preset 1 */
    }
    setPosition({ pan: 0, tilt: 0, zoom: 0 });
    toast.info('Origem redefinida (0, 0, 0)');
  }, [ptz]);

  const resetAxis = useCallback(
    (axis: PtzAxis) => {
      onChange({ ...limits, [axis]: { min: AXIS_BOUNDS[axis][0], max: AXIS_BOUNDS[axis][1] } });
      setFreshCaptures((prev) => ({ ...prev, [axis]: { min: false, max: false } }));
    },
    [limits, onChange]
  );

  /**
   * Rotina de medição real do sweep: aciona o dome em direção `+1` a velocidade
   * fixa (0.6) e amostra GetStatus a cada 200ms até parar por MoveStatus=IDLE,
   * estagnação (dome bateu no limite) ou timeout de 15s.
   */
  const measureSweep = useCallback(
    async (axis: PtzAxis) => {
      if (!statusSupported) {
        toast.error('Medição indisponível (driver não expõe GetStatus)');
        return;
      }
      if (measuringAxis || jogStartRef.current) return;
      setMeasuringAxis(axis);
      measureAbortRef.current = false;

      const startedAt = performance.now();
      let p0: number | null = null;
      let pLast: number | null = null;
      let stallCount = 0;
      let minReported = Number.POSITIVE_INFINITY;
      let maxReported = Number.NEGATIVE_INFINITY;
      const range = AXIS_BOUNDS[axis][1] - AXIS_BOUNDS[axis][0];

      const readAxis = (st: Awaited<ReturnType<typeof ptz.getStatus>>): number | null => {
        if (!st) return null;
        const v = st.position[axis];
        return typeof v === 'number' && Number.isFinite(v) ? clamp(axis, v) : null;
      };
      const isMoving = (st: Awaited<ReturnType<typeof ptz.getStatus>>): boolean | null => {
        if (!st) return null;
        return axis === 'zoom' ? st.moving.zoom : st.moving.pan_tilt;
      };

      try {
        // Amostra p0.
        const st0 = await ptz.getStatus();
        p0 = readAxis(st0);
        if (p0 == null) {
          toast.error(`GetStatus não reportou posição para ${AXIS_LABEL[axis]}.`);
          return;
        }
        minReported = maxReported = p0;
        setPosition((prev) => ({ ...prev, [axis]: p0! }));

        // Aciona movimento +1.
        if (axis === 'zoom') {
          await ptz.zoom(0.6, 4);
        } else {
          const params = axis === 'pan' ? { pan: 0.6, tilt: 0 } : { pan: 0, tilt: 0.6 };
          await ptz.startMove({ ...params, speed: 4 });
        }

        // Loop de polling.
        while (performance.now() - startedAt < MEASURE_TIMEOUT_MS) {
          if (measureAbortRef.current) break;
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          const st = await ptz.getStatus();
          const p = readAxis(st);
          const mv = isMoving(st);
          if (p != null) {
            pLast = p;
            minReported = Math.min(minReported, p);
            maxReported = Math.max(maxReported, p);
            setPosition((prev) => ({ ...prev, [axis]: p }));
          }
          if (st) setStatusMoving(st.moving);
          // Critério 1: MoveStatus reportou IDLE após já ter observado movimento.
          if (mv === false && pLast != null && Math.abs(pLast - p0) > STALL_EPSILON * range * 0.5)
            break;
          // Critério 2: estagnação (bateu no limite físico).
          if (pLast != null) {
            const dP = Math.abs(p != null ? p - pLast : 0);
            if (dP < STALL_EPSILON * range) stallCount += 1;
            else stallCount = 0;
            if (stallCount >= STALL_CONFIRM_SAMPLES) break;
          }
        }
      } finally {
        // Para o dome sempre.
        try {
          if (axis === 'zoom') await ptz.send('stop');
          else await ptz.stopMove();
        } catch {
          /* noop */
        }
        setMeasuringAxis(null);
      }

      if (p0 == null || pLast == null) {
        toast.error(`Medição inconclusiva em ${AXIS_LABEL[axis]}.`);
        return;
      }
      const elapsed = performance.now() - startedAt;
      const traveled = Math.abs(pLast - p0);
      if (traveled < STALL_EPSILON * range) {
        toast.error(
          `Dome não se moveu o suficiente em ${AXIS_LABEL[axis]} (Δ=${traveled.toFixed(3)}).`
        );
        return;
      }
      const sweep_ms = Math.round((elapsed / traveled) * range);
      const entry: CalibrationEntry = {
        sweep_ms,
        min_reported: Number(minReported.toFixed(3)),
        max_reported: Number(maxReported.toFixed(3)),
        measured_at: new Date().toISOString(),
      };

      setSweepMsByAxis((prev) => ({ ...prev, [axis]: sweep_ms }));
      const nextCalibration = { ...calibration, [axis]: entry };
      setCalibration(nextCalibration);

      if (cameraId) {
        const { error } = await supabase
          .from('camera_ptz_config')
          .update({ calibration: nextCalibration as unknown as Json })
          .eq('camera_id', cameraId);
        if (error) {
          toast.warning(
            `Sweep de ${AXIS_LABEL[axis]}: ${sweep_ms} ms medidos, mas não persistidos (${error.message}).`
          );
          return;
        }
      }
      toast.success(
        `${AXIS_LABEL[axis]}: sweep real ≈ ${(sweep_ms / 1000).toFixed(2)}s ` +
          `(observado ${entry.min_reported.toFixed(2)} → ${entry.max_reported.toFixed(2)})`
      );
    },
    [statusSupported, measuringAxis, ptz, clamp, calibration, cameraId]
  );

  /**
   * Revalida a calibração: envia um comando por tempo baseado no `sweep_ms`
   * atualmente calibrado e compara o Δ predito com o Δ real reportado pelo
   * GetStatus ao fim do movimento. Retorna erro absoluto e percentual do range.
   * Escolhe automaticamente a direção com maior folga em relação aos limites
   * calibrados para evitar bater no fim de curso durante o teste.
   */
  const revalidateCalibration = useCallback(
    async (axis: PtzAxis) => {
      if (!statusSupported) {
        toast.error('Revalidação indisponível (driver não expõe GetStatus)');
        return;
      }
      const sweep = sweepMsByAxis[axis];
      if (!sweep || sweep <= 0) {
        toast.error(`Meça o sweep real de ${AXIS_LABEL[axis]} antes de revalidar.`);
        return;
      }
      if (measuringAxis || revalidatingAxis || jogStartRef.current) return;

      setRevalidatingAxis(axis);
      const range = AXIS_BOUNDS[axis][1] - AXIS_BOUNDS[axis][0];
      try {
        const st0 = await ptz.getStatus();
        const p0raw = st0?.position[axis];
        if (typeof p0raw !== 'number' || !Number.isFinite(p0raw)) {
          toast.error(`GetStatus não reportou posição inicial em ${AXIS_LABEL[axis]}.`);
          return;
        }
        const p0 = clamp(axis, p0raw);
        // Escolhe direção com maior folga dentro do range calibrado.
        const l = limits[axis];
        const marginPos = Math.max(0, l.max - p0);
        const marginNeg = Math.max(0, p0 - l.min);
        const direction: -1 | 1 = marginPos >= marginNeg ? 1 : -1;
        // Usa 30% do range disponível na direção escolhida (mín 0.10, máx 0.40).
        const available = direction === 1 ? marginPos : marginNeg;
        const targetDelta = Math.max(0.1, Math.min(0.4, available * 0.3));
        if (targetDelta < 0.05) {
          toast.error(`Sem folga suficiente para revalidar em ${AXIS_LABEL[axis]}.`);
          return;
        }
        const duration_ms = Math.round((targetDelta / range) * sweep);
        const predicted_delta = targetDelta * direction;

        // Aciona o movimento por `duration_ms`.
        if (axis === 'zoom') {
          await ptz.zoom(direction * 0.6, 4);
        } else {
          const params =
            axis === 'pan' ? { pan: direction * 0.6, tilt: 0 } : { pan: 0, tilt: direction * 0.6 };
          await ptz.startMove({ ...params, speed: 4 });
        }
        await new Promise((r) => setTimeout(r, duration_ms));
        try {
          if (axis === 'zoom') await ptz.send('stop');
          else await ptz.stopMove();
        } catch {
          /* noop */
        }
        // Pequena espera para o dome estabilizar antes de ler.
        await new Promise((r) => setTimeout(r, 250));

        const st1 = await ptz.getStatus();
        const p1raw = st1?.position[axis];
        if (typeof p1raw !== 'number' || !Number.isFinite(p1raw)) {
          toast.error(`GetStatus não reportou posição final em ${AXIS_LABEL[axis]}.`);
          return;
        }
        const p1 = clamp(axis, p1raw);
        setPosition((prev) => ({ ...prev, [axis]: p1 }));

        const actual_delta = p1 - p0;
        const error_abs = Math.abs(actual_delta - predicted_delta);
        const error_pct = (error_abs / range) * 100;
        const result: RevalidationResult = {
          predicted_delta: Number(predicted_delta.toFixed(3)),
          actual_delta: Number(actual_delta.toFixed(3)),
          error_abs: Number(error_abs.toFixed(3)),
          error_pct: Number(error_pct.toFixed(2)),
          direction,
          duration_ms,
          p0: Number(p0.toFixed(3)),
          p1: Number(p1.toFixed(3)),
          at: new Date().toISOString(),
        };
        setValidation((prev) => ({ ...prev, [axis]: result }));

        const severity = error_pct <= 5 ? 'success' : error_pct <= 15 ? 'warning' : 'error';
        const msg =
          `${AXIS_LABEL[axis]}: erro ${error_pct.toFixed(1)}% ` +
          `(predito ${predicted_delta.toFixed(2)}, real ${actual_delta.toFixed(2)})`;
        if (severity === 'success') toast.success(msg);
        else if (severity === 'warning') toast.warning(`${msg} — considere recalibrar`);
        else toast.error(`${msg} — recalibração recomendada`);
      } finally {
        try {
          if (axis === 'zoom') await ptz.send('stop');
          else await ptz.stopMove();
        } catch {
          /* noop */
        }
        setRevalidatingAxis(null);
      }
    },
    [statusSupported, sweepMsByAxis, measuringAxis, revalidatingAxis, ptz, clamp, limits]
  );

  /**
   * Eixos que apresentaram desvio > RECAPTURE_THRESHOLD_PCT na última
   * revalidação. Enquanto esse conjunto for não-vazio, os avanços
   * (pré-voo individual e multi-eixos) ficam bloqueados até nova captura.
   */
  const recaptureRequired = useMemo<Record<PtzAxis, boolean>>(() => {
    const pick = (a: PtzAxis) => {
      const v = validation[a];
      return !!v && v.error_pct > RECAPTURE_THRESHOLD_PCT;
    };
    return { pan: pick('pan'), tilt: pick('tilt'), zoom: pick('zoom') };
  }, [validation]);

  const hasRecaptureRequired =
    recaptureRequired.pan || recaptureRequired.tilt || recaptureRequired.zoom;

  // Ao detectar desvio acima do limiar, invalida as capturas frescas do eixo
  // — o pré-voo passa a exigir novo min/max antes de qualquer avanço.
  useEffect(() => {
    (['pan', 'tilt', 'zoom'] as const).forEach((a) => {
      if (recaptureRequired[a]) {
        setFreshCaptures((prev) =>
          prev[a].min || prev[a].max ? { ...prev, [a]: { min: false, max: false } } : prev
        );
      }
    });
  }, [recaptureRequired]);

  /**
   * Recaptura guiada de min/max: aciona o dome em direção negativa até a
   * estagnação (limite físico), captura o mínimo, faz o mesmo no sentido
   * positivo e captura o máximo. Persiste ambos como fresh e limpa a
   * revalidação anterior. Cancelável e usa o mesmo mecanismo de detecção
   * de parada da rotina de sweep.
   */
  const guidedRecapture = useCallback(
    async (axis: PtzAxis) => {
      if (!statusSupported) {
        toast.error('Recaptura guiada indisponível (driver não expõe GetStatus).');
        return;
      }
      if (measuringAxis || revalidatingAxis || recapturingAxis || jogStartRef.current) return;
      setRecapturingAxis(axis);
      setRecaptureStage('to-min');
      setRecaptureProgress(0);
      recaptureAbortRef.current = false;

      const range = AXIS_BOUNDS[axis][1] - AXIS_BOUNDS[axis][0];

      const readAxis = (st: Awaited<ReturnType<typeof ptz.getStatus>>): number | null => {
        if (!st) return null;
        const v = st.position[axis];
        return typeof v === 'number' && Number.isFinite(v) ? clamp(axis, v) : null;
      };
      const isMoving = (st: Awaited<ReturnType<typeof ptz.getStatus>>): boolean | null => {
        if (!st) return null;
        return axis === 'zoom' ? st.moving.zoom : st.moving.pan_tilt;
      };

      const driveToStall = async (dir: -1 | 1): Promise<number | null> => {
        const st0 = await ptz.getStatus();
        let p0 = readAxis(st0);
        if (p0 == null) return null;
        if (axis === 'zoom') await ptz.zoom(dir * 0.6, 4);
        else {
          const params = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };
          await ptz.startMove({ ...params, speed: 4 });
        }
        const started = performance.now();
        let pLast = p0;
        let stall = 0;
        try {
          while (performance.now() - started < MEASURE_TIMEOUT_MS) {
            if (recaptureAbortRef.current) break;
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            const st = await ptz.getStatus();
            const p = readAxis(st);
            const mv = isMoving(st);
            if (p != null) {
              setPosition((prev) => ({ ...prev, [axis]: p }));
              const dP = Math.abs(p - pLast);
              if (dP < STALL_EPSILON * range) stall += 1;
              else stall = 0;
              pLast = p;
            }
            const elapsed = performance.now() - started;
            setRecaptureProgress(Math.min(95, Math.round((elapsed / MEASURE_TIMEOUT_MS) * 100)));
            if (mv === false && Math.abs(pLast - p0) > STALL_EPSILON * range * 0.5) break;
            if (stall >= STALL_CONFIRM_SAMPLES) break;
          }
        } finally {
          try {
            if (axis === 'zoom') await ptz.send('stop');
            else await ptz.stopMove();
          } catch {
            /* noop */
          }
        }
        // Estabiliza e re-lê para captura autoritativa.
        await new Promise((r) => setTimeout(r, 250));
        const stF = await ptz.getStatus();
        const pF = readAxis(stF);
        return pF ?? pLast;
      };

      const startedAt = performance.now();
      let outcome: 'ok' | 'aborted' | 'invalid' | 'no_reading' = 'ok';
      let capturedMin: number | null = null;
      let capturedMax: number | null = null;
      let errorDetail: string | null = null;
      try {
        const pMin = await driveToStall(-1);
        capturedMin = pMin;
        if (recaptureAbortRef.current || pMin == null) {
          outcome = recaptureAbortRef.current ? 'aborted' : 'no_reading';
          errorDetail = 'Recaptura de mínimo abortada ou sem leitura.';
          toast.error(errorDetail);
          return;
        }
        setRecaptureStage('to-max');
        setRecaptureProgress(0);
        const pMax = await driveToStall(1);
        capturedMax = pMax;
        if (recaptureAbortRef.current || pMax == null) {
          outcome = recaptureAbortRef.current ? 'aborted' : 'no_reading';
          errorDetail = 'Recaptura de máximo abortada ou sem leitura.';
          toast.error(errorDetail);
          return;
        }
        if (pMin >= pMax) {
          outcome = 'invalid';
          errorDetail = `Recaptura inválida: min (${pMin.toFixed(2)}) ≥ max (${pMax.toFixed(2)}).`;
          toast.error(errorDetail);
          return;
        }
        const nextLimits: PtzLimits = {
          ...limits,
          [axis]: { min: Number(pMin.toFixed(3)), max: Number(pMax.toFixed(3)) },
        };
        onChange(nextLimits);
        setFreshCaptures((prev) => ({ ...prev, [axis]: { min: true, max: true } }));
        setValidation((prev) => {
          const next = { ...prev };
          delete next[axis];
          return next;
        });
        setPosition((prev) => ({ ...prev, [axis]: pMax }));
        setRecaptureStage('done');
        setRecaptureProgress(100);
        toast.success(
          `${AXIS_LABEL[axis]}: recaptura concluída [${pMin.toFixed(2)} → ${pMax.toFixed(2)}]. ` +
            `Clique em Salvar para persistir.`
        );
      } finally {
        // Auditoria: persistir toda recaptura (sucesso ou falha) em ptz_connection_attempts.
        if (cameraId) {
          const duration = Math.round(performance.now() - startedAt);
          try {
            const { data: authData } = await supabase.auth.getUser();
            const uid = authData.user?.id;
            if (uid) {
              const payload = JSON.stringify({
                axis,
                outcome,
                min_reported: capturedMin,
                max_reported: capturedMax,
                stage: recaptureStage,
                aborted: recaptureAbortRef.current,
                error: errorDetail,
              });
              await supabase.from('ptz_connection_attempts').insert({
                user_id: uid,
                camera_id: cameraId,
                backend: `recapture:${axis}`,
                ok: outcome === 'ok',
                reachable: statusSupported === true,
                http_status: 0,
                latency_ms: duration,
                error_detail: payload,
                used_relay: false,
                source: 'recapture',
              } as never);
            }
          } catch {
            /* best-effort audit */
          }
        }
        setRecapturingAxis(null);
        // Deixa o "done" visível por um instante e reseta.
        setTimeout(() => {
          setRecaptureStage('idle');
          setRecaptureProgress(0);
        }, 1200);
      }
    },
    [
      statusSupported,
      measuringAxis,
      revalidatingAxis,
      recapturingAxis,
      ptz,
      clamp,
      limits,
      onChange,
      cameraId,
      recaptureStage,
    ]
  );

  /**
   * Persiste ajuste manual dos valores observados (`min_reported`/`max_reported`)
   * quando a medição automática saturou no fim de curso do dome e o operador
   * quer registrar o range verdadeiro conhecido.
   */
  const saveObservedRange = useCallback(
    async (axis: PtzAxis) => {
      const draft = observedDraft[axis];
      if (!draft) return;
      const [lo, hi] = AXIS_BOUNDS[axis];
      const minN = Number(draft.min);
      const maxN = Number(draft.max);
      if (!Number.isFinite(minN) || !Number.isFinite(maxN)) {
        toast.error('Valores inválidos: use números decimais.');
        return;
      }
      if (minN < lo || maxN > hi) {
        toast.error(`Fora do intervalo permitido [${lo}, ${hi}].`);
        return;
      }
      if (minN >= maxN) {
        toast.error('Mínimo precisa ser menor que o máximo.');
        return;
      }
      const existing = calibration[axis];
      const entry: CalibrationEntry = {
        sweep_ms: existing?.sweep_ms ?? 0,
        min_reported: Number(minN.toFixed(3)),
        max_reported: Number(maxN.toFixed(3)),
        measured_at: new Date().toISOString(),
      };
      const nextCalibration = { ...calibration, [axis]: entry };

      if (cameraId) {
        setSavingObservedAxis(axis);
        const { error } = await supabase
          .from('camera_ptz_config')
          .update({ calibration: nextCalibration as unknown as Json })
          .eq('camera_id', cameraId);
        setSavingObservedAxis(null);
        if (error) {
          toast.error(`Falha ao salvar observado: ${error.message}`);
          return;
        }
      }
      setCalibration(nextCalibration);
      setObservedDraft((prev) => ({ ...prev, [axis]: undefined }));
      toast.success(
        `${AXIS_LABEL[axis]}: observado atualizado para [${minN.toFixed(2)} → ${maxN.toFixed(2)}]`
      );
    },
    [observedDraft, calibration, cameraId]
  );

  const JogButton = ({
    axis,
    dir,
    icon,
  }: {
    axis: PtzAxis;
    dir: -1 | 1;
    icon: React.ReactNode;
  }) => (
    <Button
      size="sm"
      variant="outline"
      className="h-9 w-9 p-0 select-none"
      disabled={measuringAxis !== null || preflightAxis !== null}
      onMouseDown={() => void beginJog(axis, dir)}
      onTouchStart={(e) => {
        e.preventDefault();
        void beginJog(axis, dir);
      }}
      onMouseUp={() => void endJog()}
      onMouseLeave={() => {
        if (jogStartRef.current) void endJog();
      }}
      aria-label={`Mover ${axis} ${dir > 0 ? 'positivo' : 'negativo'}`}
    >
      {icon}
    </Button>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-md border p-3 bg-muted/30 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            Segure os botões de jog para posicionar o dome e clique em <b>Marcar mínimo/máximo</b>{' '}
            para capturar o extremo desejado.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {statusSupported === true && (
              <Badge variant="secondary" className="text-[10px]">
                <Signal className="w-3 h-3 mr-1" /> ONVIF GetStatus ativo
              </Badge>
            )}
            {statusSupported === false && (
              <Badge variant="outline" className="text-[10px]">
                Fallback jog+tempo (driver sem GetStatus)
              </Badge>
            )}
            {statusMoving.pan_tilt && (
              <Badge variant="outline" className="text-[10px]">
                PanTilt: MOVING
              </Badge>
            )}
            {statusMoving.zoom && (
              <Badge variant="outline" className="text-[10px]">
                Zoom: MOVING
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void resetOrigin()}
          disabled={measuringAxis !== null || preflightAxis !== null}
        >
          <Home className="w-3.5 h-3.5 mr-1" /> Origem
        </Button>
      </div>

      <div className="rounded-md border p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <History className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          {limitsVersion ? (
            <Badge
              variant="secondary"
              className="font-mono text-[10px]"
              data-testid="limits-version-badge"
            >
              v · {new Date(limitsVersion).toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]" data-testid="limits-version-badge">
              sem versão salva
            </Badge>
          )}
          <span className="text-muted-foreground">
            {limitsHistory.length} snapshot{limitsHistory.length === 1 ? '' : 's'} disponíve
            {limitsHistory.length === 1 ? 'l' : 'is'}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={
                limitsHistory.length === 0 || measuringAxis !== null || preflightAxis !== null
              }
              data-testid="limits-rollback-trigger"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reverter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[420px]">
            <DropdownMenuLabel className="text-xs">Últimos limites salvos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {limitsHistory.map((item, idx) => (
              <DropdownMenuItem
                key={`${item.saved_at}-${idx}`}
                className="flex flex-col items-start gap-0.5 py-2"
                data-testid="limits-rollback-item"
                onSelect={() => {
                  onChange(item.limits);
                  toast.info(
                    `Limites revertidos para snapshot de ${new Date(item.saved_at).toLocaleString()}. Clique em Salvar para persistir.`
                  );
                }}
              >
                <span className="text-xs font-medium">
                  {new Date(item.saved_at).toLocaleString()} · {item.source}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatHistorySummary(item)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="calibration-import-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleImportCalibration(file);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCalibration}
            disabled={Object.keys(calibration).length === 0}
            data-testid="calibration-export-btn"
            title="Baixar calibração como JSON"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
            disabled={!cameraId || importingCalibration}
            data-testid="calibration-import-btn"
            title="Importar calibração de outra câmera similar"
          >
            {importingCalibration ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1" />
            )}
            Importar
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setMultiPreflightOpen(true)}
            disabled={
              measuringAxis !== null ||
              revalidatingAxis !== null ||
              preflightAxis !== null ||
              recapturingAxis !== null ||
              hasRecaptureRequired
            }
            data-testid="multi-preflight-open"
            title={
              hasRecaptureRequired
                ? 'Recapture min/max dos eixos com desvio antes de validar todos'
                : 'Validar limites em sequência para todos os eixos'
            }
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Validar todos
          </Button>
        </div>
      </div>

      <PtzLiveStatusPanel
        ptz={ptz}
        paused={measuringAxis !== null || revalidatingAxis !== null || preflightAxis !== null}
      />

      <div
        className="rounded-md border bg-muted/20 p-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground"
        data-testid="ptz-range-legend"
        aria-label="Legenda das cores da régua de calibração"
      >
        <span className="font-medium text-foreground">Legenda:</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2 w-4 rounded-sm bg-muted border border-border"
          />
          Eixo físico (range do hardware)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-4 rounded-sm bg-primary/25 border border-primary"
          />
          Intervalo calibrado (limites aplicados)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-0.5 bg-muted-foreground/60" />
          Intervalo observado (min/max medidos)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          Posição atual
        </span>
      </div>

      {(['pan', 'tilt', 'zoom'] as const).map((axis) => {
        const l = limits[axis];
        const [lo, hi] = AXIS_BOUNDS[axis];
        const sweepMs = sweepMsByAxis[axis];
        const cal = calibration[axis];
        const isMeasuring = measuringAxis === axis;
        return (
          <div key={axis} className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{AXIS_LABEL[axis]}</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-[10px]">
                  <Crosshair className="w-3 h-3 mr-1" /> pos {position[axis].toFixed(2)}
                </Badge>
                {sweepMs != null && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    <Gauge className="w-3 h-3 mr-1" /> sweep {(sweepMs / 1000).toFixed(2)}s
                  </Badge>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {l.min.toFixed(2)} → {l.max.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => void measureSweep(axis)}
                disabled={
                  statusSupported !== true || measuringAxis !== null || preflightAxis !== null
                }
                title={
                  statusSupported === false
                    ? 'Driver não expõe ONVIF GetStatus'
                    : 'Aciona o dome e mede o tempo real de varredura'
                }
              >
                {isMeasuring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Medindo…
                  </>
                ) : (
                  <>
                    <Gauge className="w-3.5 h-3.5 mr-1" />{' '}
                    {statusSupported === false ? 'Medição indisponível' : 'Medir sweep real'}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => capture(axis, 'min')}
                disabled={measuringAxis !== null || preflightAxis !== null}
              >
                Marcar mínimo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => capture(axis, 'max')}
                disabled={measuringAxis !== null || preflightAxis !== null}
              >
                Marcar máximo
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPreflightAxis(axis)}
                disabled={
                  measuringAxis !== null ||
                  preflightAxis !== null ||
                  !freshCaptures[axis].min ||
                  !freshCaptures[axis].max
                }
                title={
                  !freshCaptures[axis].min || !freshCaptures[axis].max
                    ? 'Capture mínimo e máximo nesta sessão antes de validar'
                    : 'Executa pré-voo até os limites com confirmação'
                }
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Validar limites
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void revalidateCalibration(axis)}
                disabled={
                  statusSupported !== true ||
                  measuringAxis !== null ||
                  preflightAxis !== null ||
                  revalidatingAxis !== null ||
                  sweepMsByAxis[axis] == null
                }
                title={
                  statusSupported !== true
                    ? 'Driver não expõe ONVIF GetStatus'
                    : sweepMsByAxis[axis] == null
                      ? 'Meça o sweep real antes de revalidar'
                      : 'Compara Δ predito (tempo→posição) com Δ real reportado pelo dome'
                }
                data-testid={`ptz-revalidate-${axis}`}
              >
                {revalidatingAxis === axis ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Revalidando…
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5 mr-1" /> Revalidar
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant={recaptureRequired[axis] ? 'destructive' : 'outline'}
                onClick={() => setPendingRecaptureAxis(axis)}
                disabled={
                  statusSupported !== true ||
                  measuringAxis !== null ||
                  preflightAxis !== null ||
                  revalidatingAxis !== null ||
                  recapturingAxis !== null
                }
                title={
                  statusSupported !== true
                    ? 'Driver não expõe ONVIF GetStatus'
                    : recaptureRequired[axis]
                      ? `Desvio > ${RECAPTURE_THRESHOLD_PCT}% detectado — recapture obrigatória`
                      : 'Recaptura guiada: aciona o dome até os fins de curso e captura min/max automaticamente'
                }
                data-testid={`ptz-recapture-${axis}`}
              >
                {recapturingAxis === axis ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Recapturando…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1" /> Recapturar guiado
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => resetAxis(axis)}
                disabled={
                  measuringAxis !== null || preflightAxis !== null || recapturingAxis !== null
                }
              >
                Reset
              </Button>
            </div>

            {recaptureRequired[axis] && (
              <div
                className="rounded-md border border-destructive/50 bg-destructive/5 text-destructive p-2 text-[11px] flex items-start gap-2"
                data-testid={`ptz-recapture-required-${axis}`}
                role="alert"
              >
                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                <div className="space-y-0.5">
                  <div className="font-medium">
                    Desvio de {validation[axis]!.error_pct.toFixed(1)}% (&gt;{' '}
                    {RECAPTURE_THRESHOLD_PCT}%) — recaptura obrigatória.
                  </div>
                  <div className="opacity-80">
                    O pré-voo deste eixo (e o de todos os eixos) está bloqueado até você executar
                    <b> Recapturar guiado</b> e confirmar novos min/max válidos.
                  </div>
                </div>
              </div>
            )}

            {recapturingAxis === axis && (
              <div
                className="rounded-md border p-2 space-y-1"
                data-testid={`ptz-recapture-progress-${axis}`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">
                    {recaptureStage === 'to-min'
                      ? 'Buscando extremo mínimo…'
                      : recaptureStage === 'to-max'
                        ? 'Buscando extremo máximo…'
                        : 'Concluído'}
                  </span>
                  <span className="font-mono opacity-70">{recaptureProgress}%</span>
                </div>
                <Progress value={recaptureProgress} className="h-1.5" />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      recaptureAbortRef.current = true;
                    }}
                    className="h-6 px-2 text-[10px]"
                  >
                    Abortar
                  </Button>
                </div>
              </div>
            )}

            {(() => {
              const [lo, hi] = AXIS_BOUNDS[axis];
              const SAT_EPS = (hi - lo) * 0.01; // 1% do range
              const saturatedMin = cal ? cal.min_reported <= lo + SAT_EPS : false;
              const saturatedMax = cal ? cal.max_reported >= hi - SAT_EPS : false;
              const draft = observedDraft[axis] ?? {
                min: cal ? cal.min_reported.toFixed(3) : '',
                max: cal ? cal.max_reported.toFixed(3) : '',
              };
              const isDirty = !!observedDraft[axis];
              const isSaving = savingObservedAxis === axis;
              return (
                <div
                  className="rounded-md border p-2 space-y-2 bg-muted/20"
                  data-testid={`ptz-observed-editor-${axis}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-medium">Observado durante a calibração</span>
                    {cal ? (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        sweep {(cal.sweep_ms / 1000).toFixed(2)}s ·{' '}
                        {new Date(cal.measured_at).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        nenhuma medição registrada — informe manualmente se necessário
                      </span>
                    )}
                  </div>
                  {(saturatedMin || saturatedMax) && (
                    <div className="text-[10px] flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="w-3 h-3" aria-hidden />
                      Possível saturação no{' '}
                      {saturatedMin && saturatedMax
                        ? 'mínimo e no máximo'
                        : saturatedMin
                          ? 'mínimo'
                          : 'máximo'}{' '}
                      — ajuste manualmente com o range real do dome.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label
                        className="text-[10px] text-muted-foreground"
                        htmlFor={`obs-min-${axis}`}
                      >
                        min_reported ({lo})
                      </Label>
                      <Input
                        id={`obs-min-${axis}`}
                        type="number"
                        step="0.001"
                        min={lo}
                        max={hi}
                        className="h-8 font-mono text-xs"
                        value={draft.min}
                        onChange={(e) =>
                          setObservedDraft((prev) => ({
                            ...prev,
                            [axis]: { ...draft, min: e.target.value },
                          }))
                        }
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        className="text-[10px] text-muted-foreground"
                        htmlFor={`obs-max-${axis}`}
                      >
                        max_reported ({hi})
                      </Label>
                      <Input
                        id={`obs-max-${axis}`}
                        type="number"
                        step="0.001"
                        min={lo}
                        max={hi}
                        className="h-8 font-mono text-xs"
                        value={draft.max}
                        onChange={(e) =>
                          setObservedDraft((prev) => ({
                            ...prev,
                            [axis]: { ...draft, max: e.target.value },
                          }))
                        }
                        disabled={isSaving}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={isDirty ? 'default' : 'outline'}
                      onClick={() => void saveObservedRange(axis)}
                      disabled={!isDirty || isSaving}
                      data-testid={`ptz-observed-save-${axis}`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Salvando…
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 mr-1" /> Salvar observado
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {validation[axis] &&
              (() => {
                const v = validation[axis]!;
                const severity = v.error_pct <= 5 ? 'ok' : v.error_pct <= 15 ? 'warn' : 'bad';
                const cls =
                  severity === 'ok'
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                    : severity === 'warn'
                      ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300'
                      : 'border-destructive/50 bg-destructive/5 text-destructive';
                return (
                  <div
                    className={`rounded-md border p-2 text-[11px] font-mono flex flex-wrap gap-x-3 gap-y-1 ${cls}`}
                    data-testid={`ptz-revalidate-result-${axis}`}
                  >
                    <span>
                      <b>Erro estimado:</b> {v.error_pct.toFixed(1)}% (|Δ|={v.error_abs.toFixed(3)})
                    </span>
                    <span>
                      predito {v.predicted_delta >= 0 ? '+' : ''}
                      {v.predicted_delta.toFixed(3)}
                    </span>
                    <span>
                      real {v.actual_delta >= 0 ? '+' : ''}
                      {v.actual_delta.toFixed(3)}
                    </span>
                    <span>
                      [{v.p0.toFixed(2)} → {v.p1.toFixed(2)}]
                    </span>
                    <span>
                      dir {v.direction > 0 ? '+' : '−'} · {v.duration_ms}ms
                    </span>
                    <span className="opacity-70">{new Date(v.at).toLocaleTimeString()}</span>
                  </div>
                );
              })()}

            <PtzAxisRangeVisualizer
              axis={axis}
              bounds={AXIS_BOUNDS[axis]}
              calibrated={l}
              observed={cal ? { min: cal.min_reported, max: cal.max_reported } : undefined}
              position={position[axis]}
              moving={
                axis === 'zoom' ? (statusMoving.zoom ?? false) : (statusMoving.pan_tilt ?? false)
              }
            />

            <Slider
              value={[l.min, l.max]}
              min={lo}
              max={hi}
              step={0.05}
              onValueChange={([min, max]) =>
                onChange({ ...limits, [axis]: { min: min ?? lo, max: max ?? hi } })
              }
            />

            <PtzPreflightHistory cameraId={cameraId} axis={axis} refreshKey={preflightHistoryKey} />
          </div>
        );
      })}

      <div className="text-[11px] text-muted-foreground">
        Dica: o comando PTZ em runtime aplica{' '}
        <code className="font-mono">clamp(valor, min, max)</code> antes de enviar ao firmware —
        valores fora do intervalo são rejeitados e registrados em
        <code className="font-mono"> ptz_connection_attempts</code>. Cada medição de sweep também é
        auditada.
      </div>

      {preflightAxis && (
        <PtzLimitPreflightDialog
          open={preflightAxis !== null}
          onOpenChange={(v) => {
            if (!v) setPreflightAxis(null);
          }}
          axis={preflightAxis}
          limits={limits[preflightAxis]}
          sweepMs={sweepMsByAxis[preflightAxis]}
          statusSupported={statusSupported === true}
          startPosition={position[preflightAxis]}
          ptz={ptz}
          cameraId={cameraId}
          onComplete={() => setPreflightHistoryKey((k) => k + 1)}
        />
      )}

      <PtzMultiAxisPreflightDialog
        open={multiPreflightOpen}
        onOpenChange={setMultiPreflightOpen}
        axes={['pan', 'tilt', 'zoom']}
        limitsByAxis={limits}
        sweepMsByAxis={sweepMsByAxis}
        statusSupported={statusSupported === true}
        startPositions={position}
        ptz={ptz}
        cameraId={cameraId}
        onComplete={() => setPreflightHistoryKey((k) => k + 1)}
      />

      <AlertDialog
        open={pendingRecaptureAxis !== null}
        onOpenChange={(v) => {
          if (!v) setPendingRecaptureAxis(null);
        }}
      >
        <AlertDialogContent data-testid="ptz-recapture-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Recaptura guiada · {pendingRecaptureAxis ? AXIS_LABEL[pendingRecaptureAxis] : ''}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  O dome será acionado até os <b>fins de curso</b> em ambos os sentidos para
                  capturar novos <b>min</b> e <b>max</b> automaticamente. Certifique-se de que o
                  campo de visão está desobstruído.
                </p>
                {pendingRecaptureAxis &&
                  recaptureRequired[pendingRecaptureAxis] &&
                  validation[pendingRecaptureAxis] && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-destructive text-xs">
                      Desvio detectado:{' '}
                      <b>{validation[pendingRecaptureAxis]!.error_pct.toFixed(1)}%</b> (limiar{' '}
                      {RECAPTURE_THRESHOLD_PCT}%). O pré-voo permanece bloqueado até o término.
                    </p>
                  )}
                <p className="text-xs text-muted-foreground">
                  Você poderá abortar a qualquer momento durante o processo.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="ptz-recapture-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="ptz-recapture-confirm-btn"
              onClick={() => {
                const axis = pendingRecaptureAxis;
                setPendingRecaptureAxis(null);
                if (axis) void guidedRecapture(axis);
              }}
            >
              Confirmar e iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
