#!/usr/bin/env node
/**
 * Onda 158 — simulação adversarial da admissão do pedido de selagem.
 *
 * Não basta o caminho feliz: o valor desta camada está no que ela RECUSA.
 * Varremos combinações hostis e degeneradas e conferimos invariantes que
 * precisam valer para todo pedido admitido.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jiti = require('jiti')(import.meta.url, { interopDefault: true, esmResolve: true });

const { admitSealRequest, MAX_SEGMENTS, MAX_TRANSFORMATIONS, MAX_WINDOW_MS, SERVER_OWNED_FIELDS } =
  jiti('../supabase/functions/_shared/evidenceSealRequest.ts');
const { buildManifest, verifyManifest } = jiti('../src/lib/evidence/custodyManifest.ts');

const NOW = Date.parse('2026-07-27T12:00:00.000Z');
const CTX = {
  requestedBy: '11111111-1111-4111-8111-111111111111',
  exportId: '22222222-2222-4222-8222-222222222222',
  nowMs: NOW,
  systemVersion: 'visao/158',
};
const CAM = '33333333-3333-4333-8333-333333333333';

let checks = 0;
const failures = [];
function expect(cond, label) {
  checks += 1;
  if (!cond) failures.push(label);
}

function seg(i, overrides = {}) {
  const start = NOW - 3_600_000 + i * 60_000;
  return {
    index: i,
    storage_path: `evidence/${CAM}/seg-${i}.mp4`,
    byte_size: 1024 * (i + 1),
    sha256: 'a'.repeat(64),
    device_start_utc: new Date(start).toISOString(),
    device_end_utc: new Date(start + 60_000).toISOString(),
    received_at_utc: new Date(start + 61_000).toISOString(),
    clock_offset_ms: 0,
    ...overrides,
  };
}

function base(overrides = {}) {
  return {
    action: 'seal',
    camera_id: CAM,
    requested_from_utc: new Date(NOW - 3_600_000).toISOString(),
    requested_to_utc: new Date(NOW).toISOString(),
    pixels_altered: false,
    segments: [seg(0), seg(1)],
    transformations: [],
    ...overrides,
  };
}

/* 1 — caminho feliz e invariantes de procedência ------------------------- */
{
  const r = admitSealRequest(base(), CTX);
  expect(r.ok, 'pedido válido deve ser admitido');
  expect(r.ok && r.request.requestedBy === CTX.requestedBy, 'autor vem do contexto');
  expect(r.ok && r.request.exportId === CTX.exportId, 'exportId vem do contexto');
  expect(
    r.ok && r.request.generatedAtUtc === new Date(NOW).toISOString(),
    'relógio vem do contexto',
  );
  expect(r.ok && r.request.systemVersion === 'visao/158', 'versão vem do contexto');
}

/* 2 — tentativa de forjar campos do servidor (A1) ------------------------ */
for (const field of SERVER_OWNED_FIELDS) {
  const payload = base();
  payload[field] = field === 'chain' ? [] : 'forjado';
  const r = admitSealRequest(payload, CTX);
  expect(
    !r.ok && r.code === 'client_supplied_server_field',
    `campo do servidor "${field}" deve ser recusado`,
  );
}

/* 3 — corpos malformados ------------------------------------------------- */
for (const bad of [null, undefined, 0, '', 'x', [], true, NaN, () => {}]) {
  const r = admitSealRequest(bad, CTX);
  expect(!r.ok && r.code === 'malformed_body', `corpo ${String(bad)} deve ser recusado`);
}

/* 4 — camera_id ---------------------------------------------------------- */
for (const bad of [undefined, null, '', 'nao-uuid', 123, {}, [], `${CAM} `, `'; drop--`]) {
  const r = admitSealRequest(base({ camera_id: bad }), CTX);
  expect(!r.ok && r.code === 'invalid_camera_id', `camera_id ${String(bad)} deve ser recusado`);
}

/* 5 — janela pedida (A4) ------------------------------------------------- */
{
  const cases = [
    [{ requested_from_utc: 'ontem' }, 'invalid_window'],
    [{ requested_to_utc: '' }, 'invalid_window'],
    [{ requested_to_utc: null }, 'invalid_window'],
    [{ requested_from_utc: new Date(NOW).toISOString(), requested_to_utc: new Date(NOW).toISOString() }, 'invalid_window'],
    [{ requested_from_utc: new Date(NOW).toISOString(), requested_to_utc: new Date(NOW - 1000).toISOString() }, 'invalid_window'],
    [{ requested_from_utc: new Date(NOW - MAX_WINDOW_MS - 1).toISOString() }, 'window_too_long'],
    [
      {
        requested_from_utc: new Date(NOW + 10 * 60_000).toISOString(),
        requested_to_utc: new Date(NOW + 20 * 60_000).toISOString(),
      },
      'window_in_future',
    ],
  ];
  for (const [ov, code] of cases) {
    const r = admitSealRequest(base(ov), CTX);
    expect(!r.ok && r.code === code, `janela ${JSON.stringify(ov)} → ${code}`);
  }
  // limite exato é aceito
  const exact = admitSealRequest(
    base({ requested_from_utc: new Date(NOW - MAX_WINDOW_MS).toISOString() }),
    CTX,
  );
  expect(exact.ok, 'janela exatamente no teto deve ser aceita');
  // tolerância de futuro
  const tol = admitSealRequest(
    base({
      requested_from_utc: new Date(NOW + 60_000).toISOString(),
      requested_to_utc: new Date(NOW + 120_000).toISOString(),
    }),
    CTX,
  );
  expect(tol.ok, 'relógio do cliente 1min adiantado é tolerado');
}

/* 6 — pixels_altered (A3) ------------------------------------------------ */
for (const bad of [undefined, null, 'true', 1, 0, {}]) {
  const payload = base();
  if (bad === undefined) delete payload.pixels_altered;
  else payload.pixels_altered = bad;
  const r = admitSealRequest(payload, CTX);
  expect(
    !r.ok && r.code === 'missing_pixels_altered',
    `pixels_altered ${String(bad)} deve ser recusado`,
  );
}

/* 7 — segmentos ---------------------------------------------------------- */
{
  expect(
    admitSealRequest(base({ segments: [] }), CTX).code === 'empty_segments',
    'lista vazia recusada',
  );
  expect(
    admitSealRequest(base({ segments: 'x' }), CTX).code === 'empty_segments',
    'segments não-lista recusada',
  );
  const many = Array.from({ length: MAX_SEGMENTS + 1 }, (_, i) => seg(i));
  expect(
    admitSealRequest(base({ segments: many }), CTX).code === 'too_many_segments',
    'acima do teto recusado',
  );
  const atCap = Array.from({ length: MAX_SEGMENTS }, (_, i) => seg(i));
  expect(admitSealRequest(base({ segments: atCap }), CTX).ok, 'teto exato aceito');

  const badFields = {
    index: [undefined, -1, 1.5, '0', NaN, Infinity, null],
    storage_path: [undefined, '', '   ', 42, 'x'.repeat(513), null],
    byte_size: [undefined, -1, 2.5, '10', NaN, Infinity],
    sha256: [undefined, 42, null, 'a'.repeat(129), {}],
    device_start_utc: [undefined, 42, null, 'x'.repeat(65)],
    device_end_utc: [undefined, 42, null],
    received_at_utc: [undefined, 42, null],
    clock_offset_ms: [undefined, '0', 1.5, NaN, Infinity, null],
  };
  for (const [field, values] of Object.entries(badFields)) {
    for (const v of values) {
      const s = seg(0);
      if (v === undefined) delete s[field];
      else s[field] = v;
      const r = admitSealRequest(base({ segments: [s] }), CTX);
      expect(
        !r.ok && r.code === 'invalid_segment',
        `segmento.${field}=${String(v)} deve ser recusado`,
      );
    }
  }
  for (const bad of [null, 'x', 1, [], true]) {
    expect(
      admitSealRequest(base({ segments: [bad] }), CTX).code === 'invalid_segment',
      `segmento ${String(bad)} não-objeto recusado`,
    );
  }

  // A2 — material fraco NÃO é barrado na porta: vira rebaixamento no manifesto.
  const weakCases = [
    { sha256: '' },
    { sha256: 'NAOEHEX' },
    { sha256: 'A'.repeat(64) },
    { byte_size: 0 },
    { device_start_utc: 'invalido' },
    { clock_offset_ms: 90_000 },
    { device_end_utc: new Date(NOW - 3_700_000).toISOString() },
  ];
  for (const ov of weakCases) {
    const r = admitSealRequest(base({ segments: [seg(0, ov), seg(1)] }), CTX);
    expect(r.ok, `material fraco ${JSON.stringify(ov)} passa a porta (julgado depois)`);
  }
}

/* 8 — transformações ----------------------------------------------------- */
{
  const t = { kind: 'watermark', detail: 'marca visível', tool: 'ffmpeg 6.1' };
  expect(admitSealRequest(base({ transformations: [t] }), CTX).ok, 'transformação válida aceita');
  const noField = admitSealRequest(base({ transformations: undefined }), CTX);
  expect(noField.ok && noField.request.transformations.length === 0, 'ausente vira lista vazia');
  expect(
    admitSealRequest(base({ transformations: 'x' }), CTX).code === 'invalid_transformation',
    'não-lista recusada',
  );
  expect(
    admitSealRequest(
      base({ transformations: Array.from({ length: MAX_TRANSFORMATIONS + 1 }, () => t) }),
      CTX,
    ).code === 'too_many_transformations',
    'acima do teto de transformações recusado',
  );
  const bads = [
    { ...t, kind: 'deepfake' },
    { ...t, kind: 1 },
    { ...t, detail: '' },
    { ...t, detail: 'x'.repeat(301) },
    { ...t, tool: '   ' },
    { ...t, tool: null },
    'x',
    null,
  ];
  for (const b of bads) {
    expect(
      admitSealRequest(base({ transformations: [b] }), CTX).code === 'invalid_transformation',
      `transformação inválida ${JSON.stringify(b)} recusada`,
    );
  }
}

/* 9 — o veredito é derivado, não pedido; manifesto sempre verificável ---- */
const scenarios = [];
for (const n of [1, 2, 5, 17]) {
  for (const gapMs of [0, 500, 5_000, 120_000]) {
    for (const skew of [0, 3_000, 45_000]) {
      for (const pixels of [false, true]) {
        for (const withTransform of [false, true]) {
          scenarios.push({ n, gapMs, skew, pixels, withTransform });
        }
      }
    }
  }
}

let sealed = 0;
for (const sc of scenarios) {
  const segments = [];
  let cursor = NOW - 3_600_000;
  for (let i = 0; i < sc.n; i += 1) {
    const start = cursor;
    const end = start + 60_000;
    cursor = end + sc.gapMs;
    segments.push(
      seg(i, {
        device_start_utc: new Date(start + sc.skew).toISOString(),
        device_end_utc: new Date(end + sc.skew).toISOString(),
        received_at_utc: new Date(end + 1_000).toISOString(),
        clock_offset_ms: sc.skew,
        sha256: `${i}`.padStart(64, 'b'),
      }),
    );
  }
  const payload = base({
    segments,
    pixels_altered: sc.pixels,
    transformations: sc.withTransform
      ? [{ kind: 'transcode', detail: 'h264 → h265', tool: 'ffmpeg 6.1' }]
      : [],
  });
  const admission = admitSealRequest(payload, CTX);
  expect(admission.ok, `cenário ${JSON.stringify(sc)} deve ser admitido`);
  if (!admission.ok) continue;

  const manifest = await buildManifest(admission.request);
  const verification = await verifyManifest(manifest);
  expect(verification.intact && verification.rootMatches, 'manifesto recém-selado é íntegro');
  expect(manifest.requestedBy === CTX.requestedBy, 'autoria preservada no manifesto');
  expect(manifest.chain.length === sc.n, 'um elo por segmento');
  expect(
    manifest.assessment.coverageRatio >= 0 && manifest.assessment.coverageRatio <= 1,
    'cobertura em [0,1]',
  );
  if (sc.pixels && !sc.withTransform) {
    expect(manifest.assessment.level === 'broken', 'pixel alterado sem declaração = broken');
  }
  if (sc.gapMs > 1_000 && sc.n > 1) {
    expect(manifest.assessment.gaps.length > 0, 'lacuna real é enumerada');
  }

  // adulteração pós-selo precisa ser detectada no primeiro elo afetado
  const tampered = JSON.parse(JSON.stringify(manifest));
  const victim = Math.floor(sc.n / 2);
  tampered.segments[victim].storagePath = 'evidence/trocado.mp4';
  const after = await verifyManifest(tampered);
  expect(!after.intact, 'troca de segmento quebra a corrente');
  expect(after.firstBrokenIndex === victim, 'primeiro elo divergente é o adulterado');
  sealed += 1;
}

console.log(`Onda 158 — ${scenarios.length} cenários selados (${sealed}), ${checks} asserções.`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} falha(s):`);
  for (const f of failures.slice(0, 30)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ Nenhuma violação encontrada.');
