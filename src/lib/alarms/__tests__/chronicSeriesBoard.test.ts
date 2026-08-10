import { describe, expect, it } from 'vitest';
import {
  buildChronicSeriesBoard,
  chronicBoardSummary,
  seriesStateLabel,
  type SeriesSummaryRow,
} from '../chronicSeriesBoard';

const NOW = 1_700_000_000_000;

const row = (over: Partial<SeriesSummaryRow> & { seriesKey: string }): SeriesSummaryRow => ({
  episodesInWindow: 1,
  chatterInWindow: 0,
  totalEpisodes: 1,
  peakSeverity: 'low',
  isOpen: false,
  lastOpenedAt: NOW - 60_000,
  lastClosedAt: NOW - 30_000,
  ...over,
});

describe('buildChronicSeriesBoard', () => {
  it('classifica pela mesma escada da avaliação local', () => {
    const board = buildChronicSeriesBoard(
      [
        row({ seriesKey: 'a', episodesInWindow: 6, totalEpisodes: 6 }),
        row({ seriesKey: 'b', episodesInWindow: 3, totalEpisodes: 3 }),
        row({ seriesKey: 'c', episodesInWindow: 1 }),
      ],
      NOW
    );
    const byKey = Object.fromEntries(board.entries.map((e) => [e.seriesKey, e]));
    expect(byKey.a.klass).toBe('chronic');
    expect(byKey.a.mode).toBe('escalate');
    expect(byKey.b.klass).toBe('recurrent');
    expect(byKey.b.mode).toBe('summarize');
    expect(byKey.c.klass).toBe('isolated');
    expect(byKey.c.mode).toBe('notify');
  });

  it('nunca resume série crítica', () => {
    const board = buildChronicSeriesBoard(
      [row({ seriesKey: 'k', episodesInWindow: 3, totalEpisodes: 3, peakSeverity: 'critical' })],
      NOW
    );
    expect(board.entries[0]?.mode).toBe('notify');
  });

  it('série sem carimbo de abertura fica sem registro, nunca calma', () => {
    const board = buildChronicSeriesBoard(
      [row({ seriesKey: 'k', lastOpenedAt: null, lastClosedAt: null })],
      NOW
    );
    expect(board.entries[0]?.state).toBe('unknown');
    expect(board.entries[0]?.ageMs).toBeNull();
    expect(board.unknownCount).toBe(1);
  });

  it('relógio adiantado não produz idade negativa', () => {
    const board = buildChronicSeriesBoard(
      [row({ seriesKey: 'k', lastOpenedAt: NOW + 90_000, isOpen: true })],
      NOW
    );
    expect(board.entries[0]?.ageMs).toBe(0);
    expect(board.entries[0]?.clockAhead).toBe(true);
  });

  it('aberto vem antes de fechado com a mesma pontuação', () => {
    const board = buildChronicSeriesBoard(
      [
        row({ seriesKey: 'fechado', isOpen: false }),
        row({ seriesKey: 'aberto', isOpen: true, lastClosedAt: null }),
      ],
      NOW
    );
    expect(board.entries.map((e) => e.seriesKey)).toEqual(['aberto', 'fechado']);
  });

  it('ordena por gravidade da série antes do estado', () => {
    const board = buildChronicSeriesBoard(
      [
        row({ seriesKey: 'aberta-trivial', isOpen: true, lastClosedAt: null }),
        row({ seriesKey: 'cronica-calma', episodesInWindow: 8, totalEpisodes: 8 }),
      ],
      NOW
    );
    expect(board.entries[0]?.seriesKey).toBe('cronica-calma');
  });

  it('descarta linhas inválidas com motivo contado', () => {
    const board = buildChronicSeriesBoard(
      [
        row({ seriesKey: '   ' }),
        row({ seriesKey: 'dup' }),
        row({ seriesKey: 'dup' }),
        row({ seriesKey: 'x', chatterInWindow: 9, episodesInWindow: 2 }),
        row({ seriesKey: 'y', totalEpisodes: 0, episodesInWindow: 3 }),
        null as unknown as SeriesSummaryRow,
      ],
      NOW
    );
    expect(board.discarded.empty_key).toBe(1);
    expect(board.discarded.duplicate_key).toBe(1);
    expect(board.discarded.invalid_counts).toBe(2);
    expect(board.discarded.invalid_row).toBe(1);
    expect(board.totalSeries).toBe(1);
  });

  it('declara o corte em vez de encolher em silêncio', () => {
    const rows = Array.from({ length: 40 }, (_, i) =>
      row({ seriesKey: `s${String(i).padStart(2, '0')}` })
    );
    const board = buildChronicSeriesBoard(rows, NOW, { limit: 10 });
    expect(board.entries).toHaveLength(10);
    expect(board.truncated).toBe(30);
    expect(board.totalSeries).toBe(40);
  });

  it('agravar uma série nunca reduz sua pontuação', () => {
    const base = buildChronicSeriesBoard([row({ seriesKey: 'k' })], NOW).entries[0];
    const worse = buildChronicSeriesBoard(
      [row({ seriesKey: 'k', episodesInWindow: 7, chatterInWindow: 5, totalEpisodes: 7 })],
      NOW
    ).entries[0];
    expect(worse.score).toBeGreaterThan(base.score);
  });

  it('relógio inválido derruba para desconhecido em vez de inventar calmaria', () => {
    const board = buildChronicSeriesBoard([row({ seriesKey: 'k' })], Number.NaN);
    expect(board.entries[0]?.state).toBe('unknown');
    expect(board.entries[0]?.ageMs).toBeNull();
  });

  it('resumo textual não afirma o que não sabe', () => {
    expect(chronicBoardSummary(buildChronicSeriesBoard([], NOW))).toContain('Nenhuma série');
    const board = buildChronicSeriesBoard(
      [row({ seriesKey: 'k', episodesInWindow: 9, totalEpisodes: 9 })],
      NOW
    );
    expect(chronicBoardSummary(board)).toContain('crônica');
  });

  it('rotula todos os estados', () => {
    expect(seriesStateLabel('open')).toBe('Em curso');
    expect(seriesStateLabel('settling')).toBe('Acalmando');
    expect(seriesStateLabel('quiet')).toBe('Calmo');
    expect(seriesStateLabel('unknown')).toBe('Sem registro');
  });
});
