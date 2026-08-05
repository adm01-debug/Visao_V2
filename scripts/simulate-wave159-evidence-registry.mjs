#!/usr/bin/env node
/**
 * Onda 159 — simulação exaustiva do registro probatório.
 *
 * Varre o produto cartesiano de (veredito × desfecho de conferência × forma
 * dos dados) e exige invariantes que nenhuma tela pode violar:
 *
 *  I1  Nunca exibir "íntegra" sem uma conferência bem-sucedida do servidor.
 *  I2  Nenhuma falha de transporte/permissão produz "adulterada".
 *  I3  Integridade domina qualidade na severidade, sempre.
 *  I4  O título do resumo é o pior estado presente no conjunto.
 *  I5  Toda linha adulterada/sumida/indeterminada é acionável — e só elas.
 *  I6  A ordenação é total e estável (nunca perde nem duplica linhas).
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jiti = require('jiti')(import.meta.url, { interopDefault: true, esmResolve: true });

const { toExportView, outcomeFromVerify, outcomeFromFailure, sortForReview, summarize } = jiti(
  '../src/lib/evidence/exportRegistryView.ts'
);

const VERDICTS = ['admissible', 'weakened', 'broken', 'desconhecido'];
const COVERAGES = [-0.5, 0, 0.5, 0.98, 1, 3];
const SEALED = ['2026-07-27T10:00:00Z', '2020-01-01T00:00:00Z', 'lixo'];
const ERROR_CODES = [
  null,
  'export_not_found',
  'missing_capability',
  'unauthenticated',
  'internal_error',
  'invalid_export_id',
];

function outcomes() {
  const list = [
    { label: 'unverified', value: { status: 'unverified' } },
    { label: 'checking', value: { status: 'checking' } },
  ];
  for (const intact of [true, false]) {
    for (const rootMatches of [true, false]) {
      for (const idx of [null, 0, 7]) {
        list.push({
          label: `verify(${intact},${rootMatches},${idx})`,
          value: outcomeFromVerify(
            { export_id: 'e', intact, first_broken_index: idx, root_matches: rootMatches },
            1
          ),
          fromServer: true,
          serverIntact: intact && rootMatches,
        });
      }
    }
  }
  for (const code of ERROR_CODES) {
    list.push({
      label: `failure(${code})`,
      value: outcomeFromFailure(code, 'detalhe', 1),
      isFailure: true,
      code,
    });
  }
  return list;
}

let scenarios = 0;
let assertions = 0;
const failures = [];

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

const allViews = [];
let n = 0;
for (const verdict of VERDICTS) {
  for (const coverage of COVERAGES) {
    for (const sealed of SEALED) {
      for (const outcome of outcomes()) {
        n += 1;
        scenarios += 1;
        const row = {
          id: `id-${n}`,
          export_id: `exp-${n}`,
          camera_id: 'cam',
          root_hash: 'f'.repeat(64),
          verdict,
          coverage_ratio: coverage,
          segment_count: 4,
          gap_count: 1,
          sealed_at: sealed,
        };
        const view = toExportView(row, outcome.value);
        allViews.push(view);

        // I1
        if (view.integrity.state === 'intact') {
          check(
            outcome.fromServer === true && outcome.serverIntact === true,
            `I1 violada: "íntegra" sem confirmação do servidor em ${outcome.label}`
          );
        }
        // I2
        if (outcome.isFailure) {
          check(
            view.integrity.state !== 'tampered',
            `I2 violada: falha "${outcome.code}" virou adulteração`
          );
          check(
            view.integrity.state ===
              (outcome.code === 'export_not_found' ? 'missing' : 'indeterminate'),
            `I2 violada: classificação errada para "${outcome.code}"`
          );
        }
        // I5
        const expectedActionable = ['tampered', 'missing', 'indeterminate'].includes(
          view.integrity.state
        );
        check(view.actionable === expectedActionable, `I5 violada em ${outcome.label}`);

        // apresentação defensiva
        check(
          view.coveragePercent >= 0 && view.coveragePercent <= 100,
          `cobertura fora de faixa: ${view.coveragePercent}`
        );
        check(Number.isFinite(view.severityRank), 'severidade não numérica');
      }
    }
  }
}

// I3 — nenhuma combinação de qualidade ultrapassa um degrau de integridade.
const RANKED = ['intact', 'checking', 'unverified', 'indeterminate', 'missing', 'tampered'];
for (let i = 0; i < RANKED.length - 1; i += 1) {
  const lower = allViews.filter((v) => v.integrity.state === RANKED[i]);
  const higher = allViews.filter((v) => v.integrity.state === RANKED[i + 1]);
  const maxLower = Math.max(...lower.map((v) => v.severityRank));
  const minHigher = Math.min(...higher.map((v) => v.severityRank));
  check(maxLower < minHigher, `I3 violada entre ${RANKED[i]} e ${RANKED[i + 1]}`);
}

// I4 — título do resumo é o pior estado presente, em amostras aleatórias.
const PRIORITY = ['tampered', 'missing', 'indeterminate', 'unverified'];
let seed = 159;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
for (let s = 0; s < 500; s += 1) {
  scenarios += 1;
  const size = 1 + Math.floor(rnd() * 12);
  const sample = Array.from({ length: size }, () => allViews[Math.floor(rnd() * allViews.length)]);
  const summary = summarize(sample);
  const present = new Set(
    sample.map((v) => (v.integrity.state === 'checking' ? 'unverified' : v.integrity.state))
  );
  const expected = PRIORITY.find((p) => present.has(p)) ?? 'intact';
  check(
    summary.headline === expected,
    `I4 violada: título ${summary.headline}, esperado ${expected}`
  );
  check(summary.total === size, 'resumo perdeu linhas');

  // I6 — ordenação total, sem perda nem duplicação, monotônica.
  const sorted = sortForReview(sample);
  check(sorted.length === sample.length, 'I6 violada: ordenação alterou a contagem');
  for (let i = 1; i < sorted.length; i += 1) {
    check(
      sorted[i - 1].severityRank >= sorted[i].severityRank,
      'I6 violada: severidade fora de ordem'
    );
  }
}

console.log(
  `Onda 159 — cenários: ${scenarios}, asserções: ${assertions}, falhas: ${failures.length}`
);
if (failures.length > 0) {
  for (const f of failures.slice(0, 20)) console.error(' ✗', f);
  process.exit(1);
}
console.log('✓ Todas as invariantes do registro probatório se mantiveram.');
