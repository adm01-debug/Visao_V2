import { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, PauseCircle, RadioTower } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { usePtzControl } from '@/hooks/usePtzControl';

interface PtzLiveStatusPanelProps {
  ptz: ReturnType<typeof usePtzControl>;
  /** Quando true, o polling é suspenso (ex.: medição/revalidação em curso). */
  paused?: boolean;
  /** Intervalo base entre chamadas GetStatus. Default 1000ms. */
  intervalMs?: number;
}

type Snapshot = {
  pan: number | null;
  tilt: number | null;
  zoom: number | null;
  moving: { pan_tilt: boolean | null; zoom: boolean | null };
  at: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
};

const MAX_HISTORY = 30;

function fmt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(3);
}

/**
 * Painel de telemetria em tempo real do ONVIF GetStatus para uso durante
 * calibração PTZ. Faz polling periódico, mede latência de cada chamada e
 * exibe a taxa de sucesso das últimas amostras — permite ao operador
 * confirmar visualmente que o driver está retornando valores.
 */
export function PtzLiveStatusPanel({
  ptz,
  paused = false,
  intervalMs = 1000,
}: PtzLiveStatusPanelProps) {
  const [enabled, setEnabled] = useState(true);
  const [latest, setLatest] = useState<Snapshot | null>(null);
  const historyRef = useRef<Snapshot[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled || paused) return;
    let cancelled = false;

    const tick = async () => {
      const t0 = performance.now();
      let snap: Snapshot;
      try {
        const st = await ptz.getStatus();
        const latencyMs = Math.round(performance.now() - t0);
        if (!st) {
          snap = {
            pan: null,
            tilt: null,
            zoom: null,
            moving: { pan_tilt: null, zoom: null },
            at: Date.now(),
            latencyMs,
            ok: false,
            error: 'GetStatus retornou vazio',
          };
          setSupported((prev) => prev ?? false);
        } else {
          snap = {
            pan: typeof st.position.pan === 'number' ? st.position.pan : null,
            tilt: typeof st.position.tilt === 'number' ? st.position.tilt : null,
            zoom: typeof st.position.zoom === 'number' ? st.position.zoom : null,
            moving: st.moving,
            at: Date.now(),
            latencyMs,
            ok: true,
          };
          setSupported(true);
        }
      } catch (err) {
        snap = {
          pan: null,
          tilt: null,
          zoom: null,
          moving: { pan_tilt: null, zoom: null },
          at: Date.now(),
          latencyMs: Math.round(performance.now() - t0),
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      if (cancelled) return;
      historyRef.current = [snap, ...historyRef.current].slice(0, MAX_HISTORY);
      setLatest(snap);
      setSampleCount((n) => n + 1);
    };

    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, paused, intervalMs, ptz]);

  const history = historyRef.current;
  const successCount = history.filter((s) => s.ok).length;
  const successPct = history.length === 0 ? 0 : Math.round((successCount / history.length) * 100);
  const avgLatency =
    history.length === 0
      ? 0
      : Math.round(history.reduce((acc, s) => acc + s.latencyMs, 0) / history.length);
  const ageMs = latest ? Date.now() - latest.at : null;
  const isStale = ageMs != null && ageMs > intervalMs * 3;

  return (
    <div
      className="rounded-md border p-3 space-y-3 bg-muted/20"
      data-testid="ptz-live-status-panel"
      aria-live="polite"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RadioTower className="w-4 h-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">GetStatus ao vivo</span>
          {supported === true && (
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Suportado
            </Badge>
          )}
          {supported === false && (
            <Badge variant="outline" className="text-[10px]">
              <AlertCircle className="w-3 h-3 mr-1" /> Sem GetStatus
            </Badge>
          )}
          {paused && (
            <Badge variant="outline" className="text-[10px]">
              <PauseCircle className="w-3 h-3 mr-1" /> Pausado (operação em curso)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="ptz-live-toggle" className="text-xs text-muted-foreground">
            Polling {intervalMs}ms
          </Label>
          <Switch
            id="ptz-live-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Ativar telemetria ao vivo"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        <StatusCell label="Pan" value={fmt(latest?.pan ?? null)} />
        <StatusCell label="Tilt" value={fmt(latest?.tilt ?? null)} />
        <StatusCell label="Zoom" value={fmt(latest?.zoom ?? null)} />
        <StatusCell
          label="Moving"
          value={
            latest
              ? `${latest.moving.pan_tilt ? 'PT' : '—'} · ${latest.moving.zoom ? 'Z' : '—'}`
              : '—'
          }
          highlight={!!(latest && (latest.moving.pan_tilt || latest.moving.zoom))}
        />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground font-mono">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" aria-hidden />
          <span>
            {latest ? new Date(latest.at).toLocaleTimeString() : '—'}
            {ageMs != null && ` · há ${(ageMs / 1000).toFixed(1)}s`}
          </span>
          {isStale && (
            <Badge variant="destructive" className="text-[9px] ml-1">
              STALE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>
            latência última {latest?.latencyMs ?? '—'}ms · média {avgLatency}ms
          </span>
          <span>
            sucesso {successCount}/{history.length} ({successPct}%) · amostras {sampleCount}
          </span>
        </div>
      </div>

      {latest && !latest.ok && latest.error && (
        <div className="text-[10px] text-destructive font-mono truncate" title={latest.error}>
          Erro: {latest.error}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex gap-[2px] h-3" aria-label="Histórico de sucesso das últimas amostras">
          {history
            .slice()
            .reverse()
            .map((s, i) => (
              <div
                key={`${s.at}-${i}`}
                className={`flex-1 rounded-sm ${s.ok ? 'bg-emerald-500/70' : 'bg-destructive/70'}`}
                title={`${new Date(s.at).toLocaleTimeString()} · ${s.ok ? `${s.latencyMs}ms` : (s.error ?? 'erro')}`}
              />
            ))}
        </div>
      )}

      {!enabled && (
        <div className="text-[10px] text-muted-foreground">
          Polling desativado — nenhuma amostra sendo coletada.
        </div>
      )}
    </div>
  );
}

function StatusCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded border px-2 py-1 ${highlight ? 'border-primary/50 bg-primary/5' : 'bg-background'}`}
    >
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs">{value}</div>
    </div>
  );
}
