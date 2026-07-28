import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECURRENCE_CONFIG,
  assessRecurrence,
  closeEpisode,
  emptyRecurrenceLedger,
  noticeModeLabel,
  openEpisode,
  recurrenceClassLabel,
  recurrenceSummaryText,
  resolveRecurrenceConfig,
} from '../alarmRecurrence';

const run = (events: Array<{ open: number; close?: number; severity?: 'low' | 'critical' }>) => {
  let ledger = emptyRecurrenceLedger('r1:a');
  for (const e of events) {
    ledger = openEpisode(ledger, { at: e.open, severity: e.severity ?? 'medium' }).ledger;
    if (typeof e.close === 'number') ledger = closeEpisode(ledger, { at: e.close }).ledger;
  }
  return ledger;
};

describe('alarmRecurrence', () => {
  it('não reincide com ocorrência isolada', () => {
    const a = assessRecurrence(run([{ open: 0, close: 120_000 }]), 200_000);
    expect(a.klass).toBe('isolated');
    expect(a.mode).toBe('notify');
  });

  it('agrupa série reincidente não crítica', () => {
    const a = assessRecurrence(
      run([
        { open: 0, close: 120_000 },
        { open: 200_000, close: 320_000 },
        { open: 400_000, close: 520_000 },
      ]),
      600_000,
    );
    expect(a.klass).toBe('recurrent');
    expect(a.mode).toBe('summarize');
    expect(a.collapsedCount).toBe(2);
  });

  it('nunca resume alarme crítico', () => {
    const a = assessRecurrence(
      run([
        { open: 0, close: 120_000, severity: 'critical' },
        { open: 200_000, close: 320_000 },
        { open: 400_000, close: 520_000 },
      ]),
      600_000,
    );
    expect(a.peakSeverity).toBe('critical');
    expect(a.mode).not.toBe('summarize');
  });

  it('escala série crônica', () => {
    const events = Array.from({ length: DEFAULT_RECURRENCE_CONFIG.chronicThreshold }, (_, i) => ({
      open: i * 200_000,
      close: i * 200_000 + 120_000,
    }));
    const a = assessRecurrence(run(events), events.length * 200_000);
    expect(a.klass).toBe('chronic');
    expect(a.mode).toBe('escalate');
  });

  it('episódio aberto não conta como oscilação', () => {
    const ledger = openEpisode(emptyRecurrenceLedger('k'), { at: 0, severity: 'high' }).ledger;
    const a = assessRecurrence(ledger, 1_000);
    expect(a.chatterInWindow).toBe(0);
    expect(a.open).toBe(true);
    expect(ledger.episodes[0].durationMs).toBeNull();
  });

  it('detecta oscilação por episódios muito curtos', () => {
    const events = Array.from({ length: DEFAULT_RECURRENCE_CONFIG.chatterThreshold }, (_, i) => ({
      open: i * 2_000,
      close: i * 2_000 + 1_000,
    }));
    const a = assessRecurrence(run(events), 20_000);
    expect(a.flapping).toBe(true);
    expect(recurrenceSummaryText(a)).toContain('oscilação');
  });

  it('recusa registros retroativos e duração negativa', () => {
    let ledger = run([{ open: 100_000, close: 200_000 }]);
    expect(openEpisode(ledger, { at: 150_000, severity: 'low' }).ignored).toBe('stale_record');
    ledger = openEpisode(ledger, { at: 300_000, severity: 'low' }).ledger;
    expect(closeEpisode(ledger, { at: 250_000 }).ignored).toBe('stale_record');
  });

  it('esquece pela janela mas preserva o acumulado', () => {
    const ledger = run([
      { open: 0, close: 120_000 },
      { open: 200_000, close: 320_000 },
      { open: 400_000, close: 520_000 },
    ]);
    const a = assessRecurrence(ledger, 520_000 + DEFAULT_RECURRENCE_CONFIG.windowMs * 5);
    expect(a.episodesInWindow).toBe(0);
    expect(ledger.totalEpisodes).toBe(3);
  });

  it('mantém a escada de limiares mesmo com configuração inválida', () => {
    const cfg = resolveRecurrenceConfig({ recurrentThreshold: 5, chronicThreshold: 2 });
    expect(cfg.chronicThreshold).toBeGreaterThan(cfg.recurrentThreshold);
  });

  it('expõe rótulos em português', () => {
    expect(recurrenceClassLabel('chronic')).toBe('Crônico');
    expect(noticeModeLabel('summarize')).toContain('Agrupar');
  });
});
