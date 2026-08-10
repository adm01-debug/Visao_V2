import { describe, it, expect } from 'vitest';
import {
  CUSTODY_GENESIS,
  assessCustody,
  buildCustodyChain,
  buildManifest,
  canonicalize,
  describeReason,
  describeVerdict,
  parseUtc,
  verifyManifest,
  type EvidenceSegment,
  type ExportRequest,
} from '../custodyManifest';

const BASE = Date.parse('2026-07-27T10:00:00.000Z');

function segment(i: number, overrides: Partial<EvidenceSegment> = {}): EvidenceSegment {
  const start = BASE + i * 60_000;
  return {
    index: i,
    storagePath: `evidence/cam-1/seg-${i}.mp4`,
    byteSize: 1_048_576 + i,
    sha256: String(i).padStart(64, 'a'),
    deviceStartUtc: new Date(start).toISOString(),
    deviceEndUtc: new Date(start + 60_000).toISOString(),
    receivedAtUtc: new Date(start + 61_000).toISOString(),
    clockOffsetMs: 0,
    ...overrides,
  };
}

function request(overrides: Partial<ExportRequest> = {}): ExportRequest {
  const segments = overrides.segments ?? [segment(0), segment(1), segment(2)];
  const spanMs = segments.length * 60_000;
  return {
    exportId: 'exp-156',
    cameraId: 'cam-1',
    requestedBy: 'user-abc',
    requestedFromUtc: new Date(BASE).toISOString(),
    requestedToUtc: new Date(BASE + spanMs).toISOString(),
    segments,
    transformations: [],
    pixelsAltered: false,
    generatedAtUtc: '2026-07-27T11:00:00.000Z',
    systemVersion: 'visao@156',
    ...overrides,
  };
}

describe('canonicalize (C7)', () => {
  it('é indiferente à ordem das chaves', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('colapsa -0 em 0 — é o mesmo fato', () => {
    expect(canonicalize({ x: -0 })).toBe(canonicalize({ x: 0 }));
  });

  it('recusa selar valores ambíguos', () => {
    expect(() => canonicalize({ x: NaN })).toThrow();
    expect(() => canonicalize({ x: Infinity })).toThrow();
    expect(() => canonicalize(undefined)).toThrow();
  });

  it('distingue string de número com o mesmo texto', () => {
    expect(canonicalize({ x: '1' })).not.toBe(canonicalize({ x: 1 }));
  });
});

describe('parseUtc', () => {
  it('nunca devolve NaN', () => {
    expect(parseUtc('não é data')).toBeNull();
    expect(parseUtc('')).toBeNull();
    expect(parseUtc('2026-07-27T10:00:00Z')).toBe(BASE);
  });
});

describe('assessCustody — o que destrói a prova', () => {
  it('aceita uma exportação contínua e íntegra', () => {
    const a = assessCustody(request());
    expect(a.level).toBe('admissible');
    expect(a.reasons).toEqual([]);
    expect(a.coverageRatio).toBe(1);
  });

  it('rebaixa (não destrói) quando há lacuna — lacuna é fato (C1)', () => {
    const s2 = segment(2, {
      deviceStartUtc: new Date(BASE + 120_000 + 30_000).toISOString(),
      deviceEndUtc: new Date(BASE + 180_000 + 30_000).toISOString(),
    });
    const a = assessCustody(request({ segments: [segment(0), segment(1), s2] }));
    expect(a.level).toBe('weakened');
    expect(a.gaps).toEqual([{ afterIndex: 1, gapMs: 30_000 }]);
    expect(a.reasons.some((r) => r.code === 'timeline_gap')).toBe(true);
  });

  it('ignora descontinuidade dentro da tolerância do container', () => {
    const s1 = segment(1, {
      deviceStartUtc: new Date(BASE + 60_000 + 400).toISOString(),
      deviceEndUtc: new Date(BASE + 120_000 + 400).toISOString(),
    });
    const a = assessCustody(request({ segments: [segment(0), s1] }));
    expect(a.reasons.some((r) => r.code === 'timeline_gap')).toBe(false);
  });

  it('registra desvio de relógio sem corrigir carimbo (C2)', () => {
    const skewed = segment(1, { clockOffsetMs: 40_000 });
    const req = request({ segments: [segment(0), skewed] });
    const a = assessCustody(req);
    expect(a.level).toBe('weakened');
    expect(a.reasons.some((r) => r.code === 'clock_skew')).toBe(true);
    // O carimbo permanece exatamente como o equipamento reportou.
    expect(req.segments[1]?.deviceStartUtc).toBe(skewed.deviceStartUtc);
  });

  it('destrói a prova quando os bytes mudaram sem declaração (C4)', () => {
    const a = assessCustody(request({ pixelsAltered: true }));
    expect(a.level).toBe('broken');
    expect(a.reasons.some((r) => r.code === 'undeclared_transformation')).toBe(true);
  });

  it('aceita alteração declarada com ferramenta identificada', () => {
    const a = assessCustody(
      request({
        pixelsAltered: true,
        transformations: [
          { kind: 'watermark', detail: 'selo VISÃO no canto inferior', tool: 'ffmpeg@6.1' },
        ],
      })
    );
    expect(a.level).toBe('admissible');
  });

  it('destrói quando o produtor se contradiz sobre a alteração', () => {
    const a = assessCustody(
      request({
        pixelsAltered: false,
        transformations: [{ kind: 'redaction', detail: 'tarja', tool: 'ffmpeg@6.1' }],
      })
    );
    expect(a.level).toBe('broken');
    expect(a.reasons.some((r) => r.code === 'declared_without_alteration')).toBe(true);
  });

  it('não considera "trim" alteração de pixel', () => {
    const a = assessCustody(
      request({
        pixelsAltered: false,
        transformations: [{ kind: 'trim', detail: 'recorte temporal', tool: 'ffmpeg@6.1' }],
      })
    );
    expect(a.level).toBe('admissible');
  });

  it('recusa segmento sem impressão digital (C5)', () => {
    const a = assessCustody(request({ segments: [segment(0), segment(1, { sha256: '' })] }));
    expect(a.level).toBe('broken');
    expect(a.reasons.some((r) => r.code === 'unhashed_segment')).toBe(true);
  });

  it('recusa hash fora do formato SHA-256', () => {
    const a = assessCustody(request({ segments: [segment(0, { sha256: 'ABC123' })] }));
    expect(a.reasons.some((r) => r.code === 'invalid_hash_format')).toBe(true);
    expect(a.level).toBe('broken');
  });

  it('recusa exportação anônima (C6)', () => {
    const a = assessCustody(request({ requestedBy: '   ' }));
    expect(a.level).toBe('broken');
    expect(a.reasons.some((r) => r.code === 'unattributed_export')).toBe(true);
  });

  it('recusa exportação vazia', () => {
    const a = assessCustody(request({ segments: [] }));
    expect(a.level).toBe('broken');
    expect(a.reasons.some((r) => r.code === 'empty_export')).toBe(true);
  });

  it('acusa trecho invertido', () => {
    const bad = segment(0, {
      deviceStartUtc: new Date(BASE + 60_000).toISOString(),
      deviceEndUtc: new Date(BASE).toISOString(),
    });
    const a = assessCustody(request({ segments: [bad] }));
    expect(a.reasons.some((r) => r.code === 'inverted_segment')).toBe(true);
    expect(a.level).toBe('broken');
  });

  it('acusa cobertura parcial do intervalo pedido', () => {
    const a = assessCustody(
      request({
        segments: [segment(0)],
        requestedFromUtc: new Date(BASE).toISOString(),
        requestedToUtc: new Date(BASE + 600_000).toISOString(),
      })
    );
    expect(a.reasons.some((r) => r.code === 'partial_coverage')).toBe(true);
    expect(a.coverageRatio).toBeCloseTo(0.1, 5);
  });

  it('acusa trecho duplicado pelo conteúdo, não pelo caminho', () => {
    const clone = segment(1, {
      storagePath: 'evidence/cam-1/outro-nome.mp4',
      sha256: segment(0).sha256,
    });
    const a = assessCustody(request({ segments: [segment(0), clone] }));
    expect(a.reasons.some((r) => r.code === 'duplicate_segment')).toBe(true);
  });
});

describe('corrente e selo', () => {
  it('primeiro elo parte da semente pública', async () => {
    const chain = await buildCustodyChain([segment(0)]);
    expect(chain).toHaveLength(1);
    expect(chain[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(chain[0]).not.toBe(CUSTODY_GENESIS);
  });

  it('manifesto recém-selado se verifica', async () => {
    const manifest = await buildManifest(request());
    const v = await verifyManifest(manifest);
    expect(v).toEqual({ intact: true, firstBrokenIndex: null, rootMatches: true });
  });

  it('adulterar o segmento k quebra exatamente em k (C3)', async () => {
    const manifest = await buildManifest(request());
    const tampered = {
      ...manifest,
      segments: manifest.segments.map((s, i) =>
        i === 1 ? { ...s, sha256: String(9).padStart(64, 'f') } : s
      ),
    };
    const v = await verifyManifest(tampered);
    expect(v.intact).toBe(false);
    expect(v.firstBrokenIndex).toBe(1);
  });

  it('remover um segmento no meio não passa despercebido', async () => {
    const manifest = await buildManifest(request());
    const cut = { ...manifest, segments: [manifest.segments[0]!, manifest.segments[2]!] };
    const v = await verifyManifest(cut);
    expect(v.intact).toBe(false);
    expect(v.firstBrokenIndex).toBe(1);
  });

  it('anexar um segmento ao final também quebra', async () => {
    const manifest = await buildManifest(request());
    const grown = { ...manifest, segments: [...manifest.segments, segment(3)] };
    const v = await verifyManifest(grown);
    expect(v.intact).toBe(false);
    expect(v.firstBrokenIndex).toBe(3);
  });

  it('editar o autor mantém a corrente mas invalida o selo', async () => {
    const manifest = await buildManifest(request());
    const v = await verifyManifest({ ...manifest, requestedBy: 'outro-usuario' });
    // A corrente cobre segmentos; o selo cobre o manifesto inteiro. Trocar o
    // autor precisa ser detectado — senão a cadeia de custódia é reatribuível.
    expect(v.firstBrokenIndex).toBeNull();
    expect(v.rootMatches).toBe(false);
    expect(v.intact).toBe(false);
  });

  it('reordenar dois segmentos idênticos em conteúdo ainda muda a corrente', async () => {
    const a = await buildCustodyChain([segment(0), segment(1)]);
    const b = await buildCustodyChain([segment(1), segment(0)]);
    expect(a[a.length - 1]).not.toBe(b[b.length - 1]);
  });

  it('o mesmo material produz sempre o mesmo selo', async () => {
    const m1 = await buildManifest(request());
    const m2 = await buildManifest(request());
    expect(m1.rootHash).toBe(m2.rootHash);
  });
});

describe('apresentação', () => {
  it('todo código de motivo tem rótulo em português', () => {
    const codes = [
      'empty_export',
      'unattributed_export',
      'unhashed_segment',
      'invalid_hash_format',
      'invalid_timestamp',
      'inverted_segment',
      'undeclared_transformation',
      'declared_without_alteration',
      'zero_byte_segment',
      'timeline_gap',
      'timeline_overlap',
      'non_monotonic_order',
      'clock_skew',
      'partial_coverage',
      'duplicate_segment',
    ] as const;
    for (const c of codes) expect(describeReason(c).length).toBeGreaterThan(3);
    expect(describeVerdict('broken')).toBe('Sem valor probatório');
  });
});
