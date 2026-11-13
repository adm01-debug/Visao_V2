import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Octagon, ShieldCheck, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { usePtzControl } from '@/hooks/usePtzControl';
import { computePhaseTimeout } from './preflightTimeout';

export type PreflightAxis = 'pan' | 'tilt' | 'zoom';

export interface PreflightLimits {
  min: number;
  max: number;
}

/** Poll interval durante execução (ms). */
const POLL_INTERVAL_MS = 200;
/** Δ mínimo aceito entre alvo e posição reportada (em fração do range físico). */
const TARGET_TOLERANCE = 0.02;
/** Desvio máximo tolerado antes de sinalizar "desvio" (10% do range). */
const DEVIATION_WARN = 0.1;
/** Speed usado nas fases de aproximação. */
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
type PhaseOutcome = 'ok' | 'deviation' | 'fail' | 'no-telemetry';

interface PhaseResult {
  id: PhaseId;
  label: string;
  target: number;
  observed: number | null;
  delta: number | null;
  latency_ms: number;
  outcome: PhaseOutcome;
  detail?: string;
}

interface PtzLimitPreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axis: PreflightAxis;
  limits: PreflightLimits;
  sweepMs?: number;
  statusSupported: boolean;
  startPosition: number;
  ptz: ReturnType<typeof usePtzControl>;
  cameraId?: string;
  onComplete?: (results: PhaseResult[]) => void;
}

export function PtzLimitPreflightDialog({
  open,
  onOpenChange,
  axis,
  limits,
  sweepMs,
  statusSupported,
  startPosition,
  ptz,
  cameraId,
  onComplete,
}: PtzLimitPreflightDialogProps) {
  const [ackClear, setAckClear] = useState(false);
  const [ackSeeing, setAckSeeing] = useState(false);
  const [ackConfirmedAt, setAckConfirmedAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<PhaseId | null>(null);
  const [results, setResults] = useState<PhaseResult[]>([]);
  const abortRef = useRef(false);

  const range = AXIS_BOUNDS[axis][1] - AXIS_BOUNDS[axis][0];
  const phaseTimeout = useMemo(() => computePhaseTimeout(sweepMs), [sweepMs]);
  const totalEstimateMs = phaseTimeout * 3;

  // Checklist dry-run.
  const [lo, hi] = AXIS_BOUNDS[axis];
  const withinBounds = limits.min >= lo && limits.max <= hi;
  const separationOk = limits.max - limits.min >= 0.05;
  const sweepAvailable = Boolean(sweepMs && sweepMs > 0);
  const telemetryOk = statusSupported;
  const lockBusy = Boolean(ptz.lockInfo);

  const canRun = withinBounds && separationOk && ackClear && ackSeeing && !running;

  // Reset ao abrir/fechar.
  useEffect(() => {
    if (open) {
      setAckClear(false);
      setAckSeeing(false);
      setAckConfirmedAt(null);
      setResults([]);
      setCurrentPhase(null);
      abortRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (ackClear && ackSeeing && !ackConfirmedAt) setAckConfirmedAt(new Date().toISOString());
    else if ((!ackClear || !ackSeeing) && ackConfirmedAt) setAckConfirmedAt(null);
  }, [ackClear, ackSeeing, ackConfirmedAt]);

  // Aborta se o usuário fechar a janela do navegador durante a execução.
  useEffect(() => {
    if (!running) return;
    const abort = () => {
      abortRef.current = true;
      void safeStop();
    };
    window.addEventListener('blur', abort);
    return () => window.removeEventListener('blur', abort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const safeStop = useCallback(async () => {
    try {
      if (axis === 'zoom') await ptz.send('stop');
      else await ptz.stopMove();
    } catch {
      /* noop */
    }
  }, [axis, ptz]);

  const readAxis = useCallback(async (): Promise<number | null> => {
    if (!statusSupported) return null;
    const st = await ptz.getStatus();
    if (!st) return null;
    const v = st.position[axis];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }, [axis, ptz, statusSupported]);

  const logAttempt = useCallback(
    async (phase: PhaseResult) => {
      if (!cameraId) return;
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        if (!userId) return;
        await supabase.from('ptz_connection_attempts').insert({
          user_id: userId,
          camera_id: cameraId,
          backend: `preflight_${axis}_${phase.id.toLowerCase()}`,
          ok: phase.outcome === 'ok',
          reachable: statusSupported,
          http_status: 0,
          latency_ms: phase.latency_ms,
          error_detail: JSON.stringify({
            preflight_result: phase.outcome,
            axis,
            phase: phase.id,
            target: phase.target,
            observed: phase.observed,
            delta: phase.delta,
            detail: phase.detail ?? null,
          }),
          source: 'wizard',
        });
      } catch {
        /* auditoria best-effort */
      }
    },
    [axis, cameraId, statusSupported]
  );

  /**
   * Aciona movimento contínuo em direção ao alvo e faz polling até que a
   * posição reportada esteja dentro da tolerância, ou até o timeout.
   * Retorna a última posição observada e o desvio (delta) ao alvo.
   */
  const driveToTarget = useCallback(
    async (
      target: number
    ): Promise<{
      observed: number | null;
      delta: number | null;
      latency_ms: number;
      timedOut: boolean;
    }> => {
      const started = performance.now();
      const from = await readAxis();
      // Sem telemetria: usa apenas tempo estimado.
      if (from === null || from === undefined) {
        const dir = target >= startPosition ? 1 : -1;
        try {
          if (axis === 'zoom') await ptz.zoom(dir * 0.6, APPROACH_SPEED);
          else {
            const p = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };
            await ptz.startMove({ ...p, speed: APPROACH_SPEED });
          }
        } catch {
          /* noop */
        }
        const wait = Math.min(phaseTimeout, sweepMs ? sweepMs / 2 : phaseTimeout);
        await new Promise((r) => setTimeout(r, wait));
        await safeStop();
        return {
          observed: null,
          delta: null,
          latency_ms: Math.round(performance.now() - started),
          timedOut: false,
        };
      }

      const dir = target > from ? 1 : -1;
      try {
        if (axis === 'zoom') await ptz.zoom(dir * 0.6, APPROACH_SPEED);
        else {
          const p = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };
          await ptz.startMove({ ...p, speed: APPROACH_SPEED });
        }
      } catch {
        return {
          observed: from,
          delta: from - target,
          latency_ms: Math.round(performance.now() - started),
          timedOut: false,
        };
      }

      let last = from;
      let timedOut = true;
      while (performance.now() - started < phaseTimeout) {
        if (abortRef.current) {
          timedOut = false;
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const p = await readAxis();
        if (p !== null && p !== undefined) {
          last = p;
          // Alcançou ou ultrapassou o alvo (na direção correta).
          if (
            (dir > 0 && p >= target - TARGET_TOLERANCE * range) ||
            (dir < 0 && p <= target + TARGET_TOLERANCE * range)
          ) {
            timedOut = false;
            break;
          }
        }
      }
      await safeStop();
      // Deixa o dome assentar antes da leitura final.
      await new Promise((r) => setTimeout(r, 250));
      const finalPos = (await readAxis()) ?? last;
      return {
        observed: finalPos,
        delta: finalPos - target,
        latency_ms: Math.round(performance.now() - started),
        timedOut,
      };
    },
    [axis, phaseTimeout, ptz, readAxis, safeStop, startPosition, range, sweepMs]
  );

  const runPreflight = useCallback(async () => {
    if (!canRun) return;
    setRunning(true);
    setResults([]);
    abortRef.current = false;

    const phases: Array<{ id: PhaseId; label: string; target: number }> = [
      { id: 'A', label: `Ir ao mínimo (${limits.min.toFixed(2)})`, target: limits.min },
      { id: 'B', label: `Ir ao máximo (${limits.max.toFixed(2)})`, target: limits.max },
      { id: 'C', label: `Retornar à origem (${startPosition.toFixed(2)})`, target: startPosition },
    ];

    const collected: PhaseResult[] = [];
    for (const ph of phases) {
      if (abortRef.current) break;
      setCurrentPhase(ph.id);
      const r = await driveToTarget(ph.target);
      let outcome: PhaseOutcome;
      let detail: string | undefined;
      if (abortRef.current) {
        outcome = 'fail';
        detail = 'Abortado pelo operador';
      } else if (r.observed === null || r.observed === undefined) {
        outcome = 'no-telemetry';
        detail = 'Sem GetStatus — apenas tempo estimado';
      } else if (r.timedOut) {
        outcome = 'fail';
        detail = 'Timeout antes de alcançar o alvo';
      } else if (Math.abs(r.delta ?? 0) > DEVIATION_WARN * range) {
        outcome = 'deviation';
        detail = `Δ ${(r.delta ?? 0).toFixed(3)} excede ${(DEVIATION_WARN * range).toFixed(3)}`;
      } else {
        outcome = 'ok';
      }
      const result: PhaseResult = {
        id: ph.id,
        label: ph.label,
        target: ph.target,
        observed: r.observed,
        delta: r.delta,
        latency_ms: r.latency_ms,
        outcome,
        detail,
      };
      collected.push(result);
      setResults((prev) => [...prev, result]);
      void logAttempt(result);
      if (abortRef.current || outcome === 'fail') break;
    }

    setCurrentPhase(null);
    setRunning(false);

    // Persistência auditável do run (checklist + resultado consolidado).
    if (cameraId) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        if (userId) {
          let outcome: 'ok' | 'deviation' | 'fail' | 'aborted' | 'no-telemetry';
          if (abortRef.current && collected.length < 3) outcome = 'aborted';
          else if (collected.some((r) => r.outcome === 'fail')) outcome = 'fail';
          else if (collected.some((r) => r.outcome === 'deviation')) outcome = 'deviation';
          else if (collected.every((r) => r.outcome === 'no-telemetry')) outcome = 'no-telemetry';
          else outcome = 'ok';
          const row = {
            user_id: userId,
            camera_id: cameraId,
            axis,
            ack_area_clear: ackClear,
            ack_watching_live: ackSeeing,
            ack_confirmed_at: ackConfirmedAt,
            outcome,
            aborted: abortRef.current,
            status_supported: statusSupported,
            phases: collected.map((p) => ({
              id: p.id,
              target: p.target,
              observed: p.observed,
              delta: p.delta,
              latency_ms: p.latency_ms,
              outcome: p.outcome,
              detail: p.detail ?? null,
            })),
            limits_snapshot: limits,
          };
          await supabase.from('ptz_preflight_runs').insert(row as never);
        }
      } catch {
        /* best-effort */
      }
    }

    onComplete?.(collected);

    const ok = collected.every((r) => r.outcome === 'ok');
    if (abortRef.current) toast.warning('Pré-voo abortado. Dome parado.');
    else if (ok) toast.success('Pré-voo concluído sem desvios.');
    else toast.warning('Pré-voo concluído com observações. Revise os resultados.');
  }, [
    canRun,
    driveToTarget,
    limits,
    logAttempt,
    onComplete,
    range,
    startPosition,
    ackClear,
    ackSeeing,
    ackConfirmedAt,
    axis,
    cameraId,
    statusSupported,
  ]);

  const handleAbort = useCallback(async () => {
    abortRef.current = true;
    await safeStop();
    toast.info('Abortando pré-voo…');
  }, [safeStop]);

  const outcomeBadge = (o: PhaseOutcome) => {
    if (o === 'ok')
      return (
        <Badge variant="secondary" className="text-[10px]">
          <CheckCircle2 className="w-3 h-3 mr-1" /> alcançado
        </Badge>
      );
    if (o === 'deviation')
      return (
        <Badge variant="outline" className="text-[10px]">
          <AlertTriangle className="w-3 h-3 mr-1" /> desvio
        </Badge>
      );
    if (o === 'no-telemetry')
      return (
        <Badge variant="outline" className="text-[10px]">
          <AlertTriangle className="w-3 h-3 mr-1" /> sem telemetria
        </Badge>
      );
    return (
      <Badge variant="destructive" className="text-[10px]">
        <XCircle className="w-3 h-3 mr-1" /> falha
      </Badge>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!running) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Pré-voo — {AXIS_LABEL[axis]}
          </DialogTitle>
          <DialogDescription>
            O sistema irá mover o dome até <b>mínimo</b>, <b>máximo</b> e retornar à origem.
            Confirme o cenário antes de continuar — o botão <b>Abortar</b> interrompe o movimento a
            qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="rounded-md border p-3 bg-muted/30 text-xs space-y-1 font-mono">
          <div>
            eixo: <b>{axis}</b> · posição atual: <b>{startPosition.toFixed(2)}</b>
          </div>
          <div>
            destino: <b>{limits.min.toFixed(2)}</b> → <b>{limits.max.toFixed(2)}</b>
          </div>
          <div>
            sweep: <b>{sweepMs ? `${(sweepMs / 1000).toFixed(2)}s` : '—'}</b> · timeout/fase:{' '}
            <b>{(phaseTimeout / 1000).toFixed(1)}s</b> · total previsto:{' '}
            <b>~{(totalEstimateMs / 1000).toFixed(0)}s</b>
          </div>
          <div>
            lock PTZ: <b>{lockBusy ? 'ocupado' : 'livre'}</b>
          </div>
        </div>

        {/* Checklist dry-run */}
        <div className="rounded-md border p-3 space-y-1.5 text-xs">
          <div className="font-medium text-sm mb-1">Checagem de segurança</div>
          <ChecklistItem ok={withinBounds} label="Limites dentro do range físico" />
          <ChecklistItem ok={separationOk} label="min < max com margem ≥ 0.05" />
          <ChecklistItem
            ok={sweepAvailable}
            warn={!sweepAvailable}
            label={
              sweepAvailable
                ? 'Sweep calibrado disponível'
                : 'Sweep não calibrado — usará fallback de tempo'
            }
          />
          <ChecklistItem
            ok={telemetryOk}
            warn={!telemetryOk}
            label={
              telemetryOk
                ? 'ONVIF GetStatus operacional'
                : 'Sem telemetria — resultado marcará "sem telemetria"'
            }
          />
          <ChecklistItem
            ok={!lockBusy}
            warn={lockBusy}
            label={
              lockBusy ? 'Lock PTZ ocupado (outro operador)' : 'Nenhum outro eixo em movimento'
            }
          />
        </div>

        {/* Confirmações */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="ack-clear"
              checked={ackClear}
              onCheckedChange={(v) => setAckClear(v === true)}
              disabled={running}
            />
            <Label htmlFor="ack-clear" className="text-xs leading-tight cursor-pointer">
              Área do dome está <b>livre de obstáculos e pessoas</b>.
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="ack-seeing"
              checked={ackSeeing}
              onCheckedChange={(v) => setAckSeeing(v === true)}
              disabled={running}
            />
            <Label htmlFor="ack-seeing" className="text-xs leading-tight cursor-pointer">
              Estou <b>vendo o dome ou o preview ao vivo</b> durante o pré-voo.
            </Label>
          </div>
        </div>

        {/* Resultados por fase */}
        {(running || results.length > 0) && (
          <div className="rounded-md border p-3 space-y-2 text-xs">
            <div className="font-medium text-sm">Execução</div>
            {(['A', 'B', 'C'] as PhaseId[]).map((id) => {
              const r = results.find((x) => x.id === id);
              const active = currentPhase === id;
              return (
                <div key={id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {active && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span className="font-mono">
                      Fase {id}:{' '}
                      {id === 'A'
                        ? `→ min ${limits.min.toFixed(2)}`
                        : id === 'B'
                          ? `→ max ${limits.max.toFixed(2)}`
                          : `→ origem ${startPosition.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r?.delta !== null && r?.delta !== undefined && (
                      <span className="font-mono text-muted-foreground">
                        Δ {r.delta.toFixed(3)}
                      </span>
                    )}
                    {r && <span className="font-mono text-muted-foreground">{r.latency_ms}ms</span>}
                    {r ? (
                      outcomeBadge(r.outcome)
                    ) : active ? (
                      <Badge variant="outline" className="text-[10px]">
                        em execução…
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        aguardando
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          {running ? (
            <Button variant="destructive" onClick={() => void handleAbort()}>
              <Octagon className="w-4 h-4 mr-1" /> Abortar
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={() => void runPreflight()} disabled={!canRun}>
                <ShieldCheck className="w-4 h-4 mr-1" /> Executar pré-voo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistItem({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  const cls = ok ? 'text-success' : warn ? 'text-warning' : 'text-destructive';
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${cls}`} />
      <span>{label}</span>
    </div>
  );
}
