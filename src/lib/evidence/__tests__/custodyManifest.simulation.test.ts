/**
 * Onda 156 — SIMULAÇÃO EXAUSTIVA DA CADEIA DE CUSTÓDIA.
 *
 * Testes de exemplo provam que os casos que eu *imaginei* funcionam. Esta
 * simulação existe para os que eu não imaginei: gera milhares de exportações
 * plausíveis (câmera caindo, relógio à deriva, disco cheio, trecho reenviado,
 * operador recortando) e verifica **invariantes**, não saídas específicas.
 *
 * As invariantes são escolhidas pelo custo do erro em audiência:
 *
 *  I1 — Adulterar o segmento k SEMPRE quebra a corrente, e o primeiro elo
 *       divergente é exatamente k. Falhar aqui é assinar uma prova falsa.
 *  I2 — Nenhuma alteração no manifesto sobrevive ao selo.
 *  I3 — O veredito é monotônico: acrescentar defeito nunca melhora a peça.
 *  I4 — Determinismo total: mesma entrada, mesmo selo, sempre.
 *  I5 — Carimbos do equipamento saem iguais aos que entraram (nada de correção
 *       silenciosa de relógio).
 *  I6 — `admissible` implica lista de ressalvas vazia — e vice-versa.
 */
import { describe, it, expect } from 'vitest';
import {
  assessCustody,
  buildManifest,
  verifyManifest,
  type EvidenceSegment,
  type EvidenceTransformation,
  type ExportRequest,
} from '../custodyManifest';

/* --------------------------------------------------------------------- */
/*  Gerador determinístico (mulberry32) — falha reproduzível ou não serve  */
/* --------------------------------------------------------------------- */

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE = Date.parse('2026-07-27T00:00:00.000Z');

function hexOf(n: number): string {
  return n.toString(16).padStart(64, '0');
}

interface Scenario {
  readonly request: ExportRequest;
  readonly seed: number;
}

function makeScenario(seed: number): Scenario {
  const r = rng(seed);
  const count = 1 + Math.floor(r() * 8);
  const segments: EvidenceSegment[] = [];

  let cursor = BASE + Math.floor(r() * 3_600_000);
  const from = cursor;

  for (let i = 0; i < count; i += 1) {
    const duration = 5_000 + Math.floor(r() * 120_000);

    // Buracos, sobreposições e continuidade perfeita, em proporções realistas.
    const roll = r();
    if (i > 0) {
      if (roll < 0.2) cursor += 1_000 + Math.floor(r() * 600_000); // queda de rede
      else if (roll < 0.3) cursor -= Math.floor(r() * 4_000); // reenvio sobreposto
    }

    const skewRoll = r();
    const clockOffsetMs =
      skewRoll < 0.15 ? Math.floor((r() - 0.5) * 120_000) : Math.floor((r() - 0.5) * 400);

    segments.push({
      index: i,
      storagePath: `evidence/cam/${seed}-${i}.mp4`,
      byteSize: r() < 0.03 ? 0 : 100_000 + Math.floor(r() * 5_000_000),
      sha256: r() < 0.04 ? '' : hexOf(seed * 100 + i),
      deviceStartUtc: new Date(cursor).toISOString(),
      deviceEndUtc: new Date(cursor + duration).toISOString(),
      receivedAtUtc: new Date(cursor + duration + 1_000).toISOString(),
      clockOffsetMs,
    });

    cursor += duration;
  }

  const pixelsAltered = r() < 0.4;
  const transformations: EvidenceTransformation[] = [];
  if (pixelsAltered && r() < 0.85) {
    transformations.push({
      kind: r() < 0.5 ? 'watermark' : 'transcode',
      detail: 'processamento de exportação',
      tool: 'ffmpeg@6.1',
    });
  }
  if (r() < 0.2) {
    transformations.push({ kind: 'trim', detail: 'recorte temporal', tool: 'ffmpeg@6.1' });
  }

  return {
    seed,
    request: {
      exportId: `exp-${seed}`,
      cameraId: `cam-${seed % 60}`,
      requestedBy: r() < 0.05 ? '' : `user-${seed % 17}`,
      requestedFromUtc: new Date(from).toISOString(),
      requestedToUtc: new Date(cursor).toISOString(),
      segments,
      transformations,
      pixelsAltered,
      generatedAtUtc: new Date(cursor + 60_000).toISOString(),
      systemVersion: 'visao@156',
    },
  };
}

const SCENARIOS = Array.from({ length: 900 }, (_, i) => makeScenario(i + 1));

/* --------------------------------------------------------------------- */

describe('Onda 156 — simulação de cenários de exportação probatória', () => {
  it('I6: "íntegra" e "sem ressalvas" são a mesma coisa', () => {
    for (const { request, seed } of SCENARIOS) {
      const a = assessCustody(request);
      expect(
        a.level === 'admissible' ? a.reasons.length === 0 : a.reasons.length > 0,
        `cenário ${seed}: veredito ${a.level} com ${a.reasons.length} ressalva(s)`,
      ).toBe(true);
    }
  });

  it('I3: acrescentar defeito nunca melhora a peça', () => {
    const rank = { admissible: 0, weakened: 1, broken: 2 } as const;
    for (const { request, seed } of SCENARIOS) {
      const before = rank[assessCustody(request).level];

      // Defeito acrescentado: um trecho sem impressão digital no fim.
      const last = request.segments[request.segments.length - 1];
      const worse = assessCustody({
        ...request,
        segments: [
          ...request.segments,
          {
            index: request.segments.length,
            storagePath: 'evidence/extra.mp4',
            byteSize: 1,
            sha256: '',
            deviceStartUtc: last?.deviceEndUtc ?? request.requestedToUtc,
            deviceEndUtc: new Date(
              (Date.parse(last?.deviceEndUtc ?? request.requestedToUtc) || BASE) + 1_000,
            ).toISOString(),
            receivedAtUtc: request.generatedAtUtc,
            clockOffsetMs: 0,
          },
        ],
      });

      expect(rank[worse.level], `cenário ${seed}`).toBeGreaterThanOrEqual(before);
      expect(worse.level).toBe('broken');
    }
  });

  it('I5: carimbos do equipamento nunca são reescritos', async () => {
    for (const { request, seed } of SCENARIOS.slice(0, 200)) {
      const manifest = await buildManifest(request);
      for (let i = 0; i < request.segments.length; i += 1) {
        expect(manifest.segments[i]?.deviceStartUtc, `cenário ${seed}/${i}`).toBe(
          request.segments[i]?.deviceStartUtc,
        );
        expect(manifest.segments[i]?.clockOffsetMs).toBe(request.segments[i]?.clockOffsetMs);
      }
    }
  });

  it('I4 + I1: selo determinístico e adulteração localizada no índice certo', async () => {
    for (const { request, seed } of SCENARIOS.slice(0, 200)) {
      const manifest = await buildManifest(request);

      // I4 — reproduzir do zero devolve exatamente o mesmo selo.
      const again = await buildManifest(request);
      expect(again.rootHash, `cenário ${seed}`).toBe(manifest.rootHash);
      expect(await verifyManifest(manifest)).toEqual({
        intact: true,
        firstBrokenIndex: null,
        rootMatches: true,
      });

      // I1 — adultera cada segmento, um de cada vez.
      for (let k = 0; k < manifest.segments.length; k += 1) {
        const tampered = {
          ...manifest,
          segments: manifest.segments.map((s, i) =>
            i === k ? { ...s, byteSize: s.byteSize + 1 } : s,
          ),
        };
        const v = await verifyManifest(tampered);
        expect(v.intact, `cenário ${seed}: adulteração em ${k} passou`).toBe(false);
        expect(v.firstBrokenIndex, `cenário ${seed}: culpou o elo errado`).toBe(k);
      }
    }
  });

  it('I2: nenhum campo do manifesto pode ser editado sem quebrar o selo', async () => {
    const mutations: ReadonlyArray<
      readonly [string, (m: Awaited<ReturnType<typeof buildManifest>>) => unknown]
    > = [
      ['requestedBy', (m) => ({ ...m, requestedBy: `${m.requestedBy}-x` })],
      ['cameraId', (m) => ({ ...m, cameraId: `${m.cameraId}-x` })],
      ['exportId', (m) => ({ ...m, exportId: `${m.exportId}-x` })],
      ['generatedAtUtc', (m) => ({ ...m, generatedAtUtc: '2000-01-01T00:00:00.000Z' })],
      ['requestedFromUtc', (m) => ({ ...m, requestedFromUtc: '2000-01-01T00:00:00.000Z' })],
      ['systemVersion', (m) => ({ ...m, systemVersion: 'visao@0' })],
      ['pixelsAltered', (m) => ({ ...m, pixelsAltered: !m.pixelsAltered })],
      [
        'transformations',
        (m) => ({
          ...m,
          transformations: [
            ...m.transformations,
            { kind: 'redaction' as const, detail: 'tarja oculta', tool: 'x' },
          ],
        }),
      ],
      [
        'assessment',
        (m) => ({ ...m, assessment: { ...m.assessment, level: 'admissible' as const } }),
      ],
    ];

    for (const { request, seed } of SCENARIOS.slice(0, 120)) {
      const manifest = await buildManifest(request);
      for (const [label, mutate] of mutations) {
        const edited = mutate(manifest) as typeof manifest;
        const v = await verifyManifest(edited);
        expect(v.intact, `cenário ${seed}: edição de ${label} passou pelo selo`).toBe(false);
      }
    }
  });

  it('I1b: reordenar a sequência é detectado', async () => {
    for (const { request, seed } of SCENARIOS.filter((s) => s.request.segments.length >= 2).slice(
      0,
      150,
    )) {
      const manifest = await buildManifest(request);
      const swapped = {
        ...manifest,
        segments: [manifest.segments[1]!, manifest.segments[0]!, ...manifest.segments.slice(2)],
      };
      const v = await verifyManifest(swapped);
      expect(v.intact, `cenário ${seed}: troca de ordem passou`).toBe(false);
      expect(v.firstBrokenIndex).toBe(0);
    }
  });

  it('cobertura da simulação: os três vereditos aparecem em volume', () => {
    const tally = { admissible: 0, weakened: 0, broken: 0 };
    for (const { request } of SCENARIOS) tally[assessCustody(request).level] += 1;
    expect(tally.admissible).toBeGreaterThan(20);
    expect(tally.weakened).toBeGreaterThan(50);
    expect(tally.broken).toBeGreaterThan(50);
  });
});
