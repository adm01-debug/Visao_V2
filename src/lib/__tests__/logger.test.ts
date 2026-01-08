import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('has log methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('calls console.log on info', () => {
    logger.info('test message');
    expect(console.log).toHaveBeenCalled();
  });

  it('calls console.log on error', () => {
    logger.error('error message');
    expect(console.log).toHaveBeenCalled();
  });

  it('accepts optional data parameter', () => {
    logger.info('message', { key: 'value' });
    expect(console.log).toHaveBeenCalled();
  });
});
