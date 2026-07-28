import { describe, expect, it } from 'vitest';

import {
  ABANDONED_OPEN_DAYS,
  MAX_RECONCILE_PER_RUN,
  RECONCILE_OFFSET_MS,
  planEpisodeReconciliation,
  type OpenEpisode,
} from '../episodeReconciliation';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

const ep = (id: string, daysAgo: number): OpenEpisode => ({
  id,
  seriesKey: `serie:${id}`,
  openedAt: NOW - daysAgo * DAY,
});

describe('planEpisodeReconciliation', () => {
  it('fecha no corte declarado, nunca no instante da execução', () => {
    const plan = planEpisodeReconciliation([ep('a', 400)], NOW);
    expect(plan.closes).toHaveLength(1);
    expect(plan.closes[0].closedAt).toBe(NOW - 400 * DAY + RECONCILE_OFFSET_MS);
    expect(plan.closes[0].closedAt).toBeLessThan(NOW);
    expect(plan.closes[0].durationMs).toBe(RECONCILE_OFFSET_MS);
  });

  it('não toca em episódio ainda dentro do prazo — é alarme em curso', () => {
    const plan = planEpisodeReconciliation([ep('novo', ABANDONED_OPEN_DAYS - 1)], NOW);
    expect(plan.closes).toHaveLength(0);
    expect(plan.skipped).toEqual([{ id: 'novo', reason: 'still_active' }]);
  });

  it('pula abertura no futuro em vez de "corrigir" o relógio', () => {
    const plan = planEpisodeReconciliation(
      [{ id: 'f', seriesKey: 's', openedAt: NOW + DAY }],
      NOW,
    );
    expect(plan.closes).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe('unreadable_clock');
  });

  it('drena do mais antigo para o mais novo e adia o excedente', () => {
    const plan = planEpisodeReconciliation(
      [ep('c', 40), ep('a', 400), ep('b', 100)],
      NOW,
      2,
    );
    expect(plan.closes.map((c) => c.id)).toEqual(['a', 'b']);
    expect(plan.deferred).toBe(1);
    expect(plan.skipped).toContainEqual({ id: 'c', reason: 'over_batch_limit' });
  });

  it('nunca aceita lote acima do teto absoluto', () => {
    const many = Array.from({ length: MAX_RECONCILE_PER_RUN + 10 }, (_, i) => ep(`e${i}`, 100));
    const plan = planEpisodeReconciliation(many, NOW, 10_000);
    expect(plan.closes).toHaveLength(MAX_RECONCILE_PER_RUN);
    expect(plan.deferred).toBe(10);
  });

  it('relógio de referência ilegível aborta sem fechar nada', () => {
    const plan = planEpisodeReconciliation([ep('a', 400)], Number.NaN);
    expect(plan.closes).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe('unreadable_clock');
    expect(plan.summary).toMatch(/ilegível/);
  });

  it('é idempotente sobre o próprio resultado: nada elegível na segunda passada', () => {
    const plan = planEpisodeReconciliation([ep('a', 400)], NOW);
    const restantes = plan.skipped.filter((s) => s.reason !== 'unreadable_clock');
    expect(restantes).toHaveLength(0);
    expect(planEpisodeReconciliation([], NOW).closes).toHaveLength(0);
  });
});
