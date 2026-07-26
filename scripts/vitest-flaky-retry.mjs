#!/usr/bin/env node
/**
 * vitest-flaky-retry.mjs
 *
 * Reexecuta no CI SOMENTE os testes que falharam, com número limitado de
 * tentativas, para distinguir *flakiness* de falha real — sem mascarar bugs.
 *
 * Regras (deliberadamente conservadoras):
 *  1. A primeira execução roda a suíte inteira SEM retry (`retry=0`) e gera
 *     a cobertura. É ela que alimenta o gate de cobertura.
 *  2. Se houver falhas, apenas os ARQUIVOS com testes falhos são reexecutados,
 *     com cobertura desativada (não contamina o relatório da execução 1).
 *  3. Um teste que passa em alguma reexecução é classificado como FLAKY:
 *     ele NÃO derruba o job, mas é reportado no summary/artefato e conta para
 *     o limite `FLAKY_MAX_ALLOWED` (acima disso o job falha).
 *  4. Um teste que falha em TODAS as tentativas é falha REAL → exit 1.
 *
 * Variáveis de ambiente:
 *   FLAKY_MAX_RETRIES    (default 2)  tentativas extras por arquivo falho
 *   FLAKY_MAX_ALLOWED    (default 5)  máximo de testes flaky tolerados
 *
 * Uso:
 *   node scripts/vitest-flaky-retry.mjs [args extras do vitest]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const RESULTS_DIR = path.join(ROOT, "test-results");
const REPORT_PATH = path.join(RESULTS_DIR, "flaky-report.json");

const MAX_RETRIES = Math.max(0, Number.parseInt(process.env.FLAKY_MAX_RETRIES ?? "2", 10) || 0);
const MAX_ALLOWED = Math.max(0, Number.parseInt(process.env.FLAKY_MAX_ALLOWED ?? "5", 10) || 0);
const EXTRA_ARGS = process.argv.slice(2);

fs.mkdirSync(RESULTS_DIR, { recursive: true });

/**
 * Executa o vitest gravando um relatório JSON e devolve os testes falhos.
 * @param {{ jsonFile: string, files?: string[], coverage: boolean }} options
 * @returns {{ status: number, failures: { file: string, name: string }[] }}
 */
function runVitest({ jsonFile, files = [], coverage }) {
  const args = [
    "vitest",
    "run",
    "--passWithNoTests",
    "--retry=0",
    ...(coverage ? ["--coverage"] : ["--coverage.enabled=false"]),
    "--reporter=default",
    "--reporter=json",
    `--outputFile.json=${path.relative(ROOT, jsonFile)}`,
    ...files,
    ...EXTRA_ARGS,
  ];

  const result = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
  return { status: result.status ?? 1, failures: readFailures(jsonFile) };
}

/**
 * Lê o relatório JSON do vitest e extrai os testes com status "failed".
 * @param {string} jsonFile
 * @returns {{ file: string, name: string }[]}
 */
function readFailures(jsonFile) {
  /** @type {{ file: string, name: string }[]} */
  const failures = [];
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
  } catch {
    return failures;
  }
  for (const suite of raw?.testResults ?? []) {
    const file = suite?.name
      ? path.relative(ROOT, suite.name).split(path.sep).join("/")
      : "(desconhecido)";
    for (const assertion of suite?.assertionResults ?? []) {
      if (assertion?.status === "failed") {
        failures.push({ file, name: assertion.fullName ?? assertion.title ?? "(sem nome)" });
      }
    }
  }
  return failures;
}

const keyOf = (f) => `${f.file} :: ${f.name}`;

/* ------------------------------------------------------- execução principal */
console.log("▶️  Execução 1/1 da suíte completa (sem retry, com cobertura)\n");
const first = runVitest({
  jsonFile: path.join(RESULTS_DIR, "vitest-run-1.json"),
  coverage: true,
});

/** Testes falhos da execução inicial, por chave. */
const initialFailures = new Map(first.failures.map((f) => [keyOf(f), f]));

if (initialFailures.size === 0) {
  if (first.status !== 0) {
    // Falhou sem teste falho identificável (erro de coleta, crash, config).
    console.error(
      "\n❌ Vitest terminou com erro sem falhas de teste identificáveis " +
        "(erro de importação/coleta). Não é elegível a retry."
    );
    process.exit(first.status);
  }
  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), flaky: [], hardFailures: [] }, null, 2)}\n`,
    "utf8"
  );
  console.log("\n✅ Suíte verde na primeira execução — nenhum retry necessário.");
  process.exit(0);
}

console.log(
  `\n⚠️  ${initialFailures.size} teste(s) falharam. Reexecutando apenas os arquivos afetados ` +
    `(até ${MAX_RETRIES} tentativa(s)) para separar flaky de falha real.\n`
);

/** Chaves ainda falhando. */
let pending = new Map(initialFailures);
/** @type {Map<string, number>} teste flaky → tentativa em que passou */
const flaky = new Map();

for (let attempt = 1; attempt <= MAX_RETRIES && pending.size > 0; attempt++) {
  const files = [...new Set([...pending.values()].map((f) => f.file))];
  console.log(`\n🔁 Retry ${attempt}/${MAX_RETRIES} — arquivos: ${files.join(", ")}\n`);

  const retryRun = runVitest({
    jsonFile: path.join(RESULTS_DIR, `vitest-retry-${attempt}.json`),
    files,
    coverage: false,
  });

  const stillFailing = new Set(retryRun.failures.map(keyOf));
  /** @type {Map<string, { file: string, name: string }>} */
  const next = new Map();
  for (const [key, failure] of pending) {
    if (stillFailing.has(key)) next.set(key, failure);
    else flaky.set(key, attempt);
  }
  pending = next;
}

/* --------------------------------------------------------------- relatório */
const hardFailures = [...pending.keys()].sort();
const flakyList = [...flaky.entries()]
  .map(([test, passedOnAttempt]) => ({ test, passedOnAttempt }))
  .sort((a, b) => a.test.localeCompare(b.test));

const report = {
  generatedAt: new Date().toISOString(),
  maxRetries: MAX_RETRIES,
  maxFlakyAllowed: MAX_ALLOWED,
  initialFailures: initialFailures.size,
  flaky: flakyList,
  hardFailures,
};
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const lines = ["## 🔁 Retry de testes instáveis (flaky)", ""];
if (hardFailures.length > 0) {
  lines.push(
    `🔴 **${hardFailures.length} falha(s) real(is)** — falharam em todas as ${MAX_RETRIES + 1} execuções:`,
    ""
  );
  for (const test of hardFailures) lines.push(`- \`${test}\``);
  lines.push("");
}
if (flakyList.length > 0) {
  lines.push(
    `🟡 **${flakyList.length} teste(s) flaky** — falharam na 1ª execução e passaram no retry ` +
      `(limite tolerado: ${MAX_ALLOWED}):`,
    ""
  );
  for (const item of flakyList) {
    lines.push(`- \`${item.test}\` — passou no retry ${item.passedOnAttempt}`);
  }
  lines.push("", "> Flaky não mascara bug: corrija a instabilidade ou o teste vira dívida técnica.");
}
const summary = `${lines.join("\n")}\n`;
console.log(`\n${summary}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
}

if (hardFailures.length > 0) {
  console.error("❌ Falhas reais detectadas — job reprovado.");
  process.exit(1);
}
if (flakyList.length > MAX_ALLOWED) {
  console.error(
    `❌ ${flakyList.length} testes flaky excedem o limite de ${MAX_ALLOWED} — job reprovado ` +
      "para evitar erosão da confiança na suíte."
  );
  process.exit(1);
}

console.log("✅ Nenhuma falha real. Apenas instabilidade dentro do limite tolerado.");
process.exit(0);
