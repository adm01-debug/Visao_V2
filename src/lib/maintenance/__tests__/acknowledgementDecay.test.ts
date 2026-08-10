import { describe, expect, it } from 'vitest';
import {
  assessAcknowledgement,
  launderedCriticalCount,
  promiseWindowMinutes,
  undeliveredCriticalCount,
  type AcknowledgementInput,
} from '../acknowledgementDecay';

const NOW = Date.UTC(2026, 6, 29, 16, 0, 0);
const MIN = 60_000;

function input(over: Partial<AcknowledgementInput> = {}): AcknowledgementInput {
  return {
    acknowledgedAtMs: NOW - 10 * MIN,
    acknowledgedBy: 'admin-uuid',
    severityAtAck: 'critical',
    severityNow: 'critical',
    conditionPersists: true,
    selfReferential: false,
    cadenceMinutes: 60,
    ...over,
  };
}

describe('undeliveredCriticalCount (X2) — o coração corretivo da onda', () => {
  it('reconhecer NUNCA reduz a acusação de mudez', () => {
    const rows = [
      { delivered: false, acknowledgedAtMs: null },
      { delivered: false, acknowledgedAtMs: null },
      { delivered: true, acknowledgedAtMs: null },
    ];
    expect(undeliveredCriticalCount(rows)).toBe(2);

    const allAcked = rows.map((r) => ({ ...r, acknowledgedAtMs: NOW }));
    expect(undeliveredCriticalCount(allAcked)).toBe(2);
  });

  it('mede a lavagem em vez de escondê-la', () => {
    const rows = [
      { delivered: false, acknowledgedAtMs: NOW },
      { delivered: false, acknowledgedAtMs: null },
      { delivered: true, acknowledgedAtMs: NOW },
    ];
    expect(launderedCriticalCount(rows)).toBe(1);
  });
});

describe('assessAcknowledgement', () => {
  it('X1 — atenção nunca é remediação: pendente não limpa a condição', () => {
    const v = assessAcknowledgement(input(), NOW);
    expect(v.state).toBe('pending');
    expect(v.suppressesEscalation).toBe(true);
    expect(v.clearsCondition).toBe(false);
  });

  it('X3 — janela vencida com condição viva faz a acusação voltar', () => {
    const v = assessAcknowledgement(input({ acknowledgedAtMs: NOW - 300 * MIN }), NOW);
    expect(v.state).toBe('expired');
    expect(v.suppressesEscalation).toBe(false);
  });

  it('X4 — condição resolvida honra o ack mesmo com prazo vencido', () => {
    const v = assessAcknowledgement(
      input({ acknowledgedAtMs: NOW - 99_999 * MIN, conditionPersists: false }),
      NOW
    );
    expect(v.state).toBe('honored');
    expect(v.clearsCondition).toBe(true);
  });

  it('fail-safe — não conseguir medir a condição nunca honra o ack', () => {
    const v = assessAcknowledgement(input({ conditionPersists: null }), NOW);
    expect(v.state).not.toBe('honored');
  });

  it('X5 — agravamento invalida o consentimento anterior', () => {
    const v = assessAcknowledgement(
      input({ severityAtAck: 'warning', severityNow: 'critical' }),
      NOW
    );
    expect(v.state).toBe('void_aggravated');
    expect(v.suppressesEscalation).toBe(false);
  });

  it('X7 — auto-referente nunca pinta saúde, nem quando honrado', () => {
    const v = assessAcknowledgement(
      input({ conditionPersists: false, selfReferential: true }),
      NOW
    );
    expect(v.state).toBe('honored');
    expect(v.clearsCondition).toBe(false);
  });

  it('X9 — ack sem autor legível não é consentimento', () => {
    for (const author of [null, '', '   ']) {
      const v = assessAcknowledgement(input({ acknowledgedBy: author }), NOW);
      expect(v.state).toBe('void_unattributed');
      expect(v.suppressesEscalation).toBe(false);
    }
  });

  it('sem reconhecimento é um estado próprio, não um ack inválido', () => {
    const v = assessAcknowledgement(input({ acknowledgedAtMs: null }), NOW);
    expect(v.state).toBe('none');
  });
});

describe('promiseWindowMinutes (X8)', () => {
  it('urgência encurta a paciência', () => {
    expect(promiseWindowMinutes('critical', 60)).toBeLessThan(promiseWindowMinutes('warning', 60));
  });

  it('nunca reacusa antes de a fonte ter nova chance de medir', () => {
    expect(promiseWindowMinutes('critical', 600)).toBeGreaterThanOrEqual(600);
  });

  it('cadência inválida falha alto', () => {
    expect(() => promiseWindowMinutes('critical', 0)).toThrow(RangeError);
  });
});
