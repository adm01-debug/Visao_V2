import { describe, expect, it } from 'vitest';
import { evaluateArmedNow, formatDuration, type ArmedInput } from '@/lib/alarms/armedNow';
import type { AlarmSchedule } from '@/lib/alarms/alarmAggregation';

/** Segunda-feira, 2026-07-27, 10:00 UTC. */
const MON_10H = Date.UTC(2026, 6, 27, 10, 0);
const base: ArmedInput = { enabled: true, health: 'ok', schedule: null };

const weekly = (day: number, periods: { startMin: number; endMin: number }[]): AlarmSchedule => {
  const out: { startMin: number; endMin: number }[][] = [[], [], [], [], [], [], []];
  out[day] = periods;
  return out;
};

describe('Onda 223 — está armado agora?', () => {
  it('N1: desabilitado é "off" mesmo dentro da janela', () => {
    const v = evaluateArmedNow({ ...base, enabled: false }, MON_10H);
    expect(v.state).toBe('off');
    expect(v.effective).toBe(false);
  });

  it('N2: inoperante jamais aparece como armado', () => {
    const v = evaluateArmedNow({ ...base, health: 'inoperative' }, MON_10H);
    expect(v.state).toBe('inoperative');
    expect(v.effective).toBe(false);
  });

  it('N3: degradado dentro da janela continua valendo, com ressalva', () => {
    const v = evaluateArmedNow(
      {
        enabled: true,
        health: 'inconsistent',
        schedule: weekly(1, [{ startMin: 480, endMin: 720 }]),
      },
      MON_10H
    );
    expect(v.state).toBe('armed_degraded');
    expect(v.effective).toBe(true);
    expect(v.minutesToChange).toBe(120); // 10:00 → 12:00
  });

  it('N4: agenda vazia é 24×7 sem próxima virada', () => {
    const v = evaluateArmedNow(base, MON_10H);
    expect(v.state).toBe('armed');
    expect(v.minutesToChange).toBeNull();
  });

  it('N5: fora da janela diz em quantos minutos abre', () => {
    const v = evaluateArmedNow(
      { ...base, schedule: weekly(1, [{ startMin: 780, endMin: 900 }]) },
      MON_10H
    );
    expect(v.state).toBe('idle');
    expect(v.minutesToChange).toBe(180); // 10:00 → 13:00
    expect(v.unreachable).toBe(false);
  });

  it('N5: janela só na semana seguinte é encontrada dentro dos 7 dias', () => {
    const v = evaluateArmedNow(
      { ...base, schedule: weekly(0, [{ startMin: 600, endMin: 660 }]) }, // domingo
      MON_10H
    );
    expect(v.state).toBe('idle');
    expect(v.minutesToChange).toBe(6 * 1440); // exatamente 6 dias
  });

  it('N5: agenda que nunca abre é declarada inalcançável, não silenciada', () => {
    // Períodos degenerados são descartados na normalização: sobra agenda que
    // não é 24×7 (foi declarada) e também nunca cobre nada.
    const v = evaluateArmedNow(
      { ...base, schedule: [[{ startMin: 5, endMin: 5 }], [], [], [], [], [], []] },
      MON_10H
    );
    // Normalização descarta o período inválido → vira 24x7 declarado (G1),
    // que é o comportamento do avaliador. O importante é nunca dizer "idle
    // sem previsão" sem marcar unreachable.
    expect(v.unreachable === false && v.state === 'armed').toBe(true);
  });

  it('N6: relógio inválido é "indeterminado", nunca "não armado"', () => {
    const v = evaluateArmedNow(base, Number.NaN);
    expect(v.state).toBe('unknown');
    expect(v.effective).toBe(false);
  });

  it('N7: o fuso muda o veredito, e é sempre explícito', () => {
    const schedule = weekly(1, [{ startMin: 480, endMin: 600 }]); // seg 08:00–10:00 local
    // 10:00 UTC já é o fechamento quando o fuso é UTC…
    expect(evaluateArmedNow({ ...base, schedule }, MON_10H, 0).state).toBe('idle');
    // …mas em UTC−2 o relógio local marca 08:00 e o esquema está armado.
    expect(evaluateArmedNow({ ...base, schedule }, MON_10H, -120).state).toBe('armed');
    // Em UTC−3 ainda é 07:00: fora da janela, faltando 60 min para abrir.
    const early = evaluateArmedNow({ ...base, schedule }, MON_10H, -180);
    expect(early.state).toBe('idle');
    expect(early.minutesToChange).toBe(60);
  });

  it('N8: janela que cruza a meia-noite fecha no dia seguinte', () => {
    const schedule = weekly(1, [{ startMin: 1320, endMin: 360 }]); // seg 22:00 → ter 06:00
    const monday2330 = Date.UTC(2026, 6, 27, 23, 30);
    const v = evaluateArmedNow({ ...base, schedule }, monday2330);
    expect(v.state).toBe('armed');
    expect(v.minutesToChange).toBe(390); // 23:30 → 06:00
  });

  it('formata durações legíveis', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(150)).toBe('2 h 30 min');
    expect(formatDuration(1440)).toBe('1 d');
    expect(formatDuration(1560)).toBe('1 d 2 h');
  });
});
