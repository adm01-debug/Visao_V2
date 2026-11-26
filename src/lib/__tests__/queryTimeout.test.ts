import { describe, it, expect, vi, afterEach } from 'vitest';
import { QUERY_TIMEOUT_MS, querySignal } from '../queryTimeout';

describe('querySignal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborta depois do teto para o fetch nao ficar pendurado', async () => {
    vi.useFakeTimers();
    const signal = querySignal();

    expect(signal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(QUERY_TIMEOUT_MS - 1);
    expect(signal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(2);
    expect(signal.aborted).toBe(true);
  });

  it('nao reutiliza o mesmo signal entre chamadas', () => {
    expect(querySignal()).not.toBe(querySignal());
  });
});
