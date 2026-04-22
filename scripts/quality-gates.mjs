#!/usr/bin/env node
/**
 * VISÃO — Quality Gates Runner
 *
 * Executa lint, typecheck e vitest aplicando limites configuráveis por
 * ambiente (perfil) definido em `quality-gates.config.json`.
 *
 * Uso:
 *   node scripts/quality-gates.mjs            # perfil padrão (dev)
 *   node scripts/quality-gates.mjs --profile=ci
 *   node scripts/quality-gates.mjs --profile=ci --skip=vitest
 *   QUALITY_GATES_PROFILE=ci node scripts/quality-gates.mjs
 *
 * Saídas:
 *   - stdout: resumo legível, comparável ao relatório atual
 *   - reports/quality-gates/summary.json
 *   - reports/quality-gates/summary.md
 *
 * Exit code:
 *   0 = todos os gates passaram
 *   1 = pelo menos um gate falhou (ou erro de execução)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONFIG_PATH = resolve(ROOT, "quality-gates.config.json");
const REPORT_DIR = resolve(ROOT, "reports/quality-gates");

// ---------- CLI args ----------
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split("=").slice(1).join("=");
  if (args.includes(`--${name}`)) return true;
  return fallback;
}
const PROFILE =
  getArg("profile") || process.env.QUALITY_GATES_PROFILE || (process.env.CI ? "ci" : "dev");
const SKIP = String(getArg("skip", "")).split(",").filter(Boolean);
const QUIET = !!getArg("quiet");

// ---------- Config loading ----------
if (!existsSync(CONFIG_PATH)) {
  console.error(`✖ quality-gates.config.json não encontrado em ${CONFIG_PATH}`);
  process.exit(1);
}
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const profile = config.profiles?.[PROFILE];
if (!profile) {
  console.error(
    `✖ perfil "${PROFILE}" não existe. Disponíveis: ${Object.keys(config.profiles || {}).join(", ")}`,
  );
  process.exit(1);
}

// ---------- Helpers ----------
function log(...m) {
  if (!QUIET) console.log(...m);
}
function run(cmd, cmdArgs, opts = {}) {
  const t0 = Date.now();
  const res = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 64,
    ...opts,
  });
  return {
    code: res.status ?? 1,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    durationMs: Date.now() - t0,
  };
}

// ---------- Gate: ESLint ----------
function runLintGate(limits) {
  log("→ Lint (ESLint)…");
  const out = run("npx", ["eslint", "src", "--format", "json"]);
  let warnings = 0;
  let errors = 0;
  let files = 0;
  try {
    const data = JSON.parse(out.stdout || "[]");
    for (const f of data) {
      warnings += f.warningCount || 0;
      errors += f.errorCount || 0;
      if ((f.warningCount || 0) + (f.errorCount || 0) > 0) files++;
    }
  } catch {
    // ESLint pode terminar com stdout vazio se houver erro fatal
    return {
      name: "lint",
      passed: false,
      metrics: { warnings: null, errors: null, files: null },
      limits,
      durationMs: out.durationMs,
      reason: "Falha ao executar ESLint (saída inválida)",
      stderr: out.stderr.slice(0, 500),
    };
  }
  const breaches = [];
  if (typeof limits.maxWarnings === "number" && warnings > limits.maxWarnings)
    breaches.push(`warnings ${warnings} > limite ${limits.maxWarnings}`);
  if (typeof limits.maxErrors === "number" && errors > limits.maxErrors)
    breaches.push(`errors ${errors} > limite ${limits.maxErrors}`);
  return {
    name: "lint",
    passed: breaches.length === 0,
    metrics: { warnings, errors, filesWithIssues: files },
    limits,
    durationMs: out.durationMs,
    breaches,
  };
}

// ---------- Gate: TypeScript ----------
function runTypecheckGate(limits) {
  log(`→ TypeScript (${limits.config || "tsconfig.json"})…`);
  const tsconfig = limits.config || "tsconfig.json";
  const out = run("npx", ["tsc", "--noEmit", "-p", tsconfig]);
  // tsc imprime "error TSxxxx:" por linha
  const errorLines = (out.stdout + out.stderr)
    .split("\n")
    .filter((l) => /error TS\d+:/.test(l));
  const errors = errorLines.length;
  const breaches = [];
  if (typeof limits.maxErrors === "number" && errors > limits.maxErrors)
    breaches.push(`errors ${errors} > limite ${limits.maxErrors}`);
  return {
    name: "typecheck",
    passed: breaches.length === 0,
    metrics: { errors, sample: errorLines.slice(0, 5) },
    limits,
    durationMs: out.durationMs,
    breaches,
  };
}

// ---------- Gate: Vitest ----------
function runVitestGate(limits) {
  log("→ Vitest (run)…");
  const reporterPath = resolve(REPORT_DIR, "vitest.json");
  mkdirSync(REPORT_DIR, { recursive: true });
  const out = run("npx", [
    "vitest",
    "run",
    "--reporter=json",
    `--outputFile=${reporterPath}`,
    "--silent",
  ]);
  let passed = 0;
  let failed = 0;
  let total = 0;
  try {
    if (existsSync(reporterPath)) {
      const data = JSON.parse(readFileSync(reporterPath, "utf8"));
      passed = data.numPassedTests ?? 0;
      failed = data.numFailedTests ?? 0;
      total = data.numTotalTests ?? passed + failed;
    }
  } catch {
    // ignore
  }
  const passRate = total > 0 ? passed / total : 1;
  const breaches = [];
  if (typeof limits.maxFailures === "number" && failed > limits.maxFailures)
    breaches.push(`failures ${failed} > limite ${limits.maxFailures}`);
  if (typeof limits.minPassRate === "number" && passRate < limits.minPassRate)
    breaches.push(
      `passRate ${(passRate * 100).toFixed(1)}% < mínimo ${(limits.minPassRate * 100).toFixed(1)}%`,
    );
  return {
    name: "vitest",
    passed: breaches.length === 0 && out.code === 0,
    metrics: { total, passed, failed, passRate: Number(passRate.toFixed(4)) },
    limits,
    durationMs: out.durationMs,
    breaches,
    exitCode: out.code,
  };
}

// ---------- Pipeline ----------
const startedAt = new Date().toISOString();
const t0 = Date.now();
const results = [];

if (!SKIP.includes("lint")) results.push(runLintGate(profile.lint));
if (!SKIP.includes("typecheck")) results.push(runTypecheckGate(profile.typecheck));
if (!SKIP.includes("vitest")) results.push(runVitestGate(profile.vitest));

const totalDuration = Date.now() - t0;
const allPassed = results.every((r) => r.passed);

// ---------- Summary text (parecido com o formato do relatório atual) ----------
function fmtMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
function statusIcon(ok) {
  return ok ? "✅" : "❌";
}

const lines = [];
lines.push("");
lines.push("══════════════════════════════════════════════");
lines.push(` VISÃO — Quality Gates  [perfil: ${PROFILE}]`);
lines.push("══════════════════════════════════════════════");
for (const r of results) {
  lines.push("");
  lines.push(`${statusIcon(r.passed)} ${r.name.toUpperCase()}  (${fmtMs(r.durationMs)})`);
  if (r.name === "lint") {
    lines.push(
      `   warnings: ${r.metrics.warnings} (limite ${r.limits.maxWarnings}) · errors: ${r.metrics.errors} (limite ${r.limits.maxErrors})`,
    );
  } else if (r.name === "typecheck") {
    lines.push(
      `   errors: ${r.metrics.errors} (limite ${r.limits.maxErrors}) · config: ${r.limits.config || "tsconfig.json"}`,
    );
  } else if (r.name === "vitest") {
    const m = r.metrics;
    lines.push(
      `   tests: ${m.passed}/${m.total} passed · failures: ${m.failed} (limite ${r.limits.maxFailures}) · passRate: ${(m.passRate * 100).toFixed(1)}% (mínimo ${(r.limits.minPassRate * 100).toFixed(1)}%)`,
    );
  }
  if (r.breaches?.length) {
    for (const b of r.breaches) lines.push(`   ↳ violação: ${b}`);
  }
  if (r.reason) lines.push(`   ↳ ${r.reason}`);
}
lines.push("");
lines.push("──────────────────────────────────────────────");
lines.push(` Resultado: ${allPassed ? "✅ APROVADO" : "❌ REPROVADO"}  · total ${fmtMs(totalDuration)}`);
lines.push("──────────────────────────────────────────────");
lines.push("");
const textSummary = lines.join("\n");
log(textSummary);

// ---------- Persist reports ----------
mkdirSync(REPORT_DIR, { recursive: true });
const jsonSummary = {
  profile: PROFILE,
  startedAt,
  durationMs: totalDuration,
  passed: allPassed,
  gates: results,
};
writeFileSync(resolve(REPORT_DIR, "summary.json"), JSON.stringify(jsonSummary, null, 2));

const md = [];
md.push(`# Quality Gates — perfil \`${PROFILE}\``);
md.push("");
md.push(`**Status:** ${allPassed ? "✅ APROVADO" : "❌ REPROVADO"}  `);
md.push(`**Início:** ${startedAt}  `);
md.push(`**Duração total:** ${fmtMs(totalDuration)}`);
md.push("");
md.push("| Gate | Status | Métrica principal | Limite | Duração |");
md.push("|------|:------:|-------------------|--------|---------|");
for (const r of results) {
  let metric = "-";
  let limit = "-";
  if (r.name === "lint") {
    metric = `${r.metrics.warnings}w / ${r.metrics.errors}e`;
    limit = `${r.limits.maxWarnings}w / ${r.limits.maxErrors}e`;
  } else if (r.name === "typecheck") {
    metric = `${r.metrics.errors} erros`;
    limit = `${r.limits.maxErrors} erros`;
  } else if (r.name === "vitest") {
    metric = `${r.metrics.passed}/${r.metrics.total} (${(r.metrics.passRate * 100).toFixed(1)}%)`;
    limit = `≥ ${(r.limits.minPassRate * 100).toFixed(0)}%, ≤ ${r.limits.maxFailures} falhas`;
  }
  md.push(
    `| ${r.name} | ${statusIcon(r.passed)} | ${metric} | ${limit} | ${fmtMs(r.durationMs)} |`,
  );
}
const breachAll = results.flatMap((r) =>
  (r.breaches || []).map((b) => `- **${r.name}**: ${b}`),
);
if (breachAll.length) {
  md.push("");
  md.push("## Violações");
  md.push(...breachAll);
}
md.push("");
writeFileSync(resolve(REPORT_DIR, "summary.md"), md.join("\n"));

log(`📄 Relatórios salvos em: reports/quality-gates/{summary.json,summary.md}`);

process.exit(allPassed ? 0 : 1);
