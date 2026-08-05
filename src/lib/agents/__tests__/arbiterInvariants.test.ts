import { describe, expect, it } from 'vitest';
import {
  ARBITER_INVARIANT_KEYS,
  buildInvariantRows,
  summarizeInvariants,
} from '@/lib/agents/arbiterInvariants';

describe('arbiterInvariants', () => {
  it('mantém as quatro invariantes na ordem canônica', () => {
    expect(ARBITER_INVARIANT_KEYS).toHaveLength(4);
  });

  it('trata invariante ausente como falha explícita', () => {
    const rows = buildInvariantRows([]);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => !r.ok)).toBe(true);
    expect(rows[0].detail).toMatch(/não avaliada/);
  });

  it('ignora chave desconhecida vinda do banco', () => {
    const rows = buildInvariantRows([
      { key: 'observe_action_allowed', ok: true, detail: 'CHECK (...)' },
    ]);
    expect(rows.find((r) => r.key === 'observe_action_allowed')?.ok).toBe(true);
    expect(summarizeInvariants(rows).failing).toBe(3);
  });

  it('resume como saudável apenas quando todas passam', () => {
    const rows = buildInvariantRows(
      ARBITER_INVARIANT_KEYS.map((key) => ({ key, ok: true, detail: 'ok' }))
    );
    expect(summarizeInvariants(rows)).toEqual({ total: 4, failing: 0, healthy: true });
    expect(summarizeInvariants([])).toEqual({ total: 0, failing: 0, healthy: false });
  });
});
