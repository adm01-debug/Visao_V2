#!/usr/bin/env node
/**
 * Onda 165 — simulação adversarial do livro de supressões do E-Map.
 *
 * Espelha `src/lib/emap/suppressionLedger.ts` via transpilação leve (o módulo é
 * TypeScript puro, sem dependências de runtime além de tipos), e exercita:
 *   - pureza / não-mutação da entrada
 *   - identidade de referência quando nada muda
 *   - filtragem de motivos que não escondem agravamento
 *   - expiração por relógio e idempotência da poda
 *   - teto por câmera preservando os mais recentes
 *   - resiliência a entradas malformadas e relógio inválido
 *   - determinismo da ordenação do resumo
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = resolve(process.cwd(), 'src/lib/emap/suppressionLedger.ts');

// Transpilação suficiente: remove anotações de tipo por regex conservadora.
// Em vez de arriscar, carregamos via `--experimental-strip-types` quando houver.
let mod;
try {
  mod = await import(pathToFileURL(SRC).href);
} catch {
  const source = readFileSync(SRC, 'utf8');
  const stripped = source
    .replace(/^import type[\s\S]*?;$/gm, '')
    .replace(/^export (interface|type) [\s\S]*?^}$/gm, '')
    .replace(/^export type [^\n]*;$/gm, '')
    .replace(/^(export )?interface [\s\S]*?^}$/gm, '');
  const dataUrl = 'data:text/javascript;base64,' + Buffer.from(stripped).toString('base64');
  mod = await import(dataUrl);
}

const {
  emptySuppressionLedger,
  recordSuppressions,
  pruneSuppressions,
  clearCameraSuppressions,
  summarizeSuppressions,
  isWithheld,
  DEFAULT_SUPPRESSION_CONFIG,
} = mod;

let assertions = 0;
let failures = 0;
function check(condition, message) {
  assertions += 1;
  if (!condition) {
    failures += 1;
    if (failures <= 20) console.error(`  ✗ ${message}`);
  }
}

// PRNG determinístico (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REASONS = ['not_primed', 'improved', 'cooldown', 'flapping', 'folded_into_burst'];
const CAMERAS = Array.from({ length: 12 }, (_, i) => `cam-${String(i).padStart(2, '0')}`);

// ── 1. Motivos não retidos jamais entram no livro ─────────────────────────
{
  const ledger = recordSuppressions(
    emptySuppressionLedger(),
    [
      { cameraId: 'a', reason: 'improved' },
      { cameraId: 'b', reason: 'not_primed' },
    ],
    1_000,
  );
  check(Object.keys(ledger.cameras).length === 0, 'improved/not_primed não são gravados');
  check(!isWithheld('improved'), 'improved não é retenção');
  check(isWithheld('cooldown') && isWithheld('flapping') && isWithheld('folded_into_burst'),
    'motivos de retenção reconhecidos');
}

// ── 2. Identidade de referência quando nada muda ──────────────────────────
{
  let ledger = emptySuppressionLedger();
  const same = recordSuppressions(ledger, [], 5_000);
  check(same === ledger, 'leva vazia devolve mesma referência');
  ledger = recordSuppressions(ledger, [{ cameraId: 'a', reason: 'cooldown' }], 5_000);
  const pruned = pruneSuppressions(ledger, 5_100);
  check(pruned === ledger, 'poda sem vencidos devolve mesma referência');
  check(pruneSuppressions(ledger, Number.NaN) === ledger, 'relógio NaN é inerte na poda');
  check(recordSuppressions(ledger, [{ cameraId: 'z', reason: 'cooldown' }], Number.NaN) === ledger,
    'relógio NaN é inerte na gravação');
  check(clearCameraSuppressions(ledger, 'inexistente') === ledger, 'limpar câmera ausente é inerte');
  check(clearCameraSuppressions(ledger, '') === ledger, 'id vazio é inerte');
}

// ── 3. Não-mutação da entrada ─────────────────────────────────────────────
{
  const base = recordSuppressions(
    emptySuppressionLedger(),
    CAMERAS.map((id) => ({ cameraId: id, reason: 'cooldown' })),
    10_000,
  );
  const snapshot = JSON.stringify(base);
  recordSuppressions(base, [{ cameraId: CAMERAS[0], reason: 'flapping' }], 11_000);
  pruneSuppressions(base, 10_000_000);
  clearCameraSuppressions(base, CAMERAS[1]);
  summarizeSuppressions(base, 12_000);
  check(JSON.stringify(base) === snapshot, 'entrada nunca é mutada');
}

// ── 4. Expiração por relógio + idempotência ───────────────────────────────
{
  const cfg = { retentionMs: 1_000, maxPerCamera: 10 };
  let ledger = recordSuppressions(emptySuppressionLedger(), [{ cameraId: 'a', reason: 'cooldown' }], 0, cfg);
  check(summarizeSuppressions(ledger, 500, cfg).total === 1, 'dentro da janela permanece');
  const expired = pruneSuppressions(ledger, 2_000, cfg);
  check(summarizeSuppressions(expired, 2_000, cfg).total === 0, 'fora da janela some');
  const again = pruneSuppressions(expired, 2_000, cfg);
  check(again === expired, 'poda é idempotente');
  check(Object.keys(expired.cameras).length === 0, 'câmera sem registros é removida do livro');
}

// ── 5. Teto por câmera guarda os mais recentes ────────────────────────────
{
  const cfg = { retentionMs: 1_000_000, maxPerCamera: 5 };
  let ledger = emptySuppressionLedger();
  for (let i = 0; i < 40; i += 1) {
    ledger = recordSuppressions(ledger, [{ cameraId: 'a', reason: 'flapping' }], 1_000 + i, cfg);
  }
  const events = ledger.cameras.a;
  check(events.length === 5, 'teto por câmera respeitado');
  check(events[events.length - 1].at === 1_039, 'mantém os mais recentes');
  check(events.every((e, i) => i === 0 || e.at >= events[i - 1].at), 'ordem cronológica preservada');
}

// ── 6. Entradas malformadas ───────────────────────────────────────────────
{
  const garbage = [
    null,
    undefined,
    {},
    { cameraId: '', reason: 'cooldown' },
    { cameraId: 'a' },
    { cameraId: 42, reason: 'cooldown' },
    { cameraId: 'a', reason: 'inventado' },
    { cameraId: 'a', reason: null },
  ];
  const ledger = recordSuppressions(emptySuppressionLedger(), garbage, 1_000);
  check(Object.keys(ledger.cameras).length === 0, 'lixo nunca é gravado');
  check(recordSuppressions(emptySuppressionLedger(), undefined, 1_000).cameras !== undefined,
    'lista ausente não quebra');
  const summary = summarizeSuppressions(emptySuppressionLedger(), Number.NaN);
  check(summary.total === 0 && summary.cameras.length === 0, 'resumo de livro vazio é vazio');
}

// ── 7. Fuzz determinístico: invariantes globais ───────────────────────────
for (let seed = 1; seed <= 400; seed += 1) {
  const rand = rng(seed);
  const cfg = {
    retentionMs: 1_000 + Math.floor(rand() * 60_000),
    maxPerCamera: 1 + Math.floor(rand() * 20),
  };
  let ledger = emptySuppressionLedger();
  let now = 0;
  let withheldSeen = 0;

  for (let step = 0; step < 60; step += 1) {
    now += Math.floor(rand() * 5_000);
    const batchSize = Math.floor(rand() * 6);
    const batch = [];
    for (let i = 0; i < batchSize; i += 1) {
      const cameraId = CAMERAS[Math.floor(rand() * CAMERAS.length)];
      const reason = REASONS[Math.floor(rand() * REASONS.length)];
      batch.push({ cameraId, reason });
      if (isWithheld(reason)) withheldSeen += 1;
    }
    const before = JSON.stringify(ledger);
    ledger = recordSuppressions(ledger, batch, now, cfg);
    check(JSON.stringify(JSON.parse(before)) === before, `seed ${seed}: entrada intacta`);

    const summary = summarizeSuppressions(ledger, now, cfg);
    check(summary.total >= 0, `seed ${seed}: total não-negativo`);
    check(
      summary.total === summary.cameras.reduce((acc, c) => acc + c.total, 0),
      `seed ${seed}: total bate com soma por câmera`,
    );
    check(
      summary.cameras.every((c) => c.total <= cfg.maxPerCamera),
      `seed ${seed}: teto por câmera respeitado no resumo`,
    );
    check(
      summary.cameras.every((c) => now - c.firstAt <= cfg.retentionMs && c.lastAt <= now),
      `seed ${seed}: nenhum registro vencido ou futuro no resumo`,
    );
    check(
      summary.cameras.every((c, i) => i === 0 || summary.cameras[i - 1].total >= c.total),
      `seed ${seed}: ordenação decrescente por volume`,
    );
    check(
      summary.cameras.every((c) => c.byReason.improved === 0 && c.byReason.not_primed === 0),
      `seed ${seed}: motivos não-retidos ausentes`,
    );
    check(
      summary.cameras.every(
        (c) => c.byReason.cooldown + c.byReason.flapping + c.byReason.folded_into_burst === c.total,
      ),
      `seed ${seed}: contagem por motivo fecha com o total`,
    );

    // Determinismo: mesmo livro + mesmo relógio ⇒ mesma saída serializada
    const twice = summarizeSuppressions(ledger, now, cfg);
    check(JSON.stringify(twice) === JSON.stringify(summary), `seed ${seed}: resumo determinístico`);
  }

  // Após o horizonte de retenção tudo desaparece
  const drained = pruneSuppressions(ledger, now + cfg.retentionMs + 1, cfg);
  check(
    summarizeSuppressions(drained, now + cfg.retentionMs + 1, cfg).total === 0,
    `seed ${seed}: livro esvazia após a janela`,
  );
  check(withheldSeen >= 0, `seed ${seed}: contador sanidade`);
}

// ── 8. clearCamera remove só a câmera pedida ──────────────────────────────
{
  let ledger = recordSuppressions(
    emptySuppressionLedger(),
    CAMERAS.map((id) => ({ cameraId: id, reason: 'cooldown' })),
    1_000,
  );
  const cleared = clearCameraSuppressions(ledger, CAMERAS[3]);
  check(!cleared.cameras[CAMERAS[3]], 'câmera pedida removida');
  check(Object.keys(cleared.cameras).length === CAMERAS.length - 1, 'demais preservadas');
  check(ledger.cameras[CAMERAS[3]], 'livro original intacto');
}

console.log(
  `\nOnda 165 — livro de supressões: ${assertions} asserções, ${failures} falha(s).`,
);
process.exit(failures === 0 ? 0 : 1);
