import { describe, it, expect } from 'vitest';
import {
  planDispatch,
  backoffMs,
  dedupKeyFor,
  renderMessage,
  resolveConfig,
  routineLabel,
  DEFAULT_DISPATCH_CONFIG,
  type MaintenanceAlert,
} from '../../../supabase/functions/_shared/maintenanceDispatchPolicy';

const NOW = Date.parse('2026-07-26T12:00:00.000Z');

const alert = (over: Partial<MaintenanceAlert> = {}): MaintenanceAlert => ({
  id: 'a1',
  routine: 'partition_drain',
  severity: 'critical',
  reason: 'última execução falhou',
  created_at: new Date(NOW - 60_000).toISOString(),
  ...over,
});

const cfg = (over = {}) => ({
  ...DEFAULT_DISPATCH_CONFIG,
  channels: ['telegram' as const],
  ...over,
});

describe('maintenanceDispatchPolicy — Onda 111', () => {
  it('despacha alerta crítico recém-criado', () => {
    const plan = planDispatch([alert()], [], cfg(), NOW);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].attempt).toBe(1);
    expect(plan.items[0].dedupKey).toBe('a1:telegram');
  });

  it('não reenvia alerta já entregue', () => {
    const plan = planDispatch(
      [alert()],
      [{ alert_id: 'a1', channel: 'telegram', status: 'sent', attempts: 1, last_attempt_at: null }],
      cfg(),
      NOW,
    );
    expect(plan.items).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe('already_sent');
  });

  it('respeita o backoff exponencial após falha', () => {
    const recent = { alert_id: 'a1', channel: 'telegram' as const, status: 'failed' as const, attempts: 2, last_attempt_at: new Date(NOW - 60_000).toISOString() };
    expect(planDispatch([alert()], [recent], cfg(), NOW).skipped[0].reason).toBe('backoff_pending');
    const old = { ...recent, last_attempt_at: new Date(NOW - 5 * 3_600_000).toISOString() };
    expect(planDispatch([alert()], [old], cfg(), NOW).items).toHaveLength(1);
  });

  it('desiste após o teto de tentativas', () => {
    const plan = planDispatch(
      [alert()],
      [{ alert_id: 'a1', channel: 'telegram', status: 'failed', attempts: 4, last_attempt_at: new Date(NOW - 10 * 3_600_000).toISOString() }],
      cfg(),
      NOW,
    );
    expect(plan.skipped[0].reason).toBe('max_attempts_reached');
  });

  it('ignora avisos quando a severidade mínima é crítica', () => {
    const plan = planDispatch([alert({ severity: 'warning' })], [], cfg(), NOW);
    expect(plan.skipped[0].reason).toBe('below_min_severity');
  });

  it('descarta alertas expirados e datas inválidas', () => {
    const oldAlert = alert({ created_at: new Date(NOW - 48 * 3_600_000).toISOString() });
    expect(planDispatch([oldAlert], [], cfg(), NOW).skipped[0].reason).toBe('too_old');
    expect(planDispatch([alert({ created_at: 'xx' })], [], cfg(), NOW).items).toHaveLength(0);
  });

  it('prioriza críticos quando o lote satura', () => {
    const alerts = [
      alert({ id: 'w1', severity: 'warning' }),
      alert({ id: 'c1', severity: 'critical' }),
    ];
    const plan = planDispatch(alerts, [], cfg({ minSeverity: 'warning', batchLimit: 1 }), NOW);
    expect(plan.items[0].alert.id).toBe('c1');
    expect(plan.skipped.some((s) => s.reason === 'batch_limit')).toBe(true);
  });

  it('só habilita canais com credencial completa', () => {
    expect(resolveConfig({ TELEGRAM_BOT_TOKEN: 't' }).channels).toEqual([]);
    expect(resolveConfig({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' }).channels).toEqual(['telegram']);
  });

  it('escapa HTML na mensagem e rotula rotinas', () => {
    const msg = renderMessage(alert({ reason: '<b>x</b>' }));
    expect(msg.html).not.toContain('<b>x</b>');
    expect(routineLabel('partition_drain')).toContain('DEFAULT');
    expect(dedupKeyFor(alert(), 'email')).toBe('a1:email');
    expect(backoffMs(3, 15)).toBeGreaterThan(backoffMs(2, 15));
  });
});
