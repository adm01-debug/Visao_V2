import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REDELIVERY_POLICY as P,
  evaluateRedelivery,
  wilsonLowerBound,
  type RedeliverySeverity,
} from '../relayRedeliveryHealth';

const ev = (deliveries: number, redeliveries: number, previousSeverity: RedeliverySeverity = 'none') =>
  evaluateRedelivery({ agentId: 'agent-1', deliveries, redeliveries, previousSeverity });

describe('wilsonLowerBound', () => {
  it('devolve 0 sem amostra', () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(3, 0)).toBe(0);
  });

  it('nunca excede a proporção observada (I2)', () => {
    for (let n = 1; n <= 300; n += 7) {
      for (let k = 0; k <= n; k += Math.max(1, Math.floor(n / 5))) {
        expect(wilsonLowerBound(k, n)).toBeLessThanOrEqual(k / n + 1e-12);
      }
    }
  });

  it('converge para a proporção com amostra grande', () => {
    // O piso permanece estritamente abaixo de p (é um limite inferior), mas a
    // distância encolhe com sqrt(n): ~0.08 p.p. em um milhão de amostras.
    const lb = wilsonLowerBound(200_000, 1_000_000);
    expect(lb).toBeLessThan(0.2);
    expect(0.2 - lb).toBeLessThan(0.001);
  });


  it('mantém o resultado dentro de [0,1] mesmo com entrada inválida', () => {
    expect(wilsonLowerBound(-5, 10)).toBe(0);
    expect(wilsonLowerBound(50, 10)).toBeLessThanOrEqual(1);
  });
});

describe('evaluateRedelivery', () => {
  it('não acusa com amostra abaixo do mínimo, mesmo com taxa absurda (I1)', () => {
    const v = ev(P.minSamples - 1, P.minSamples - 1);
    expect(v.severity).toBe('none');
    expect(v.reason).toContain('amostra insuficiente');
  });

  it('não acusa quando não há reentrega imputável (I3)', () => {
    expect(ev(5_000, 0).severity).toBe('none');
  });

  it('emite aviso em degradação moderada com amostra suficiente', () => {
    expect(ev(200, 44).severity).toBe('warning');
  });

  it('emite crítico quando o piso estatístico ultrapassa o limiar', () => {
    expect(ev(200, 90).severity).toBe('critical');
  });

  it('é monotônico na contagem de reentregas (I4)', () => {
    const rank = { none: 0, warning: 1, critical: 2 } as const;
    let last = -1;
    for (let k = 0; k <= 120; k++) {
      const r = rank[ev(120, k).severity];
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });

  it('aplica histerese: quem já está em aviso não sai na primeira oscilação (I5)', () => {
    let borderline = -1;
    for (let k = 0; k <= 200; k++) {
      if (ev(200, k, 'none').severity === 'warning') { borderline = k; break; }
    }
    expect(borderline).toBeGreaterThan(0);
    // Um passo abaixo do limiar de entrada: novo agente fica em silêncio,
    // agente já em aviso permanece em aviso.
    expect(ev(200, borderline - 1, 'none').severity).toBe('none');
    expect(ev(200, borderline - 1, 'warning').severity).toBe('warning');
  });

  it('a severidade nunca diminui quando o estado anterior é mais grave', () => {
    const rank = { none: 0, warning: 1, critical: 2 } as const;
    for (let k = 0; k <= 100; k += 3) {
      const a = rank[ev(100, k, 'none').severity];
      const b = rank[ev(100, k, 'warning').severity];
      const c = rank[ev(100, k, 'critical').severity];
      expect(b).toBeGreaterThanOrEqual(a);
      expect(c).toBeGreaterThanOrEqual(b);
    }
  });

  it('é uma função pura do estado (I6)', () => {
    expect(ev(137, 41, 'warning')).toEqual(ev(137, 41, 'warning'));
  });

  it('trunca contagens incoerentes em vez de produzir taxa > 100%', () => {
    const v = ev(50, 500);
    expect(v.observedRate).toBeLessThanOrEqual(1);
    expect(v.lowerBound).toBeLessThanOrEqual(1);
  });
});
