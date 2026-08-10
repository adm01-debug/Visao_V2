import { describe, it, expect } from 'vitest';
import {
  classifyClockSkew,
  formatSkew,
  CLOCK_SKEW_SEVERITY_RANK,
  DEFAULT_CLOCK_SKEW_THRESHOLDS,
  type CameraSkewSample,
} from '@/lib/clockSkew';

const base: CameraSkewSample = {
  cameraId: 'cam-1',
  sampleCount: 50,
  medianSkewSeconds: 0,
  maxAbsSkewSeconds: 0,
  sentinelPastRows: 0,
  sentinelFutureRows: 0,
  healthState: 'online',
};

describe('classifyClockSkew', () => {
  it('exige amostras mínimas antes de qualquer veredito (I1)', () => {
    const finding = classifyClockSkew({ ...base, sampleCount: 2, medianSkewSeconds: 99999 });
    expect(finding.severity).toBe('insufficient_data');
    expect(finding.suppressed).toBe(true);
  });

  it('classifica relógio dentro da tolerância como ok (I2)', () => {
    expect(classifyClockSkew({ ...base, medianSkewSeconds: 120 }).severity).toBe('ok');
  });

  it('classifica desvio moderado como atenção (I3)', () => {
    expect(classifyClockSkew({ ...base, medianSkewSeconds: 600 }).severity).toBe('warning');
  });

  it('classifica desvio grande como crítico (I4)', () => {
    expect(classifyClockSkew({ ...base, medianSkewSeconds: -7200 }).severity).toBe('critical');
  });

  it('trata carimbo impossível como crítico mesmo com poucas amostras (I5)', () => {
    const finding = classifyClockSkew({ ...base, sampleCount: 1, sentinelPastRows: 3 });
    expect(finding.severity).toBe('critical');
    expect(finding.reason).toContain('RTC');
  });

  it('mantém severidade monotônica no desvio (I6)', () => {
    const ranks = [0, 300, 3600, 86400].map(
      (s) => CLOCK_SKEW_SEVERITY_RANK[classifyClockSkew({ ...base, medianSkewSeconds: s }).severity]
    );
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('é simétrico no sinal e reporta a direção (I7)', () => {
    const ahead = classifyClockSkew({ ...base, medianSkewSeconds: 900 });
    const behind = classifyClockSkew({ ...base, medianSkewSeconds: -900 });
    expect(ahead.severity).toBe(behind.severity);
    expect(ahead.direction).toBe('ahead');
    expect(behind.direction).toBe('behind');
  });

  it('suprime alerta de câmera não-online sem rebaixar a severidade (I8)', () => {
    const finding = classifyClockSkew({ ...base, medianSkewSeconds: 7200, healthState: 'offline' });
    expect(finding.severity).toBe('critical');
    expect(finding.suppressed).toBe(true);
  });

  it('nunca reporta máximo menor que a mediana', () => {
    const finding = classifyClockSkew({ ...base, medianSkewSeconds: 5000, maxAbsSkewSeconds: 10 });
    expect(finding.maxAbsSkewSeconds).toBeGreaterThanOrEqual(5000);
  });

  it('tolera agregados inválidos sem lançar exceção', () => {
    expect(() =>
      classifyClockSkew({
        ...base,
        sampleCount: Number.NaN,
        medianSkewSeconds: Number.NaN,
        maxAbsSkewSeconds: Number.POSITIVE_INFINITY,
      })
    ).not.toThrow();
  });

  it('respeita limiares customizados', () => {
    const strict = { minSamples: 1, warnSeconds: 10, criticalSeconds: 20 };
    expect(classifyClockSkew({ ...base, medianSkewSeconds: 15 }, strict).severity).toBe('warning');
    expect(
      classifyClockSkew({ ...base, medianSkewSeconds: 15 }, DEFAULT_CLOCK_SKEW_THRESHOLDS).severity
    ).toBe('ok');
  });
});

describe('formatSkew', () => {
  it('formata segundos, minutos, horas e dias em PT-BR', () => {
    expect(formatSkew(30)).toBe('30s adiantado');
    expect(formatSkew(-600)).toBe('10min atrasado');
    expect(formatSkew(7200)).toBe('2.0h adiantado');
    expect(formatSkew(-172800)).toBe('2.0d atrasado');
    expect(formatSkew(0)).toBe('0s');
  });
});
