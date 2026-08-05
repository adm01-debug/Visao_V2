import { describe, expect, it } from 'vitest';
import {
  buildDeliverabilityAlert,
  deliverabilityAlertSeverity,
  deliverabilityCooldownMinutes,
  deliverabilityRoutineKey,
  COOLDOWN_CEILING_MINUTES,
  COOLDOWN_FLOOR_MINUTES,
} from '../deliverabilityAlert';
import type { DeliverabilityVerdict } from '../dispatchDeliverability';

function verdict(over: Partial<DeliverabilityVerdict> = {}): DeliverabilityVerdict {
  return {
    punctuality: 'fresh',
    delivery: 'delivering',
    health: 'ok',
    minutesSinceRun: 10,
    lastRunAt: '2026-07-29T15:50:00.000Z',
    channels: ['telegram'],
    unnotifiedCritical: 0,
    reasons: [],
    ...over,
  };
}

describe('deliverabilityAlertSeverity (W1–W7)', () => {
  it('W2 — mudo com crítico aberto é crítico; sem crítico é aviso', () => {
    expect(deliverabilityAlertSeverity('muted', 205)).toBe('critical');
    expect(deliverabilityAlertSeverity('muted', 0)).toBe('warning');
  });

  it('W3 — canal configurado que não entrega é sempre crítico', () => {
    expect(deliverabilityAlertSeverity('failing', 0)).toBe('critical');
    expect(deliverabilityAlertSeverity('failing', 99)).toBe('critical');
  });

  it('W4 — entrega parcial é aviso, nunca crítico', () => {
    expect(deliverabilityAlertSeverity('degraded', 500)).toBe('warning');
  });

  it('W5 — ignorância nunca é silêncio e agrava com gente esperando', () => {
    expect(deliverabilityAlertSeverity('unknown', 0)).toBe('warning');
    expect(deliverabilityAlertSeverity('unknown', 1)).toBe('critical');
  });

  it('W6 — livro que não fecha é aviso, nunca crítico e nunca ok', () => {
    expect(deliverabilityAlertSeverity('unreadable', 1000)).toBe('warning');
  });

  it('W7 — entrega saudável e ociosidade não emitem', () => {
    expect(deliverabilityAlertSeverity('delivering', 0)).toBeNull();
    expect(deliverabilityAlertSeverity('idle', 0)).toBeNull();
  });

  it('contagem corrompida nunca atenua a gravidade', () => {
    expect(deliverabilityAlertSeverity('muted', Number.NaN)).toBe('warning');
    expect(deliverabilityAlertSeverity('muted', -5)).toBe('warning');
  });
});

describe('deliverabilityCooldownMinutes (W8)', () => {
  it('crítico reaparece antes do aviso', () => {
    expect(deliverabilityCooldownMinutes(600, 'critical')).toBeLessThan(
      deliverabilityCooldownMinutes(600, 'warning')
    );
  });

  it('respeita piso e teto', () => {
    expect(deliverabilityCooldownMinutes(1, 'warning')).toBe(COOLDOWN_FLOOR_MINUTES);
    expect(deliverabilityCooldownMinutes(999_999, 'warning')).toBe(COOLDOWN_CEILING_MINUTES);
  });

  it('cadência inválida falha alto em vez de silenciar', () => {
    expect(() => deliverabilityCooldownMinutes(0, 'warning')).toThrow(RangeError);
    expect(() => deliverabilityCooldownMinutes(Number.NaN, 'warning')).toThrow(RangeError);
  });
});

describe('buildDeliverabilityAlert', () => {
  it('W7 — estado saudável não produz alerta', () => {
    expect(buildDeliverabilityAlert(verdict())).toBeNull();
    expect(buildDeliverabilityAlert(null)).toBeNull();
  });

  it('W9 — mudez é auto-referente e declara isso na frase', () => {
    const alert = buildDeliverabilityAlert(
      verdict({ delivery: 'muted', channels: [], unnotifiedCritical: 205, health: 'critical' })
    );
    expect(alert).not.toBeNull();
    expect(alert?.selfReferential).toBe(true);
    expect(alert?.detail.self_referential).toBe(true);
    expect(alert?.reason).toContain('não sai por canal externo');
  });

  it('W9 — degradação NÃO é auto-referente: parte do canal ainda funciona', () => {
    const alert = buildDeliverabilityAlert(verdict({ delivery: 'degraded', health: 'warning' }));
    expect(alert?.selfReferential).toBe(false);
    expect(alert?.reason).not.toContain('não sai por canal externo');
  });

  it('W10 — a frase sempre carrega os números da acusação', () => {
    const alert = buildDeliverabilityAlert(
      verdict({ delivery: 'muted', channels: [], unnotifiedCritical: 205, minutesSinceRun: 61 })
    );
    expect(alert?.reason).toContain('205 crítico(s) sem aviso');
    expect(alert?.reason).toContain('nenhum canal configurado');
    expect(alert?.reason).toContain('cadência 60 min');
  });

  it('chave é estável e prefixada, sem colidir com outros fan-ins', () => {
    const alert = buildDeliverabilityAlert(verdict({ delivery: 'failing' }));
    expect(alert?.routine).toBe(deliverabilityRoutineKey());
    expect(alert?.routine.startsWith('dispatch_deliverability:')).toBe(true);
  });

  it('sem execução registrada, o detalhe não inventa idade nem carimbo', () => {
    const alert = buildDeliverabilityAlert(
      verdict({
        delivery: 'unknown',
        punctuality: 'unknown',
        health: 'unknown',
        minutesSinceRun: null,
        lastRunAt: null,
        channels: [],
      })
    );
    expect(alert?.detail.minutes_since_run).toBeNull();
    expect(alert?.detail.last_run_at).toBeNull();
    expect(alert?.reason).toContain('sem execução registrada');
  });
});
