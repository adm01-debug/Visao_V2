/**
 * VISÃO — Timeline visual da telemetria de prévias.
 *
 * Renderiza uma área empilhada (started/extended/stopped/failed) por bucket temporal,
 * derivado do campo `timeline` retornado por `get_preview_telemetry_summary`.
 *
 * Design:
 *  - Cores via tokens semânticos HSL (nada hard-coded).
 *  - Tooltip customizado em PT-BR com contagens absolutas.
 *  - Fallback acessível quando não há dados.
 */
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface PreviewTelemetryTimelinePoint {
  bucket: string;
  started: number;
  extended: number;
  stopped: number;
  failed: number;
}

interface Props {
  points: PreviewTelemetryTimelinePoint[];
  windowHours: number;
}

function fmtBucket(iso: string, windowHours: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (windowHours <= 24) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function PreviewTelemetryTimeline({ points, windowHours }: Props) {
  const data = useMemo(
    () =>
      (points ?? []).map((p) => ({
        ...p,
        label: fmtBucket(p.bucket, windowHours),
      })),
    [points, windowHours]
  );

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem eventos suficientes para desenhar a linha do tempo.
      </p>
    );
  }

  return (
    <div className="h-64 w-full" role="img" aria-label="Linha do tempo de eventos de prévia">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pt-started" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="pt-failed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.7} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            formatter={(value, name) => {
              const map: Record<string, string> = {
                started: 'Iniciadas',
                extended: 'Estendidas',
                stopped: 'Encerradas',
                failed: 'Falhas',
              };
              const key = String(name ?? '');
              return [Number(value ?? 0), map[key] ?? key];
            }}
          />
          <Area
            type="monotone"
            dataKey="started"
            stackId="1"
            stroke="hsl(var(--primary))"
            fill="url(#pt-started)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="failed"
            stackId="1"
            stroke="hsl(var(--destructive))"
            fill="url(#pt-failed)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PreviewTelemetryTimeline;
