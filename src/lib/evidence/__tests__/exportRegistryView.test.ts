import { describe, expect, it } from 'vitest';
import {
  ROOT_HASH_PREFIX_LENGTH,
  outcomeFromFailure,
  outcomeFromVerify,
  sortForReview,
  summarize,
  toExportView,
  type EvidenceExportRow,
} from '../exportRegistryView';

const row = (over: Partial<EvidenceExportRow> = {}): EvidenceExportRow => ({
  id: over.id ?? 'row-1',
  export_id: over.export_id ?? 'exp-1',
  camera_id: over.camera_id ?? 'cam-1',
  root_hash: over.root_hash ?? 'a'.repeat(64),
  verdict: over.verdict ?? 'admissible',
  coverage_ratio: over.coverage_ratio ?? 1,
  segment_count: over.segment_count ?? 3,
  gap_count: over.gap_count ?? 0,
  sealed_at: over.sealed_at ?? '2026-07-27T10:00:00.000Z',
});

describe('exportRegistryView — os dois eixos nunca se fundem (C1)', () => {
  it('material comprometido pode estar com a corrente íntegra', () => {
    const view = toExportView(row({ verdict: 'broken' }), outcomeFromVerify(
      { export_id: 'exp-1', intact: true, first_broken_index: null, root_matches: true },
      1,
    ));
    expect(view.verdict.level).toBe('broken');
    expect(view.integrity.state).toBe('intact');
    expect(view.actionable).toBe(false);
  });

  it('material admissível pode estar adulterado', () => {
    const view = toExportView(row(), outcomeFromVerify(
      { export_id: 'exp-1', intact: false, first_broken_index: 2, root_matches: false },
      1,
    ));
    expect(view.verdict.level).toBe('admissible');
    expect(view.integrity.state).toBe('tampered');
    expect(view.integrity.detail).toContain('segmento 3');
    expect(view.actionable).toBe(true);
  });
});

describe('exportRegistryView — presunções proibidas', () => {
  it('C2: o estado inicial nunca é íntegro', () => {
    expect(toExportView(row()).integrity.state).toBe('unverified');
  });

  it('C3: falha de transporte é indeterminada, jamais adulteração', () => {
    const outcome = outcomeFromFailure(null, 'HTTP 500', 1);
    expect(toExportView(row(), outcome).integrity.state).toBe('indeterminate');
  });

  it('C3: perda de permissão no meio da sessão não acusa a prova', () => {
    const outcome = outcomeFromFailure('missing_capability', 'sem permissão', 1);
    expect(toExportView(row(), outcome).integrity.state).toBe('indeterminate');
  });

  it('C4: 404 na conferência tem estado próprio', () => {
    const outcome = outcomeFromFailure('export_not_found', 'sumiu', 1);
    expect(toExportView(row(), outcome).integrity.state).toBe('missing');
  });

  it('resposta contraditória do servidor é tratada como quebra', () => {
    const outcome = outcomeFromVerify(
      { export_id: 'e', intact: true, first_broken_index: null, root_matches: false },
      1,
    );
    expect(outcome.status).toBe('broken');
  });

  it('veredito desconhecido cai para o pior caso', () => {
    const view = toExportView(row({ verdict: 'sei_la' }));
    expect(view.verdict.level).toBe('unknown');
    expect(view.verdict.tone).toBe('critical');
  });
});

describe('exportRegistryView — ordenação e resumo (C5)', () => {
  it('integridade sempre domina a qualidade na severidade', () => {
    const tampered = toExportView(
      row({ id: 'a', export_id: 'a', verdict: 'admissible' }),
      outcomeFromVerify({ export_id: 'a', intact: false, first_broken_index: 0, root_matches: false }, 1),
    );
    const brokenButIntact = toExportView(
      row({ id: 'b', export_id: 'b', verdict: 'broken' }),
      outcomeFromVerify({ export_id: 'b', intact: true, first_broken_index: null, root_matches: true }, 1),
    );
    expect(tampered.severityRank).toBeGreaterThan(brokenButIntact.severityRank);
  });

  it('o adulterado sobe ao topo mesmo sendo o mais antigo', () => {
    const recent = toExportView(row({ id: 'r', export_id: 'r', sealed_at: '2026-07-27T23:00:00Z' }));
    const oldTampered = toExportView(
      row({ id: 'o', export_id: 'o', sealed_at: '2020-01-01T00:00:00Z' }),
      outcomeFromVerify({ export_id: 'o', intact: false, first_broken_index: 1, root_matches: false }, 1),
    );
    expect(sortForReview([recent, oldTampered])[0].exportId).toBe('o');
  });

  it('o título anuncia o pior estado presente', () => {
    const s = summarize([
      toExportView(row({ id: '1', export_id: '1' })),
      toExportView(row({ id: '2', export_id: '2' }), outcomeFromFailure(null, 'x', 1)),
      toExportView(
        row({ id: '3', export_id: '3' }),
        outcomeFromVerify({ export_id: '3', intact: false, first_broken_index: 0, root_matches: false }, 1),
      ),
    ]);
    expect(s.headline).toBe('tampered');
    expect(s.tampered).toBe(1);
    expect(s.indeterminate).toBe(1);
    expect(s.unverified).toBe(1);
  });

  it('registro vazio não é declarado íntegro', () => {
    const s = summarize([]);
    expect(s.headline).toBe('unverified');
    expect(s.headlineTone).toBe('neutral');
  });
});

describe('exportRegistryView — apresentação defensiva', () => {
  it('cobertura fora de faixa e data inválida não quebram a linha', () => {
    const view = toExportView(row({ coverage_ratio: 42, sealed_at: 'não é data' }));
    expect(view.coveragePercent).toBe(100);
    expect(view.sealedAtMs).toBeNull();
    expect(view.rootHashShort).toHaveLength(ROOT_HASH_PREFIX_LENGTH);
  });

  it('cobertura negativa vira zero', () => {
    expect(toExportView(row({ coverage_ratio: -1 })).coveragePercent).toBe(0);
  });
});
