#!/usr/bin/env node
/**
 * VISÃO - Build coverage dashboard report
 *
 * Reads vitest's `coverage/coverage-summary.json` and produces a slim
 * JSON consumed by the in-app `/coverage` dashboard, plus a human-readable
 * `.txt` snapshot for download.
 *
 * Output:
 *   - public/coverage-report.json
 *   - public/coverage-report.txt
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { cwd, env, exit } from "node:process";

const ROOT = cwd();
const SUMMARY_PATH = resolve(ROOT, "coverage", "coverage-summary.json");
const PUBLIC_DIR = resolve(ROOT, "public");
const OUT_JSON = resolve(PUBLIC_DIR, "coverage-report.json");
const OUT_TXT = resolve(PUBLIC_DIR, "coverage-report.txt");

// Threshold (in percentage points) for global statements drop alerts.
// Override via env: COVERAGE_DROP_THRESHOLD=1.5
const DROP_THRESHOLD = (() => {
  const raw = Number.parseFloat(env.COVERAGE_DROP_THRESHOLD ?? "2");
  return Number.isFinite(raw) && raw > 0 ? raw : 2;
})();
// When true, exit with non-zero code if drop exceeds threshold (used by CI).
const FAIL_ON_DROP = env.COVERAGE_FAIL_ON_DROP === "1";

if (!existsSync(SUMMARY_PATH)) {
  console.error(
    `[coverage-report] coverage-summary.json not found at ${SUMMARY_PATH}.\n` +
      `Run \`npm run coverage\` first.`,
  );
  process.exit(1);
}

if (!existsSync(PUBLIC_DIR)) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
}

const raw = JSON.parse(readFileSync(SUMMARY_PATH, "utf8"));

const pickMetric = (m) => ({
  pct: typeof m?.pct === "number" ? m.pct : 0,
  total: m?.total ?? 0,
  covered: m?.covered ?? 0,
  skipped: m?.skipped ?? 0,
});

const totals = {
  statements: pickMetric(raw.total?.statements),
  branches: pickMetric(raw.total?.branches),
  functions: pickMetric(raw.total?.functions),
  lines: pickMetric(raw.total?.lines),
};

const files = Object.entries(raw)
  .filter(([key]) => key !== "total")
  .map(([absPath, metrics]) => {
    let rel = relative(ROOT, absPath).split(sep).join("/");
    if (!rel || rel.startsWith("..")) rel = absPath;
    return {
      path: rel,
      statements: pickMetric(metrics.statements),
      branches: pickMetric(metrics.branches),
      functions: pickMetric(metrics.functions),
      lines: pickMetric(metrics.lines),
    };
  })
  .sort((a, b) => a.statements.pct - b.statements.pct);

// Read previous report (if any) for delta comparison.
let previousTotals = null;
let previousGeneratedAt = null;
if (existsSync(OUT_JSON)) {
  try {
    const prev = JSON.parse(readFileSync(OUT_JSON, "utf8"));
    previousTotals = prev.totals ?? null;
    previousGeneratedAt = prev.generatedAt ?? null;
  } catch {
    // Ignore — previous file is corrupt; treat as no baseline.
  }
}

const currentPct = totals.statements.pct;
const previousPct = previousTotals?.statements?.pct ?? null;
const delta = previousPct != null ? +(currentPct - previousPct).toFixed(2) : null;
const dropExceeded = delta != null && delta < 0 && Math.abs(delta) >= DROP_THRESHOLD;

const alert = {
  threshold: DROP_THRESHOLD,
  delta, // null on first run; positive = improved, negative = dropped
  dropExceeded,
  previousPct,
  previousGeneratedAt,
};

const report = {
  generatedAt: new Date().toISOString(),
  totals,
  files,
  alert,
};

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

const fmt = (n) => `${n.toFixed(2).padStart(6)}%`;
const lines = [];
lines.push("VISÃO — Coverage Report");
lines.push(`Generated: ${report.generatedAt}`);
lines.push("");
lines.push("Totals:");
lines.push(`  Statements: ${fmt(totals.statements.pct)}  (${totals.statements.covered}/${totals.statements.total})`);
lines.push(`  Branches:   ${fmt(totals.branches.pct)}  (${totals.branches.covered}/${totals.branches.total})`);
lines.push(`  Functions:  ${fmt(totals.functions.pct)}  (${totals.functions.covered}/${totals.functions.total})`);
lines.push(`  Lines:      ${fmt(totals.lines.pct)}  (${totals.lines.covered}/${totals.lines.total})`);
lines.push("");
lines.push("Coverage Drop Alert:");
lines.push(`  Threshold: ${DROP_THRESHOLD.toFixed(2)} pp`);
if (delta == null) {
  lines.push(`  Delta vs previous: N/A (no previous report).`);
} else {
  const sign = delta > 0 ? "+" : "";
  lines.push(`  Previous: ${previousPct?.toFixed(2)}% (${previousGeneratedAt ?? "?"})`);
  lines.push(`  Delta vs previous: ${sign}${delta.toFixed(2)} pp`);
  lines.push(`  Status: ${dropExceeded ? "❌ DROP EXCEEDS THRESHOLD" : "✅ OK"}`);
}
lines.push("");
lines.push("Files (lowest coverage first):");
lines.push("Stmts   Branch  Funcs   Lines   File");
for (const f of files) {
  lines.push(
    `${fmt(f.statements.pct)} ${fmt(f.branches.pct)} ${fmt(f.functions.pct)} ${fmt(f.lines.pct)}  ${f.path}`,
  );
}
writeFileSync(OUT_TXT, lines.join("\n"));

console.log(
  `[coverage-report] Wrote ${files.length} files → ${relative(ROOT, OUT_JSON)} & ${relative(ROOT, OUT_TXT)}`,
);
console.log(
  `[coverage-report] Global statements: ${totals.statements.pct.toFixed(2)}%` +
    (delta != null ? ` (delta ${delta > 0 ? "+" : ""}${delta.toFixed(2)} pp vs previous ${previousPct?.toFixed(2)}%)` : " (no previous baseline)"),
);

if (dropExceeded) {
  const msg =
    `[coverage-report] ❌ Coverage drop of ${Math.abs(delta).toFixed(2)} pp ` +
    `exceeds threshold of ${DROP_THRESHOLD.toFixed(2)} pp ` +
    `(was ${previousPct?.toFixed(2)}%, now ${currentPct.toFixed(2)}%).`;
  console.error(msg);
  if (FAIL_ON_DROP) exit(2);
}

