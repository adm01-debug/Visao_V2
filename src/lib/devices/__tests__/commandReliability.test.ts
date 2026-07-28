import { describe, expect, it } from 'vitest';
import {
  classifyCommandReliability,
  classifyFleetReliability,
  DEAF_THRESHOLD,
  MIN_SAMPLE,
  summarizeReliability,
  wilsonLowerBound,
  type CommandOutcome,
} from '@/lib/devices/commandReliability';

const row = (over: Partial<CommandOutcome> = {}): CommandOutcome => ({
  registrationId: 'r1',
  command: 'config.read',
  status: 'completed',
  settledBy: 'device',
  settledAt: 1_000,
  ...over,
});

const many = (n: number, over: Partial<CommandOutcome> = {}) =>
  Array.from({ length: n }, () => row(over));

const silent = (n: number, command = 'config.read') =>
  many(n, { status: 'expired', settledBy: 'sweep', command });

describe('reputação de obediência ao comando (Onda 196)', () => {
  it('amostra curta é "não sei", nunca "saudável"', () => {
    const v = classifyCommandReliability('r1', many(MIN_SAMPLE - 1));
    expect(v.state).toBe('insufficient_evidence');
    expect(v.severity).toBeNull();
  });

  it('silêncio observado condena; falha declarada não é silêncio', () => {
    expect(classifyCommandReliability('r1', silent(12)).state).toBe('deaf');
    const f = classifyCommandReliability('r1', many(12, { status: 'failed' }));
    expect(f.state).toBe('failing');
    expect(f.silent).toBe(0);
    expect(f.severity).toBe('warning');
  });

  it('ordem viva e ordem de outro dono ficam fora da amostra', () => {
    const v = classifyCommandReliability('r1', [
      ...many(6),
      row({ status: 'delivered', settledBy: null, settledAt: null }),
      row({ registrationId: 'r2' }),
    ]);
    expect(v.sample).toBe(6);
  });

  it('ato físico sem destino conhecido eleva a gravidade, mas não inventa doença', () => {
    const v = classifyCommandReliability('r1', [...many(9), ...silent(1, 'device.reboot')]);
    expect(v.state).toBe('healthy');
    expect(v.severity).toBe('warning');
    expect(v.unresolvedEffectful).toBe(1);
  });

  it('histerese impede oscilação sem prender equipamento curado', () => {
    const borderline = [...silent(3), ...many(17)];
    const fresh = classifyCommandReliability('r1', borderline);
    const fromDeaf = classifyCommandReliability('r1', borderline, { previous: 'deaf' });
    expect(fromDeaf.state === 'deaf' || fromDeaf.state === fresh.state).toBe(true);
    const recovered = classifyCommandReliability('r1', many(40), { previous: 'deaf' });
    expect(recovered.state).toBe('healthy');
  });

  it('o piso de Wilson nunca ultrapassa a taxa observada', () => {
    for (const [k, n] of [[1, 3], [5, 10], [40, 41]] as const) {
      expect(wilsonLowerBound(k, n)).toBeLessThanOrEqual(k / n);
    }
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it('a janela descarta série anterior ao corte', () => {
    const rows = [...many(6, { settledAt: 100 }), ...many(6, { settledAt: 5_000 })];
    expect(classifyCommandReliability('r1', rows, { since: 1_000 }).sample).toBe(6);
  });

  it('a frota vem ordenada por urgência e o resumo fecha', () => {
    const rows = [
      ...silent(12).map((r) => ({ ...r, registrationId: 'mudo' })),
      ...many(12).map((r) => ({ ...r, registrationId: 'bom' })),
      ...many(2).map((r) => ({ ...r, registrationId: 'novo' })),
    ];
    const verdicts = classifyFleetReliability(rows);
    expect(verdicts[0].registrationId).toBe('mudo');
    expect(verdicts[0].silentLowerBound).toBeGreaterThanOrEqual(DEAF_THRESHOLD);
    const s = summarizeReliability(verdicts);
    expect(s.total).toBe(3);
    expect(s.deaf).toBe(1);
    expect(s.healthy).toBe(1);
    expect(s.unknown).toBe(1);
    expect(s.actionable).toBe(1);
  });
});
