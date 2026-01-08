import { describe, it, expect, vi } from 'vitest';
import { retry } from '../retry';

describe('retry', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure', async () => {
    let count = 0;
    const result = await retry(async () => {
      count++;
      if (count < 2) throw new Error('fail');
      return 'success';
    }, { maxAttempts: 3, delayMs: 10 });
    
    expect(result).toBe('success');
    expect(count).toBe(2);
  });

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    
    await expect(retry(fn, { maxAttempts: 2, delayMs: 10 }))
      .rejects.toThrow('always fails');
    
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses default options', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await retry(fn);
    expect(fn).toHaveBeenCalled();
  });

  it('supports backoff disabled', async () => {
    let count = 0;
    await retry(async () => {
      count++;
      if (count < 2) throw new Error();
      return 'done';
    }, { maxAttempts: 3, delayMs: 5, backoff: false });
    
    expect(count).toBe(2);
  });
});
