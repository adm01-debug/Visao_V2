#!/usr/bin/env node
/**
 * check-coverage-baseline.mjs
 *
 * Gate de regressão de cobertura para o CI.
 *
 * Lê `coverage/coverage-summary.json` (gerado por `vitest run --coverage`) e
 * compara com `coverage-baseline.json` versionado no repositório.
 *
 * Regras:
 *  - Falha se qualquer métrica cair mais que TOLERANCE_PP (default 0.5 pp)
 *    abaixo da baseline  → regressão.
 *  - Falha se qualquer métrica ficar abaixo do piso absoluto (`floors`),
 *    quando definido na baseline.
 *  - Faz "ratchet" automático: quando a cobertura sobe além da tolerância,
 *    avisa que a baseline deve ser atualizada (`--update` grava).
 *  - Sem baseline no repositório, grava a atual e passa (bootstrap).
 *
 * Uso:
 *   node scripts/check-coverage-baseline.mjs            # valida
 *   node scripts/check-coverage-baseline.mjs --update   # regrava baseline
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SUMMARY_PATH = path.join(ROOT, "coverage", "coverage-summary.json");
const BASELINE_PATH = path.join(ROOT, "coverage-baseline.json");
const METRICS = /** @type {const} */ (["statements", "branches", "functions", "lines"]);

const args = process.argv.slice(2);
const UPDATE = args.includes("--update");
const TOLERANCE_PP = Number.parseFloat(process.env.COVERAGE_TOLERANCE_PP ?? "0.5");

if (!Number.isFinite(TOLERANCE_PP) || TOLERANCE_PP < 0) {
  console.error(`❌ COVERAGE_TOLERANCE_PP inválido: ${process.env.COVERAGE_TOLERANCE_PP}`);
  process.exit(1);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  console.error(
    `❌ ${path.relative(ROOT, SUMMARY_PATH)} não encontrado.\n` +
      `   Rode 'vitest run --coverage' antes deste gate.`
  );
  process.exit(1);
}

/** @returns {Record<string, number>} */
function readCurrent() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));
  } catch (error) {
    console.error(`❌ Falha ao ler coverage-summary.json: ${String(error)}`);
    process.exit(1);
  }
  const total = raw?.total;
  if (!total) {
    console.error("❌ coverage-summary.json sem a chave 'total'.");
    process.exit(1);
  }
  /** @type {Record<string, number>} */
  const out = {};
  for (const metric of METRICS) {
    const pct = total[metric]?.pct;
    if (typeof pct !== "number" || !Number.isFinite(pct)) {
      console.error(`❌ Métrica '${metric}' ausente ou inválida no coverage-summary.json.`);
      process.exit(1);
    }
    out[metric] = pct;
  }
  return out;
}

function writeBaseline(metrics, floors) {
  const payload = {
    $comment:
      "Baseline de cobertura usada pelo gate de CI. Atualize com 'npm run coverage:baseline'.",
    updatedAt: new Date().toISOString(),
    tolerancePp: TOLERANCE_PP,
    metrics,
    ...(floors ? { floors } : {}),
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const current = readCurrent();
const fmt = (n) => `${n.toFixed(2)}%`;

if (!fs.existsSync(BASELINE_PATH)) {
  writeBaseline(current);
  console.log("ℹ️  Sem baseline anterior — baseline criada com os valores atuais:");
  for (const metric of METRICS) console.log(`   • ${metric.padEnd(10)} ${fmt(current[metric])}`);
  console.log(`✅ Gravado em ${path.relative(ROOT, BASELINE_PATH)} (commite este arquivo).`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
} catch (error) {
  console.error(`❌ coverage-baseline.json inválido: ${String(error)}`);
  process.exit(1);
}

const previous = baseline?.metrics ?? {};
const floors = baseline?.floors ?? null;

if (UPDATE) {
  writeBaseline(current, floors);
  console.log("✅ Baseline de cobertura atualizada:");
  for (const metric of METRICS) {
    const delta = current[metric] - (previous[metric] ?? 0);
    const sign = delta >= 0 ? "+" : "";
    console.log(`   • ${metric.padEnd(10)} ${fmt(current[metric])} (${sign}${delta.toFixed(2)} pp)`);
  }
  process.exit(0);
}

/** @type {string[]} */
const regressions = [];
/** @type {string[]} */
const belowFloor = [];
/** @type {string[]} */
const improvements = [];

console.log(`🔎 Gate de cobertura (tolerância ${TOLERANCE_PP.toFixed(2)} pp)`);
console.log("   métrica     atual      baseline   delta");

for (const metric of METRICS) {
  const now = current[metric];
  const before = typeof previous[metric] === "number" ? previous[metric] : null;
  const delta = before === null ? 0 : now - before;
  const sign = delta >= 0 ? "+" : "";
  console.log(
    `   ${metric.padEnd(11)} ${fmt(now).padEnd(10)} ${(before === null ? "—" : fmt(before)).padEnd(10)} ${sign}${delta.toFixed(2)} pp`
  );

  if (before !== null && delta < -TOLERANCE_PP) {
    regressions.push(
      `${metric}: ${fmt(now)} < baseline ${fmt(before)} (queda de ${Math.abs(delta).toFixed(2)} pp)`
    );
  }
  if (before !== null && delta > TOLERANCE_PP) {
    improvements.push(`${metric}: +${delta.toFixed(2)} pp`);
  }

  const floor = floors?.[metric];
  if (typeof floor === "number" && now < floor) {
    belowFloor.push(`${metric}: ${fmt(now)} abaixo do piso obrigatório ${fmt(floor)}`);
  }
}

if (belowFloor.length > 0) {
  console.error("\n❌ Cobertura abaixo do piso absoluto:");
  for (const line of belowFloor) console.error(`   • ${line}`);
}

if (regressions.length > 0) {
  console.error("\n❌ Regressão de cobertura detectada:");
  for (const line of regressions) console.error(`   • ${line}`);
  console.error(
    "\n   Adicione testes para o código novo ou, se a queda for intencional,\n" +
      "   rode 'npm run coverage:baseline' e commite o coverage-baseline.json."
  );
}

if (belowFloor.length > 0 || regressions.length > 0) {
  process.exit(1);
}

if (improvements.length > 0) {
  console.log(
    `\n📈 Cobertura subiu (${improvements.join(", ")}). Rode 'npm run coverage:baseline' para travar o novo patamar.`
  );
}

console.log("\n✅ Nenhuma regressão de cobertura detectada.");
