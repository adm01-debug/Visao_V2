import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BACKLOG_TREND_THRESHOLDS as T,
  describeTrend,
  evaluateBacklogSeries,
  formatHours,
  maxSeverity,
  theilSenSlopePerHour,
  type BacklogSample,
} from '@/lib/partitionBacklogTrend';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-07-26T12:00:00.000Z');

function series(samples: BacklogSample[]) {
  return {
    parent: 'plate_detections',
    defaultPartition: 'plate_detections_default',
    samples,
  };
}

/** Série linear terminando em `now`, do mais antigo para o mais recente. */
function linear(count: number, startRows: number, slopePerHour: number, ageHours = 0) {
  return Array.from({ length: count }, (_, i) => ({
    sampledAtMs: NOW - ageHours * HOUR - (count - 1 - i) * HOUR,
    rowCount: Math.max(0, Math.round(startRows + slopePerHour * i)),
  }));
}

describe('theilSenSlopePerHour', () => {
  it('recupera a inclinação exata de uma série perfeitamente linear', () => {
    expect(theilSenSlopePerHour(linear(10, 100, 25))).toBeCloseTo(25, 6);
  });

  it('retorna null quando não há par com intervalo de tempo válido', () => {
    expect(theilSenSlopePerHour([{ sampledAtMs: NOW, rowCount: 5 }])).toBeNull();
    expect(
      theilSenSlopePerHour([
        { sampledAtMs: NOW, rowCount: 5 },
        { sampledAtMs: NOW, rowCount: 900 },
      ]),
    ).toBeNull();
  });

  it('ignora um pico isolado — a razão de não usar mínimos quadrados', () => {
    const contaminated = linear(15, 1_000, 0);
    contaminated[7] = { ...contaminated[7]!, rowCount: 900_000 };
    expect(Math.abs(theilSenSlopePerHour(contaminated)!)).toBeLessThanOrEqual(1);
  });
});

describe('evaluateBacklogSeries', () => {
  it('marca série vazia como obsoleta e em atenção', () => {
    const v = evaluateBacklogSeries(series([]), NOW, T);
    expect(v.severity).toBe('warning');
    expect(v.trend).toBe('unknown');
    expect(v.stale).toBe(true);
    expect(v.reasons[0]).toContain('Nenhuma amostra');
  });

  it('não estima tendência com menos amostras que o mínimo', () => {
    const v = evaluateBacklogSeries(series(linear(2, 100, 500)), NOW, T);
    expect(v.trend).toBe('unknown');
    expect(v.slopePerHour).toBeNull();
    expect(v.hoursToSaturation).toBeNull();
  });

  it('aplica o nível absoluto mesmo sem amostras suficientes', () => {
    const v = evaluateBacklogSeries(series(linear(2, 60_000, 0)), NOW, T);
    expect(v.severity).toBe('critical');
  });

  it('classifica backlog estável e baixo como ok', () => {
    const v = evaluateBacklogSeries(series(linear(12, 300, 0)), NOW, T);
    expect(v.severity).toBe('ok');
    expect(v.trend).toBe('stable');
    expect(v.hoursToSaturation).toBeNull();
  });

  it('reconhece drenagem sem projetar saturação', () => {
    const v = evaluateBacklogSeries(series(linear(12, 5_000, -200)), NOW, T);
    expect(v.trend).toBe('draining');
    expect(v.hoursToSaturation).toBeNull();
    expect(v.severity).toBe('ok');
  });

  it('projeta saturação e escala para crítico dentro de 24h', () => {
    // 50.000 − 2.000 = 48.000 linhas restantes a 4.000/h ⇒ 12h.
    const v = evaluateBacklogSeries(series(linear(12, 2_000, 4_000)), NOW, T);
    expect(v.trend).toBe('growing');
    expect(v.hoursToSaturation).toBeGreaterThan(0);
    expect(v.hoursToSaturation!).toBeLessThanOrEqual(T.criticalHorizonHours);
    expect(v.severity).toBe('critical');
  });

  it('emite atenção quando a saturação cai na janela intermediária', () => {
    // Restam ~49.000 linhas a 1.000/h ⇒ ~49h: entre 24h e 72h.
    const v = evaluateBacklogSeries(series(linear(12, 1_000, 1_000)), NOW, T);
    expect(v.hoursToSaturation!).toBeGreaterThan(T.criticalHorizonHours);
    expect(v.hoursToSaturation!).toBeLessThanOrEqual(T.warnHorizonHours);
    expect(v.severity).toBe('warning');
  });

  it('trata backlog já acima da capacidade como saturado agora', () => {
    const v = evaluateBacklogSeries(series(linear(12, 80_000, 0)), NOW, T);
    expect(v.hoursToSaturation).toBe(0);
    expect(v.severity).toBe('critical');
  });

  it('eleva a severidade quando o coletor está parado', () => {
    const v = evaluateBacklogSeries(series(linear(12, 100, 0, 30)), NOW, T);
    expect(v.stale).toBe(true);
    expect(v.severity).toBe('warning');
    expect(v.reasons.join(' ')).toContain('coletor');
  });

  it('ordena amostras fora de sequência antes de analisar', () => {
    const ordered = linear(6, 1_000, 100);
    const shuffled = [ordered[3]!, ordered[0]!, ordered[5]!, ordered[1]!, ordered[4]!, ordered[2]!];
    expect(evaluateBacklogSeries(series(shuffled), NOW, T)).toEqual(
      evaluateBacklogSeries(series(ordered), NOW, T),
    );
  });

  it('descarta amostras inválidas sem lançar', () => {
    const v = evaluateBacklogSeries(
      series([
        { sampledAtMs: Number.NaN, rowCount: 10 },
        { sampledAtMs: NOW - HOUR, rowCount: -3 },
        { sampledAtMs: NOW - 2 * HOUR, rowCount: 40 },
        { sampledAtMs: NOW, rowCount: 42 },
      ]),
      NOW,
      T,
    );
    expect(v.sampleCount).toBe(2);
    expect(Number.isFinite(v.currentRows)).toBe(true);
  });

  it('é determinística para a mesma entrada', () => {
    const s = series(linear(9, 4_000, 130));
    expect(evaluateBacklogSeries(s, NOW, T)).toEqual(evaluateBacklogSeries(s, NOW, T));
  });
});

describe('formatadores', () => {
  it('formata horizontes em minutos, horas e dias', () => {
    expect(formatHours(0)).toBe('agora');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(12)).toBe('12.0 h');
    expect(formatHours(96)).toBe('4.0 dias');
    expect(formatHours(Number.POSITIVE_INFINITY)).toBe('tempo indeterminado');
  });

  it('descreve as tendências em PT-BR', () => {
    expect(describeTrend('growing')).toBe('Crescendo');
    expect(describeTrend('draining')).toBe('Drenando');
    expect(describeTrend('stable')).toBe('Estável');
    expect(describeTrend('unknown')).toBe('Indeterminada');
  });

  it('maxSeverity respeita a ordem ok < warning < critical', () => {
    expect(maxSeverity('ok', 'warning')).toBe('warning');
    expect(maxSeverity('critical', 'warning')).toBe('critical');
    expect(maxSeverity('ok', 'ok')).toBe('ok');
  });
});
