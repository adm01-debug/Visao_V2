#!/usr/bin/env node
/**
 * Onda 160 — simulação adversarial do dossiê portátil de custódia.
 *
 * Invariantes exigidas (em ordem de gravidade):
 *  I1  Editar QUALQUER campo selado do arquivo é detectado como adulteração.
 *  I2  Um dossiê fabricado com veredito mentiroso (corrente recalculada e
 *      coerente) é denunciado como incoerente — a corrente sozinha não pegaria.
 *  I3  Mexer no bloco `unsealed` NUNCA acusa adulteração: ele está fora do selo
 *      por construção; acusar seria falso positivo.
 *  I4  Reindentar / reordenar chaves do arquivo não altera o veredito.
 *  I5  Arquivo alheio, corrompido ou de outro sistema é RECUSADO na leitura,
 *      jamais classificado como adulterado.
 *  I6  O nome do arquivo é estável e seguro (mesmo material ⇒ mesmo nome).
 */
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jiti = require('jiti')(import.meta.url, { interopDefault: true, esmResolve: true });

const {
  buildDossier,
  serializeDossier,
  parseDossier,
  verifyDossier,
  dossierFileName,
  DOSSIER_FORMAT,
} = jiti('../src/lib/evidence/custodyDossier.ts');
const { buildManifest, computeRootHash, CUSTODY_GENESIS } = jiti('../src/lib/evidence/custodyManifest.ts');

let checks = 0;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};
const assert = (cond, msg) => {
  checks += 1;
  if (!cond) fail(msg);
};

const iso = (ms) => new Date(ms).toISOString();
const BASE = Date.parse('2026-07-27T12:00:00.000Z');

function segment(i, { gapMs = 0, skewMs = 0, bytes = 4096 } = {}) {
  const start = BASE + i * 60_000 + gapMs;
  return {
    index: i,
    storagePath: `evidence/cam-1/seg-${i}.mp4`,
    byteSize: bytes,
    sha256: `${String(i).padStart(2, '0')}`.repeat(32).slice(0, 64),
    deviceStartUtc: iso(start),
    deviceEndUtc: iso(start + 60_000),
    receivedAtUtc: iso(start + 61_000),
    clockOffsetMs: skewMs,
  };
}

function request(count, opts = {}) {
  const segments = Array.from({ length: count }, (_, i) => segment(i, opts));
  return {
    exportId: opts.exportId ?? 'exp-0001',
    cameraId: '11111111-1111-1111-1111-111111111111',
    requestedBy: opts.requestedBy ?? 'perito@visao.test',
    requestedFromUtc: iso(BASE),
    requestedToUtc: iso(BASE + count * 60_000),
    segments,
    transformations: opts.transformations ?? [],
    pixelsAltered: opts.pixelsAltered ?? false,
    generatedAtUtc: iso(BASE + count * 60_000 + 5_000),
    systemVersion: 'visao/160',
  };
}

const ISSUANCE = {
  issuedAtUtc: '2026-07-27T13:00:00.000Z',
  issuedBy: 'admin@visao.test',
  sourceSystem: 'visao/160',
};

const clone = (v) => JSON.parse(JSON.stringify(v));

async function main() {
  console.log('Onda 160 — simulação do dossiê portátil\n');

  /* ---------- caminho feliz + I4 ---------- */
  const shapes = [
    { count: 1 },
    { count: 3 },
    { count: 12 },
    { count: 3, skewMs: 9_000 },
    { count: 3, gapMs: 0, transformations: [{ kind: 'watermark', detail: 'marca', tool: 'ff/1' }], pixelsAltered: true },
    { count: 2, bytes: 0 },
    { count: 4, requestedBy: '' },
  ];

  const goldens = [];
  for (const shape of shapes) {
    const manifest = await buildManifest(request(shape.count, shape));
    const dossier = buildDossier(manifest, ISSUANCE);
    const text = serializeDossier(dossier);
    const parsed = parseDossier(text);
    assert(parsed.ok, `dossiê próprio deve ser legível (${JSON.stringify(shape)})`);
    if (!parsed.ok) continue;

    const v = await verifyDossier(parsed.dossier);
    assert(v.integrity === 'intact', `dossiê recém-emitido deve ser íntegro (${JSON.stringify(shape)})`);
    assert(
      v.declaredLevel === v.recomputedLevel,
      'veredito declarado e recalculado devem coincidir no caminho feliz',
    );
    assert(v.rootHash === manifest.rootHash, 'o selo reportado deve ser o do manifesto');

    // I4 — formatação não é prova.
    const reformatted = JSON.stringify(JSON.parse(text));
    const reparsed = parseDossier(reformatted);
    assert(reparsed.ok, 'reindentação não pode invalidar a leitura');
    if (reparsed.ok) {
      const v2 = await verifyDossier(reparsed.dossier);
      assert(v2.integrity === 'intact', 'I4: reindentar não pode acusar adulteração');
      assert(v2.rootHash === v.rootHash, 'I4: o selo não muda com a formatação');
    }

    // I6 — nome estável e seguro.
    const name = dossierFileName(dossier);
    assert(name === dossierFileName(buildDossier(manifest, ISSUANCE)), 'I6: nome deve ser estável');
    assert(/^visao-custodia_[A-Za-z0-9._-]+_[0-9a-f]{12}\.json$/.test(name), `I6: nome inseguro: ${name}`);

    goldens.push({ shape, manifest, dossier });
  }

  /* ---------- I1 — mutação de campo selado ---------- */
  // Base deliberadamente imperfeita: mutar um campo que já vale o valor
  // "mutado" seria um não-teste — foi assim que a primeira rodada passou.
  const baseManifest = await buildManifest(request(12, { skewMs: 9_000 }));
  const baseDossier = buildDossier(baseManifest, ISSUANCE);
  assert(baseManifest.assessment.level !== 'admissible', 'pré-condição: base deve ter ressalva');
  assert(baseManifest.assessment.reasons.length > 0, 'pré-condição: base deve ter motivos');
  const sealedMutations = [
    ['exportId', (d) => { d.sealed.exportId = 'exp-9999'; }],
    ['cameraId', (d) => { d.sealed.cameraId = '22222222-2222-2222-2222-222222222222'; }],
    ['requestedBy', (d) => { d.sealed.requestedBy = 'outro@visao.test'; }],
    ['requestedFromUtc', (d) => { d.sealed.requestedFromUtc = iso(BASE - 3_600_000); }],
    ['requestedToUtc', (d) => { d.sealed.requestedToUtc = iso(BASE + 99_000_000); }],
    ['generatedAtUtc', (d) => { d.sealed.generatedAtUtc = iso(BASE); }],
    ['systemVersion', (d) => { d.sealed.systemVersion = 'visao/000'; }],
    ['pixelsAltered', (d) => { d.sealed.pixelsAltered = !d.sealed.pixelsAltered; }],
    ['rootHash', (d) => { d.sealed.rootHash = 'f'.repeat(64); }],
    ['assessment.level', (d) => {
      d.sealed.assessment.level = d.sealed.assessment.level === 'admissible' ? 'broken' : 'admissible';
    }],
    ['assessment.coverageRatio', (d) => {
      d.sealed.assessment.coverageRatio = d.sealed.assessment.coverageRatio === 1 ? 0.5 : 1;
    }],
    ['assessment.reasons', (d) => {
      d.sealed.assessment.reasons = d.sealed.assessment.reasons.length === 0
        ? [{ code: 'timeline_gap', segmentIndex: 0, detail: 'inventado' }]
        : [];
    }],
    ['assessment.gaps', (d) => {
      d.sealed.assessment.gaps = d.sealed.assessment.gaps.length === 0
        ? [{ afterIndex: 0, gapMs: 5_000 }]
        : [];
    }],
    ['assessment.coveredMs', (d) => { d.sealed.assessment.coveredMs += 1_000; }],
    ['assessment.requestedMs', (d) => { d.sealed.assessment.requestedMs += 1_000; }],
    ['chain[0]', (d) => { d.sealed.chain[0] = '0'.repeat(64); }],
    ['chain.pop', (d) => { d.sealed.chain.pop(); }],
    ['chain.push', (d) => { d.sealed.chain.push('a'.repeat(64)); }],
    ['transformations', (d) => { d.sealed.transformations = [{ kind: 'trim', detail: 'x', tool: 'y' }]; }],
    ['segments.remove', (d) => { d.sealed.segments.splice(5, 1); }],
    ['segments.reorder', (d) => { const s = d.sealed.segments; [s[1], s[2]] = [s[2], s[1]]; }],
    ['segments.duplicate', (d) => { d.sealed.segments.push(clone(d.sealed.segments[0])); }],
  ];

  const segmentFields = ['index', 'storagePath', 'byteSize', 'sha256', 'deviceStartUtc', 'deviceEndUtc', 'receivedAtUtc', 'clockOffsetMs'];
  for (let si = 0; si < baseManifest.segments.length; si += 1) {
    for (const field of segmentFields) {
      sealedMutations.push([`segments[${si}].${field}`, (d) => {
        const seg = d.sealed.segments[si];
        const cur = seg[field];
        seg[field] = typeof cur === 'number' ? cur + 1 : `${cur}!`;
      }]);
    }
  }

  for (const [label, mutate] of sealedMutations) {
    const tampered = clone(baseDossier);
    mutate(tampered);
    const parsed = parseDossier(JSON.stringify(tampered));
    if (!parsed.ok) {
      // Recusa na leitura também é detecção legítima (nunca silêncio).
      assert(true, `${label}: recusado na leitura`);
      continue;
    }
    const v = await verifyDossier(parsed.dossier);
    assert(
      v.integrity !== 'intact',
      `I1: mutação em campo selado passou despercebida (${label})`,
    );
    assert(['tampered', 'inconsistent_verdict'].includes(v.integrity), `I1: classe inesperada em ${label}`);
    assert(v.tone !== 'positive', `I1: tom positivo em arquivo alterado (${label})`);
  }

  /* ---------- I2 — falsificação coerente com veredito mentiroso ---------- */
  // Constrói um manifesto REAL de material ruim e reescreve o veredito,
  // resselando a corrente: a corrente fica de pé, a mentira não.
  const badRequest = request(3, { gapMs: 0, bytes: 0 });
  const badManifest = await buildManifest(badRequest);
  assert(badManifest.assessment.level !== 'admissible', 'pré-condição: material ruim deve ser rebaixado');

  const forged = clone(badManifest);
  forged.assessment.level = 'admissible';
  forged.assessment.reasons = [];
  // Resselar é o que um falsificador competente faria: a corrente e o selo
  // ficam coerentes entre si. Só a reavaliação do conteúdo o desmascara.
  forged.rootHash = await computeRootHash(forged);
  const forgedDossier = buildDossier(forged, ISSUANCE);
  const forgedParsed = parseDossier(serializeDossier(forgedDossier));
  assert(forgedParsed.ok, 'dossiê forjado deve ser legível (o ponto é o veredito)');
  if (forgedParsed.ok) {
    const v = await verifyDossier(forgedParsed.dossier);
    assert(
      v.integrity === 'inconsistent_verdict',
      `I2: veredito mentiroso com selo coerente devia ser "incoerente", veio "${v.integrity}"`,
    );
    assert(v.chain.intact, 'I2: pré-condição — a corrente do forjado está de pé');
    assert(v.declaredLevel === 'admissible', 'I2: deve relatar o que o arquivo declara');
    assert(v.recomputedLevel !== 'admissible', 'I2: deve relatar o que o conteúdo sustenta');
  }

  /* ---------- I3 — bloco não selado ---------- */
  const unsealedMutations = [
    ['issuedBy', (d) => { d.unsealed.issuedBy = 'ninguem@nada'; }],
    ['issuedAtUtc', (d) => { d.unsealed.issuedAtUtc = '1999-01-01T00:00:00.000Z'; }],
    ['sourceSystem', (d) => { d.unsealed.sourceSystem = 'outro-sistema'; }],
    ['remove', (d) => { delete d.unsealed; }],
    ['howToVerify', (d) => { d.howToVerify = ['instruções trocadas']; }],
    ['disclosure', (d) => { d.disclosure = 'texto alterado'; }],
  ];
  for (const [label, mutate] of unsealedMutations) {
    for (const golden of goldens) {
      const copy = clone(golden.dossier);
      mutate(copy);
      const parsed = parseDossier(JSON.stringify(copy));
      assert(parsed.ok, `I3: alterar bloco não selado não pode impedir a leitura (${label})`);
      if (!parsed.ok) continue;
      const v = await verifyDossier(parsed.dossier);
      const expected = await verifyDossier(golden.dossier);
      assert(
        v.integrity === expected.integrity,
        `I3: alterar "${label}" mudou o veredito de integridade — falso positivo`,
      );
      assert(v.rootHash === expected.rootHash, `I3: selo não pode depender de "${label}"`);
    }
  }

  /* ---------- I5 — arquivo alheio / corrompido ---------- */
  const rejects = [
    ['vazio', '', 'invalid_json'],
    ['texto solto', 'não sou json', 'invalid_json'],
    ['json truncado', serializeDossier(baseDossier).slice(0, 120), 'invalid_json'],
    ['array', '[]', 'not_a_dossier'],
    ['null', 'null', 'not_a_dossier'],
    ['objeto qualquer', '{"a":1}', 'not_a_dossier'],
    ['manifesto cru', JSON.stringify(baseManifest), 'not_a_dossier'],
    ['versão futura', JSON.stringify({ ...clone(baseDossier), version: 2 }), 'unsupported_version'],
    ['outro hash', JSON.stringify({ ...clone(baseDossier), algorithm: 'MD5' }), 'unsupported_algorithm'],
    ['outra semente', JSON.stringify({ ...clone(baseDossier), genesis: 'outro:sistema' }), 'foreign_genesis'],
    ['sem manifesto', JSON.stringify({ ...clone(baseDossier), sealed: null }), 'malformed_manifest'],
    ['manifesto capenga', JSON.stringify({ ...clone(baseDossier), sealed: { version: 1 } }), 'malformed_manifest'],
    ['formato alheio', JSON.stringify({ ...clone(baseDossier), format: 'outro.formato' }), 'not_a_dossier'],
  ];
  for (const [label, text, code] of rejects) {
    const parsed = parseDossier(text);
    assert(!parsed.ok, `I5: "${label}" não podia ser aceito`);
    if (!parsed.ok) {
      assert(parsed.code === code, `I5: "${label}" classificado como ${parsed.code}, esperado ${code}`);
      assert(typeof parsed.message === 'string' && parsed.message.length > 0, 'I5: mensagem obrigatória');
    }
  }

  /* ---------- emissão recusada ---------- */
  const refusals = [
    ['sem autor', { ...ISSUANCE, issuedBy: '  ' }, 'missing_issuer'],
    ['relógio ilegível', { ...ISSUANCE, issuedAtUtc: 'ontem' }, 'invalid_issued_at'],
    ['relógio vazio', { ...ISSUANCE, issuedAtUtc: '' }, 'invalid_issued_at'],
  ];
  for (const [label, issuance, code] of refusals) {
    let thrown = null;
    try {
      buildDossier(baseManifest, issuance);
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== null, `emissão "${label}" devia ser recusada`);
    assert(thrown?.code === code, `emissão "${label}": código ${thrown?.code}, esperado ${code}`);
  }
  let noManifest = null;
  try {
    buildDossier({}, ISSUANCE);
  } catch (e) {
    noManifest = e;
  }
  assert(noManifest?.code === 'missing_manifest', 'emitir sem manifesto devia ser recusado');

  /* ---------- coerência estrutural ---------- */
  assert(baseDossier.format === DOSSIER_FORMAT, 'formato declarado');
  assert(baseDossier.genesis === CUSTODY_GENESIS, 'a semente publicada é a mesma do sistema');
  assert(
    !JSON.stringify(baseDossier.sealed).includes(ISSUANCE.issuedBy),
    'D1: a emissão jamais pode vazar para dentro do bloco selado',
  );

  console.log(`\n${checks} asserções, ${failures} falha(s).`);
  if (failures > 0) process.exit(1);
  console.log('✓ Onda 160 — dossiê portátil aprovado.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
