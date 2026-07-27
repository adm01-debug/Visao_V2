/**
 * Onda 160 — testes do dossiê portátil.
 *
 * Usa Web Crypto real (ver `src/test/setup.ts`): falsificar a primitiva de
 * hash aqui aprovaria exatamente o ataque que o dossiê existe para pegar.
 */

import { describe, expect, it } from 'vitest';
import {
  buildDossier,
  dossierFileName,
  parseDossier,
  serializeDossier,
  verifyDossier,
  DossierBuildError,
} from '@/lib/evidence/custodyDossier';
import { buildManifest, computeRootHash, type ExportRequest } from '@/lib/evidence/custodyManifest';

const BASE = Date.parse('2026-07-27T12:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

function request(count: number, bytes = 4096): ExportRequest {
  return {
    exportId: 'exp-0001',
    cameraId: '11111111-1111-1111-1111-111111111111',
    requestedBy: 'perito@visao.test',
    requestedFromUtc: iso(BASE),
    requestedToUtc: iso(BASE + count * 60_000),
    segments: Array.from({ length: count }, (_, i) => ({
      index: i,
      storagePath: `evidence/seg-${i}.mp4`,
      byteSize: bytes,
      sha256: String(i).padStart(2, '0').repeat(32).slice(0, 64),
      deviceStartUtc: iso(BASE + i * 60_000),
      deviceEndUtc: iso(BASE + (i + 1) * 60_000),
      receivedAtUtc: iso(BASE + (i + 1) * 60_000 + 1_000),
      clockOffsetMs: 0,
    })),
    transformations: [],
    pixelsAltered: false,
    generatedAtUtc: iso(BASE + count * 60_000 + 5_000),
    systemVersion: 'visao/160',
  };
}

const ISSUANCE = {
  issuedAtUtc: '2026-07-27T13:00:00.000Z',
  issuedBy: 'admin@visao.test',
  sourceSystem: 'visao/160',
};

describe('custodyDossier', () => {
  it('emite, serializa e reconfere um dossiê íntegro', async () => {
    const manifest = await buildManifest(request(3));
    const dossier = buildDossier(manifest, ISSUANCE);
    const parsed = parseDossier(serializeDossier(dossier));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const verification = await verifyDossier(parsed.dossier);
    expect(verification.integrity).toBe('intact');
    expect(verification.tone).toBe('positive');
    expect(verification.rootHash).toBe(manifest.rootHash);
  });

  it('mantém a emissão fora do bloco selado', async () => {
    const manifest = await buildManifest(request(2));
    const a = buildDossier(manifest, ISSUANCE);
    const b = buildDossier(manifest, { ...ISSUANCE, issuedBy: 'outro@visao.test', issuedAtUtc: '2027-01-01T00:00:00.000Z' });

    expect(a.sealed.rootHash).toBe(b.sealed.rootHash);
    expect(JSON.stringify(a.sealed)).toBe(JSON.stringify(b.sealed));
  });

  it('detecta edição de um trecho selado', async () => {
    const manifest = await buildManifest(request(4));
    const dossier = buildDossier(manifest, ISSUANCE);
    const mutated = JSON.parse(serializeDossier(dossier)) as Record<string, never>;
    (mutated as unknown as { sealed: { segments: { sha256: string }[] } }).sealed.segments[2].sha256 =
      'a'.repeat(64);

    const parsed = parseDossier(JSON.stringify(mutated));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const verification = await verifyDossier(parsed.dossier);
    expect(verification.integrity).toBe('tampered');
    expect(verification.chain.firstBrokenIndex).toBe(2);
  });

  it('denuncia veredito mentiroso mesmo com corrente resselada', async () => {
    const manifest = await buildManifest(request(3, 0)); // trechos vazios ⇒ rebaixado
    expect(manifest.assessment.level).not.toBe('admissible');

    const forged = JSON.parse(JSON.stringify(manifest)) as typeof manifest & {
      assessment: { level: string; reasons: unknown[] };
      rootHash: string;
    };
    forged.assessment.level = 'admissible';
    forged.assessment.reasons = [];
    forged.rootHash = await computeRootHash(forged as unknown as typeof manifest);

    const parsed = parseDossier(serializeDossier(buildDossier(forged as unknown as typeof manifest, ISSUANCE)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const verification = await verifyDossier(parsed.dossier);
    expect(verification.chain.intact).toBe(true);
    expect(verification.integrity).toBe('inconsistent_verdict');
    expect(verification.declaredLevel).toBe('admissible');
    expect(verification.recomputedLevel).not.toBe('admissible');
  });

  it('não acusa adulteração quando só o bloco não selado muda', async () => {
    const manifest = await buildManifest(request(3));
    const dossier = buildDossier(manifest, ISSUANCE);
    const mutated = JSON.parse(serializeDossier(dossier)) as { unsealed: { issuedBy: string } };
    mutated.unsealed.issuedBy = 'ninguem@nada';

    const parsed = parseDossier(JSON.stringify(mutated));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const verification = await verifyDossier(parsed.dossier);
    expect(verification.integrity).toBe('intact');
  });

  it('recusa arquivos alheios sem chamá-los de adulterados', () => {
    expect(parseDossier('não json')).toMatchObject({ ok: false, code: 'invalid_json' });
    expect(parseDossier('{"a":1}')).toMatchObject({ ok: false, code: 'not_a_dossier' });
    expect(parseDossier('[]')).toMatchObject({ ok: false, code: 'not_a_dossier' });
  });

  it('recusa emitir sem autoria ou sem relógio', async () => {
    const manifest = await buildManifest(request(1));
    expect(() => buildDossier(manifest, { ...ISSUANCE, issuedBy: ' ' })).toThrow(DossierBuildError);
    expect(() => buildDossier(manifest, { ...ISSUANCE, issuedAtUtc: 'ontem' })).toThrow(DossierBuildError);
  });

  it('gera nome de arquivo estável e seguro', async () => {
    const manifest = await buildManifest({ ...request(1), exportId: 'exp/../etc passwd' });
    const name = dossierFileName(buildDossier(manifest, ISSUANCE));
    expect(name).toMatch(/^visao-custodia_[A-Za-z0-9._-]+_[0-9a-f]{12}\.json$/);
    expect(name).not.toContain('/');
  });
});
