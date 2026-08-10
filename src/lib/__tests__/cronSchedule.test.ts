import { describe, it, expect } from 'vitest';
import { parseCronSchedule, assessCronFreshness } from '@/lib/cronSchedule';

const NOW = new Date('2026-07-16T10:00:00Z');

describe('parseCronSchedule', () => {
  it('every minute', () => {
    const r = parseCronSchedule('* * * * *', NOW);
    expect(r?.nextRun.toISOString()).toBe('2026-07-16T10:01:00.000Z');
    expect(r?.freshnessMs).toBe(120_000);
  });
  it('hourly at :15', () => {
    const r = parseCronSchedule('15 * * * *', NOW);
    expect(r?.nextRun.toISOString()).toBe('2026-07-16T10:15:00.000Z');
  });
  it('hourly rollover', () => {
    const r = parseCronSchedule('15 * * * *', new Date('2026-07-16T10:20:00Z'));
    expect(r?.nextRun.toISOString()).toBe('2026-07-16T11:15:00.000Z');
  });
  it('daily at 03:30 UTC (future today)', () => {
    const r = parseCronSchedule('30 3 * * *', new Date('2026-07-16T01:00:00Z'));
    expect(r?.nextRun.toISOString()).toBe('2026-07-16T03:30:00.000Z');
  });
  it('daily at 03:30 UTC (already past → tomorrow)', () => {
    const r = parseCronSchedule('30 3 * * *', NOW);
    expect(r?.nextRun.toISOString()).toBe('2026-07-17T03:30:00.000Z');
  });
  it('monthly day 1 at 02:00 UTC', () => {
    const r = parseCronSchedule('0 2 1 * *', NOW);
    expect(r?.nextRun.toISOString()).toBe('2026-08-01T02:00:00.000Z');
  });
  it('rejects unsupported patterns', () => {
    expect(parseCronSchedule('* * * 1 *', NOW)).toBeNull();
    expect(parseCronSchedule('* * * * 0', NOW)).toBeNull();
    expect(parseCronSchedule('* * *', NOW)).toBeNull();
    expect(parseCronSchedule('*/5 * * * *', NOW)).toBeNull();
  });
});

describe('assessCronFreshness', () => {
  it('never ran', () => {
    expect(assessCronFreshness('30 3 * * *', null, NOW).status).toBe('never');
  });
  it('on_time (within 2× interval)', () => {
    // daily job, last ran 25h ago → freshness threshold 48h → on_time
    const lastRun = new Date(NOW.getTime() - 25 * 60 * 60_000).toISOString();
    expect(assessCronFreshness('30 3 * * *', lastRun, NOW).status).toBe('on_time');
  });
  it('stale (exceeded 2× interval)', () => {
    // daily job, last ran 72h ago → threshold 48h → stale
    const lastRun = new Date(NOW.getTime() - 72 * 60 * 60_000).toISOString();
    expect(assessCronFreshness('30 3 * * *', lastRun, NOW).status).toBe('stale');
  });
  it('nextRunLabel = "—" for unparseable', () => {
    expect(assessCronFreshness('bogus', null, NOW).nextRunLabel).toBe('—');
  });
});
