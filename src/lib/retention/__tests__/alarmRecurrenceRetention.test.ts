import { describe, expect, it } from 'vitest';

import {
  ABANDONED_OPEN_DAYS,
  CLOSED_RETENTION_DAYS,
  classifyPurgeOutcome,
  describePurgeOutcome,
  isAbandonedOpen,
  isPurgeable,
} from '../alarmRecurrenceRetention';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

const run = (over: Partial<Parameters<typeof classifyPurgeOutcome>[0]> = {}) => ({
  deletedEpisodes: 0,
  pendingEpisodes: 0,
  abandonedOpen: 0,
  truncated: false,
  ...over,
});

describe('retenção dos episódios de reincidência', () => {
  it('guarda o episódio ainda aberto por mais antigo que seja', () => {
    expect(isPurgeable({ closedAt: null }, NOW)).toBe(false);
    expect(isAbandonedOpen({ openedAt: NOW - 5000 * DAY, closedAt: null }, NOW)).toBe(true);
  });

  it('conta o prazo pelo fechamento, não pela abertura', () => {
    const longo = { openedAt: NOW - 900 * DAY, closedAt: NOW - DAY };
    expect(isPurgeable(longo, NOW)).toBe(false);
  });

  it('trata a fronteira do prazo como exclusiva', () => {
    const limite = NOW - CLOSED_RETENTION_DAYS * DAY;
    expect(isPurgeable({ closedAt: limite }, NOW)).toBe(false);
    expect(isPurgeable({ closedAt: limite - 1 }, NOW)).toBe(true);
  });

  it('preserva quando o carimbo é ilegível ou está no futuro', () => {
    expect(isPurgeable({ closedAt: Number.NaN }, NOW)).toBe(false);
    expect(isPurgeable({ closedAt: NOW + 100 * DAY }, NOW)).toBe(false);
    expect(isAbandonedOpen({ openedAt: Number.NaN, closedAt: null }, NOW)).toBe(false);
  });

  it('só marca abandono depois do prazo declarado', () => {
    const limite = NOW - ABANDONED_OPEN_DAYS * DAY;
    expect(isAbandonedOpen({ openedAt: limite, closedAt: null }, NOW)).toBe(false);
    expect(isAbandonedOpen({ openedAt: limite - 1, closedAt: null }, NOW)).toBe(true);
  });

  it('dá precedência ao resto pendente sobre o abandono', () => {
    expect(classifyPurgeOutcome(run({ pendingEpisodes: 3, abandonedOpen: 9 }))).toBe('truncated');
    expect(classifyPurgeOutcome(run({ truncated: true }))).toBe('truncated');
    expect(classifyPurgeOutcome(run({ abandonedOpen: 2 }))).toBe('abandoned_backlog');
    expect(classifyPurgeOutcome(run({ deletedEpisodes: 4 }))).toBe('clean');
  });

  it('descreve a execução em português com os números da rodada', () => {
    const texto = describePurgeOutcome(run({ deletedEpisodes: 4, abandonedOpen: 2 }));
    expect(texto).toContain('4 episódio(s) expurgado(s)');
    expect(texto).toContain('2 episódio(s) seguem abertos');
  });
});
