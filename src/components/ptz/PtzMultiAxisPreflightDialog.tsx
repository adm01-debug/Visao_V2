import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, Loader2, Octagon, ShieldCheck, XCircle } from 'lucide-react';
import { downloadPtzPreflightPdf, generatePtzPreflightPdf } from './ptzPreflightPdf';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { usePtzControl } from '@/hooks/usePtzControl';
import { computePhaseTimeout, type PreflightAxis, type PreflightLimits } from './PtzLimitPreflightDialog';

/**
 * Validação sequencial dos limites de todos os eixos suportados
 * (pan → tilt → zoom). Reaproveita a lógica de driveToTarget do
 * PtzLimitPreflightDialog em uma única sessão, com barra de progresso
 * global e mecanismo unificado de abortar/timeouts por fase.
 */

const POLL_INTERVAL_MS = 200;
const TARGET_TOLERANCE = 0.02;
const DEVIATION_WARN = 0.10;
const APPROACH_SPEED = 3;

const AXIS_BOUNDS: Record<PreflightAxis, [number, number]> = {
  pan: [-1, 1],
  tilt: [-1, 1],
  zoom: [0, 1],
};

const AXIS_LABEL: Record<PreflightAxis, string> = {
  pan: 'Horizontal (Pan)',
  tilt: 'Vertical (Tilt)',
  zoom: 'Zoom',
};

type PhaseId = 'A' | 'B' | 'C';
type PhaseOutcome = 'ok' | 'deviation' | 'fail' | 'no-telemetry' | 'skipped';

interface PhaseResult {
  axis: PreflightAxis;
  id: PhaseId;
  target: number;
  observed: number | null;
  delta: number | null;
  latency_ms: number;
  outcome: PhaseOutcome;
  detail?: string;
}

/**
 * Amostra ao vivo capturada durante o polling — alimenta a mini-tabela em
 * tempo real, atualizada a cada ciclo de GetStatus.
 */
interface LiveSample {
  axis: PreflightAxis;
  phase: PhaseId;
  target: number;
  observed: number | null;
  delta: number | null;
  movingFlag: 'moving' | 'idle' | 'unknown';
  elapsedMs: number;
  timeoutMs: number;
  phaseState: 'running' | 'settled' | 'timeout';
}

export interface MultiAxisPreflightProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Eixos suportados pelo dome (na ordem em que devem ser validados). */
  axes: PreflightAxis[];
  limitsByAxis: Record<PreflightAxis, PreflightLimits>;
  sweepMsByAxis: Partial<Record<PreflightAxis, number>>;
  statusSupported: boolean;
  startPositions: Record<PreflightAxis, number>;
  ptz: ReturnType<typeof usePtzControl>;
  cameraId?: string;
  cameraLabel?: string;
  onComplete?: (results: PhaseResult[]) => void;
}

export function PtzMultiAxisPreflightDialog({
  open,
  onOpenChange,
  axes,
  limitsByAxis,
  sweepMsByAxis,
  statusSupported,
  startPositions,
  ptz,
  cameraId,
  cameraLabel,
  onComplete,
}: MultiAxisPreflightProps) {
  const [ackClear, setAckClear] = useState(false);
  const [ackSeeing, setAckSeeing] = useState(false);
  const [ackConfirmedAt, setAckConfirmedAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [currentAxis, setCurrentAxis] = useState<PreflightAxis | null>(null);
  const [currentPhase, setCurrentPhase] = useState<PhaseId | null>(null);
  const [results, setResults] = useState<PhaseResult[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [liveSample, setLiveSample] = useState<LiveSample | null>(null);
  const abortRef = useRef(false);

  const totalPhases = axes.length * 3;
  const donePhases = results.length;
  const progressPct = totalPhases === 0 ? 0 : Math.round((donePhases / totalPhases) * 100);

  const perAxisTimeout = useMemo(() => {
    const map = {} as Record<PreflightAxis, number>;
    for (const a of axes) map[a] = computePhaseTimeout(sweepMsByAxis[a]);
    return map;
  }, [axes, sweepMsByAxis]);

  const totalEstimateMs = useMemo(
    () => axes.reduce((acc, a) => acc + perAxisTimeout[a] * 3, 0),
    [axes, perAxisTimeout],
  );

  const validationSummary = useMemo(() => {
    const problems: string[] = [];
    for (const a of axes) {
      const [lo, hi] = AXIS_BOUNDS[a];
      const l = limitsByAxis[a];
      if (!l) { problems.push(`${AXIS_LABEL[a]}: limites ausentes`); continue; }
      if (l.min < lo || l.max > hi) problems.push(`${AXIS_LABEL[a]}: fora do range físico`);
      if (l.max - l.min < 0.05) problems.push(`${AXIS_LABEL[a]}: separação < 0.05`);
    }
    return problems;
  }, [axes, limitsByAxis]);

  const canRun = validationSummary.length === 0 && ackClear && ackSeeing && !running && axes.length > 0;

  useEffect(() => {
    if (open) {
      setAckClear(false);
      setAckSeeing(false);
      setAckConfirmedAt(null);
      setResults([]);
      setCurrentAxis(null);
      setCurrentPhase(null);
      setLiveSample(null);
      abortRef.current = false;
    }
  }, [open]);

  // Registra o timestamp exato do momento em que AMBAS as confirmações
  // foram marcadas — usado depois como carimbo de auditoria.
  useEffect(() => {
    if (ackClear && ackSeeing && !ackConfirmedAt) {
      setAckConfirmedAt(new Date().toISOString());
    } else if ((!ackClear || !ackSeeing) && ackConfirmedAt) {
      setAckConfirmedAt(null);
    }
  }, [ackClear, ackSeeing, ackConfirmedAt]);

  const safeStop = useCallback(async (axis: PreflightAxis) => {
    try {
      if (axis === 'zoom') await ptz.send('stop');
      else await ptz.stopMove();
    } catch { /* noop */ }
  }, [ptz]);

  useEffect(() => {
    if (!running) return;
    const abort = () => {
      abortRef.current = true;
      if (currentAxis) void safeStop(currentAxis);
    };
    window.addEventListener('blur', abort);
    return () => window.removeEventListener('blur', abort);
  }, [running, currentAxis, safeStop]);

  const readAxis = useCallback(async (axis: PreflightAxis): Promise<number | null> => {
    if (!statusSupported) return null;
    const st = await ptz.getStatus();
    if (!st) return null;
    const v = st.position[axis];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }, [ptz, statusSupported]);

  /** Retorna posição + flag de movimento para o eixo (ou null se sem telemetria). */
  const readStatusAxis = useCallback(async (
    axis: PreflightAxis,
  ): Promise<{ pos: number | null; moving: boolean | null } | null> => {
    if (!statusSupported) return null;
    const st = await ptz.getStatus();
    if (!st) return null;
    const v = st.position[axis];
    const pos = typeof v === 'number' && Number.isFinite(v) ? v : null;
    const moving = axis === 'zoom' ? st.moving.zoom : st.moving.pan_tilt;
    return { pos, moving: typeof moving === 'boolean' ? moving : null };
  }, [ptz, statusSupported]);

  const logAttempt = useCallback(async (r: PhaseResult) => {
    if (!cameraId) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;
      await supabase.from('ptz_connection_attempts').insert({
        user_id: userId,
        camera_id: cameraId,
        backend: `preflight_multi_${r.axis}_${r.id.toLowerCase()}`,
        ok: r.outcome === 'ok',
        reachable: statusSupported,
        http_status: 0,
        latency_ms: r.latency_ms,
        error_detail: JSON.stringify({
          preflight_result: r.outcome,
          axis: r.axis,
          phase: r.id,
          target: r.target,
          observed: r.observed,
          delta: r.delta,
          detail: r.detail ?? null,
        }),
        source: 'wizard',
      });
    } catch { /* best-effort */ }
  }, [cameraId, statusSupported]);

  const driveToTarget = useCallback(async (
    axis: PreflightAxis,
    phase: PhaseId,
    target: number,
    fromHint: number,
  ): Promise<{ observed: number | null; delta: number | null; latency_ms: number; timedOut: boolean }> => {
    const started = performance.now();
    const range = AXIS_BOUNDS[axis][1] - AXIS_BOUNDS[axis][0];
    const timeout = perAxisTimeout[axis];
    const sweepMs = sweepMsByAxis[axis];
    const initial = await readStatusAxis(axis);
    const from = initial?.pos ?? fromHint;

    // Amostra inicial da mini-tabela
    setLiveSample({
      axis, phase, target,
      observed: initial?.pos ?? null,
      delta: initial?.pos != null ? initial.pos - target : null,
      movingFlag: initial?.moving == null ? 'unknown' : initial.moving ? 'moving' : 'idle',
      elapsedMs: 0,
      timeoutMs: timeout,
      phaseState: 'running',
    });

    const dir = target > from ? 1 : -1;
    try {
      if (axis === 'zoom') await ptz.zoom(dir * 0.6, APPROACH_SPEED);
      else {
        const p = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };
        await ptz.startMove({ ...p, speed: APPROACH_SPEED });
      }
    } catch {
      return { observed: from, delta: from - target, latency_ms: Math.round(performance.now() - started), timedOut: false };
    }

    // Sem telemetria: só cronometra.
    if (!statusSupported) {
      const wait = Math.min(timeout, sweepMs ? sweepMs / 2 : timeout);
      const step = 100;
      let waited = 0;
      while (waited < wait) {
        if (abortRef.current) break;
        await new Promise((r) => setTimeout(r, step));
        waited += step;
        setLiveSample({
          axis, phase, target,
          observed: null, delta: null,
          movingFlag: 'unknown',
          elapsedMs: Math.round(performance.now() - started),
          timeoutMs: timeout,
          phaseState: 'running',
        });
      }
      await safeStop(axis);
      setLiveSample((prev) => prev && prev.axis === axis && prev.phase === phase
        ? { ...prev, phaseState: 'settled', elapsedMs: Math.round(performance.now() - started) }
        : prev);
      return { observed: null, delta: null, latency_ms: Math.round(performance.now() - started), timedOut: false };
    }

    let last = from;
    let timedOut = true;
    while (performance.now() - started < timeout) {
      if (abortRef.current) { timedOut = false; break; }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const s = await readStatusAxis(axis);
      const p = s?.pos ?? null;
      if (p != null) {
        last = p;
      }
      setLiveSample({
        axis, phase, target,
        observed: p,
        delta: p != null ? p - target : null,
        movingFlag: s?.moving == null ? 'unknown' : s.moving ? 'moving' : 'idle',
        elapsedMs: Math.round(performance.now() - started),
        timeoutMs: timeout,
        phaseState: 'running',
      });
      if (p != null) {
        if ((dir > 0 && p >= target - TARGET_TOLERANCE * range) ||
            (dir < 0 && p <= target + TARGET_TOLERANCE * range)) {
          timedOut = false;
          break;
        }
      }
    }
    await safeStop(axis);
    await new Promise((r) => setTimeout(r, 250));
    const finalStat = await readStatusAxis(axis);
    const finalPos = finalStat?.pos ?? last;
    setLiveSample({
      axis, phase, target,
      observed: finalPos,
      delta: finalPos - target,
      movingFlag: finalStat?.moving == null ? 'unknown' : finalStat.moving ? 'moving' : 'idle',
      elapsedMs: Math.round(performance.now() - started),
      timeoutMs: timeout,
      phaseState: timedOut ? 'timeout' : 'settled',
    });
    return {
      observed: finalPos,
      delta: finalPos - target,
      latency_ms: Math.round(performance.now() - started),
      timedOut,
    };
  }, [perAxisTimeout, ptz, readStatusAxis, safeStop, statusSupported, sweepMsByAxis]);


  /**
   * Grava 1 registro por eixo em `ptz_preflight_runs`, incluindo o carimbo
   * das confirmações do checklist de segurança. Isto alimenta o histórico
   * exibido no card de cada eixo para fins de auditoria.
   */
  const persistRuns = useCallback(async (all: PhaseResult[], wasAborted: boolean) => {
    if (!cameraId) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;
      const byAxis = new Map<PreflightAxis, PhaseResult[]>();
      for (const r of all) {
        if (!byAxis.has(r.axis)) byAxis.set(r.axis, []);
        byAxis.get(r.axis)!.push(r);
      }
      type PreflightRunRow = {
        user_id: string; camera_id: string; axis: string;
        ack_area_clear: boolean; ack_watching_live: boolean;
        ack_confirmed_at: string | null;
        outcome: string; aborted: boolean; status_supported: boolean;
        phases: unknown; limits_snapshot: unknown;
      };
      const rows: PreflightRunRow[] = [];
      for (const axis of axes) {
        const phases = byAxis.get(axis) ?? [];
        let outcome: 'ok' | 'deviation' | 'fail' | 'aborted' | 'no-telemetry';
        if (wasAborted && phases.length < 3) outcome = 'aborted';
        else if (phases.some((p) => p.outcome === 'fail')) outcome = 'fail';
        else if (phases.some((p) => p.outcome === 'deviation')) outcome = 'deviation';
        else if (phases.every((p) => p.outcome === 'no-telemetry')) outcome = 'no-telemetry';
        else if (phases.length === 0) continue;
        else outcome = 'ok';

        rows.push({
          user_id: userId,
          camera_id: cameraId,
          axis,
          ack_area_clear: ackClear,
          ack_watching_live: ackSeeing,
          ack_confirmed_at: ackConfirmedAt,
          outcome,
          aborted: wasAborted,
          status_supported: statusSupported,
          phases: phases.map((p) => ({
            id: p.id, target: p.target, observed: p.observed,
            delta: p.delta, latency_ms: p.latency_ms,
            outcome: p.outcome, detail: p.detail ?? null,
          })),
          limits_snapshot: limitsByAxis[axis] ?? null,
        });
      }
      if (rows.length === 0) return;
      await supabase.from('ptz_preflight_runs').insert(rows as never);
    } catch { /* best-effort */ }
  }, [ackClear, ackSeeing, ackConfirmedAt, axes, cameraId, limitsByAxis, statusSupported]);


  const runAll = useCallback(async () => {
    if (!canRun) return;
    setRunning(true);
    setResults([]);
    abortRef.current = false;

    const collected: PhaseResult[] = [];
    outer: for (const axis of axes) {
      setCurrentAxis(axis);
      const lim = limitsByAxis[axis];
      const origin = startPositions[axis] ?? 0;
      const range = AXIS_BOUNDS[axis][1] - AXIS_BOUNDS[axis][0];
      const phases: Array<{ id: PhaseId; target: number }> = [
        { id: 'A', target: lim.min },
        { id: 'B', target: lim.max },
        { id: 'C', target: origin },
      ];
      let cursor = origin;
      for (const ph of phases) {
        if (abortRef.current) break outer;
        setCurrentPhase(ph.id);
        const r = await driveToTarget(axis, ph.id, ph.target, cursor);
        let outcome: PhaseOutcome;
        let detail: string | undefined;
        if (abortRef.current) {
          outcome = 'fail'; detail = 'Abortado pelo operador';
        } else if (r.observed == null) {
          outcome = 'no-telemetry'; detail = 'Sem GetStatus — apenas tempo estimado';
        } else if (r.timedOut) {
          outcome = 'fail'; detail = 'Timeout antes de alcançar o alvo';
        } else if (Math.abs(r.delta ?? 0) > DEVIATION_WARN * range) {
          outcome = 'deviation'; detail = `Δ ${(r.delta ?? 0).toFixed(3)} excede ${(DEVIATION_WARN * range).toFixed(3)}`;
        } else {
          outcome = 'ok';
        }
        const result: PhaseResult = {
          axis, id: ph.id, target: ph.target,
          observed: r.observed, delta: r.delta,
          latency_ms: r.latency_ms, outcome, detail,
        };
        collected.push(result);
        setResults((prev) => [...prev, result]);
        void logAttempt(result);
        if (r.observed != null) cursor = r.observed;
        if (outcome === 'fail' && !abortRef.current) break outer;
      }
    }

    setCurrentPhase(null);
    setCurrentAxis(null);
    setRunning(false);

    // Persiste 1 registro por eixo, incluindo carimbos das confirmações
    // do checklist de segurança — histórico auditável no card do eixo.
    await persistRuns(collected, abortRef.current);

    onComplete?.(collected);

    if (abortRef.current) toast.warning('Validação abortada. Dome parado.');
    else if (collected.every((r) => r.outcome === 'ok')) toast.success('Todos os eixos validados sem desvios.');
    else toast.warning('Validação concluída com observações. Revise os resultados.');
  }, [canRun, axes, limitsByAxis, startPositions, driveToTarget, logAttempt, onComplete, persistRuns]);

  const handleAbort = useCallback(async () => {
    abortRef.current = true;
    if (currentAxis) await safeStop(currentAxis);
    toast.info('Abortando validação…');
  }, [currentAxis, safeStop]);

  const handleDownloadPdf = useCallback(async () => {
    if (results.length === 0) return;
    setPdfLoading(true);
    try {
      const blob = await generatePtzPreflightPdf({
        cameraId,
        cameraLabel,
        axes,
        limitsByAxis,
        startPositions,
        perAxisTimeoutMs: perAxisTimeout,
        statusSupported,
        results,
        generatedAt: new Date(),
      });
      downloadPtzPreflightPdf(blob, cameraLabel ?? cameraId);
      toast.success('Relatório PDF gerado.');
    } catch (err) {
      toast.error('Falha ao gerar PDF', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setPdfLoading(false);
    }
  }, [axes, cameraId, cameraLabel, limitsByAxis, perAxisTimeout, results, startPositions, statusSupported]);


  const outcomeBadge = (o: PhaseOutcome) => {
    if (o === 'ok') return <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />ok</Badge>;
    if (o === 'deviation') return <Badge variant="outline" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />desvio</Badge>;
    if (o === 'no-telemetry') return <Badge variant="outline" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />sem telemetria</Badge>;
    if (o === 'skipped') return <Badge variant="outline" className="text-[10px]">pulado</Badge>;
    return <Badge variant="destructive" className="text-[10px]"><XCircle className="w-3 h-3 mr-1" />falha</Badge>;
  };

  const phaseLabel = (axis: PreflightAxis, id: PhaseId) => {
    const lim = limitsByAxis[axis];
    const origin = startPositions[axis] ?? 0;
    if (id === 'A') return `→ min ${lim.min.toFixed(2)}`;
    if (id === 'B') return `→ max ${lim.max.toFixed(2)}`;
    return `→ origem ${origin.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!running) onOpenChange(v); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Validação sequencial · {axes.length} eixo(s)
          </DialogTitle>
          <DialogDescription>
            Executa <b>pan → tilt → zoom</b> (conforme disponível), 3 fases por eixo
            (min → max → origem). Um único diálogo, um único botão <b>Abortar</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 bg-muted/30 text-xs space-y-1 font-mono">
          <div>ordem: <b>{axes.map((a) => AXIS_LABEL[a]).join(' → ')}</b></div>
          <div>
            timeouts/fase: {axes.map((a) => `${a}=${(perAxisTimeout[a]/1000).toFixed(1)}s`).join(' · ')}
          </div>
          <div>total previsto: <b>~{(totalEstimateMs / 1000).toFixed(0)}s</b> · telemetria: <b>{statusSupported ? 'GetStatus' : 'fallback tempo'}</b></div>
        </div>

        {validationSummary.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-1">
            <div className="font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Corrija antes de continuar</div>
            {validationSummary.map((p) => <div key={p}>• {p}</div>)}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox id="ack-clear-multi" checked={ackClear} onCheckedChange={(v) => setAckClear(v === true)} disabled={running} />
            <Label htmlFor="ack-clear-multi" className="text-xs leading-tight cursor-pointer">
              Área do dome está <b>livre de obstáculos e pessoas</b>.
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="ack-seeing-multi" checked={ackSeeing} onCheckedChange={(v) => setAckSeeing(v === true)} disabled={running} />
            <Label htmlFor="ack-seeing-multi" className="text-xs leading-tight cursor-pointer">
              Estou <b>vendo o dome ou o preview ao vivo</b> durante a validação.
            </Label>
          </div>
        </div>

        {(running || results.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                Progresso: {donePhases}/{totalPhases} fases
                {currentAxis && running && <> · executando <b>{AXIS_LABEL[currentAxis]}</b> · fase <b>{currentPhase}</b></>}
              </span>
              <span className="font-mono text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" data-testid="multi-preflight-progress" />

            {running && liveSample && (
              <div
                className="rounded-md border bg-muted/20 p-2 text-[11px] font-mono"
                data-testid="multi-preflight-live-table"
                aria-live="polite"
              >
                <div className="grid grid-cols-6 gap-2 pb-1 border-b border-border/60 text-muted-foreground uppercase tracking-wide">
                  <span>Eixo</span>
                  <span>Fase</span>
                  <span className="text-right">Alvo</span>
                  <span className="text-right">Reportado</span>
                  <span className="text-right">Δ</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="grid grid-cols-6 gap-2 pt-1 items-center">
                  <span>{liveSample.axis}</span>
                  <span>{liveSample.phase}</span>
                  <span className="text-right">{liveSample.target.toFixed(3)}</span>
                  <span className="text-right">
                    {liveSample.observed != null ? liveSample.observed.toFixed(3) : '—'}
                  </span>
                  <span
                    className={
                      'text-right ' +
                      (liveSample.delta == null
                        ? 'text-muted-foreground'
                        : Math.abs(liveSample.delta) > 0.1
                          ? 'text-destructive'
                          : Math.abs(liveSample.delta) > 0.02
                            ? 'text-yellow-600 dark:text-yellow-500'
                            : 'text-emerald-600 dark:text-emerald-500')
                    }
                  >
                    {liveSample.delta != null ? liveSample.delta.toFixed(3) : '—'}
                  </span>
                  <span className="text-right">
                    {liveSample.phaseState === 'timeout' ? (
                      <Badge variant="destructive" className="text-[10px]">timeout</Badge>
                    ) : liveSample.phaseState === 'settled' ? (
                      <Badge variant="secondary" className="text-[10px]">IDLE</Badge>
                    ) : liveSample.movingFlag === 'moving' ? (
                      <Badge variant="outline" className="text-[10px]">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />movendo
                      </Badge>
                    ) : liveSample.movingFlag === 'idle' ? (
                      <Badge variant="secondary" className="text-[10px]">IDLE</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">sem status</Badge>
                    )}
                  </span>
                </div>
                <div className="pt-1 text-[10px] text-muted-foreground">
                  {(liveSample.elapsedMs / 1000).toFixed(1)}s / {(liveSample.timeoutMs / 1000).toFixed(1)}s
                </div>
              </div>
            )}


            <div className="rounded-md border p-3 space-y-2 text-xs max-h-64 overflow-auto">
              {axes.map((axis) => (
                <div key={axis} className="space-y-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {currentAxis === axis && running && <Loader2 className="w-3 h-3 animate-spin" />}
                    {AXIS_LABEL[axis]}
                  </div>
                  {(['A', 'B', 'C'] as PhaseId[]).map((id) => {
                    const r = results.find((x) => x.axis === axis && x.id === id);
                    const active = running && currentAxis === axis && currentPhase === id;
                    return (
                      <div key={id} className="flex items-center justify-between gap-2 pl-4">
                        <span className="font-mono">Fase {id}: {phaseLabel(axis, id)}</span>
                        <div className="flex items-center gap-2">
                          {r?.delta != null && (
                            <span className="font-mono text-muted-foreground">Δ {r.delta.toFixed(3)}</span>
                          )}
                          {r && <span className="font-mono text-muted-foreground">{r.latency_ms}ms</span>}
                          {r ? outcomeBadge(r.outcome) : active
                            ? <Badge variant="outline" className="text-[10px]">em execução…</Badge>
                            : <Badge variant="outline" className="text-[10px]">aguardando</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {running ? (
            <Button variant="destructive" onClick={() => void handleAbort()} data-testid="multi-preflight-abort">
              <Octagon className="w-4 h-4 mr-1" /> Abortar
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
              {results.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => void handleDownloadPdf()}
                  disabled={pdfLoading}
                  data-testid="multi-preflight-download-pdf"
                >
                  {pdfLoading
                    ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    : <FileDown className="w-4 h-4 mr-1" />}
                  Baixar relatório PDF
                </Button>
              )}
              <Button onClick={() => void runAll()} disabled={!canRun} data-testid="multi-preflight-run">
                <ShieldCheck className="w-4 h-4 mr-1" /> Executar validação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
