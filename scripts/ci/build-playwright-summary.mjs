#!/usr/bin/env node
/**
 * Builds a Markdown summary from Playwright's JSON reporter output.
 * Usage:
 *   node scripts/ci/build-playwright-summary.mjs \
 *     --input playwright-report/results.json \
 *     --output playwright-summary.md \
 *     --run-url <github-run-url> \
 *     --status <success|failure|cancelled|skipped>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const input = args.input ?? 'playwright-report/results.json';
const output = args.output ?? 'playwright-summary.md';
const runUrl = args['run-url'] ?? '';
const status = args.status ?? 'unknown';

const statusEmoji =
  {
    success: '✅',
    failure: '❌',
    cancelled: '⚠️',
    skipped: '⏭️',
  }[status] ?? 'ℹ️';

let stats = { passed: 0, failed: 0, flaky: 0, skipped: 0, total: 0, duration: 0 };
const failures = [];

function walkSuite(suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      stats.total += 1;
      const results = test.results ?? [];
      const last = results[results.length - 1] ?? {};
      const outcome = test.status ?? last.status ?? 'unknown';
      stats.duration += results.reduce((a, r) => a + (r.duration ?? 0), 0);
      if (outcome === 'expected') stats.passed += 1;
      else if (outcome === 'skipped') stats.skipped += 1;
      else if (outcome === 'flaky') {
        stats.flaky += 1;
        stats.passed += 1;
      } else {
        stats.failed += 1;
        const errorMsg = (last.error?.message ?? '').split('\n')[0].slice(0, 200);
        failures.push({
          title: `${suite.title} › ${spec.title}`,
          error: errorMsg,
          file: spec.file,
        });
      }
    }
  }
  for (const child of suite.suites ?? []) walkSuite(child);
}

if (!existsSync(input)) {
  const md = `${statusEmoji} **Status:** \`${status}\`\n\n_No JSON report found at \`${input}\`._\n\n[View full run logs](${runUrl})\n`;
  writeFileSync(output, md);
  process.exit(0);
}

try {
  const report = JSON.parse(readFileSync(input, 'utf8'));
  for (const suite of report.suites ?? []) walkSuite(suite);
} catch (err) {
  const md = `${statusEmoji} **Status:** \`${status}\`\n\n_Failed to parse report: ${err.message}_\n\n[View full run logs](${runUrl})\n`;
  writeFileSync(output, md);
  process.exit(0);
}

const durationSec = (stats.duration / 1000).toFixed(1);

const lines = [];
lines.push(`${statusEmoji} **Status:** \`${status}\` · **Duration:** ${durationSec}s`);
lines.push('');
lines.push('| Passed | Failed | Flaky | Skipped | Total |');
lines.push('|-------:|-------:|------:|--------:|------:|');
lines.push(
  `| ${stats.passed} | ${stats.failed} | ${stats.flaky} | ${stats.skipped} | ${stats.total} |`
);
lines.push('');

if (failures.length > 0) {
  lines.push(`#### ❌ Failures (${failures.length})`);
  lines.push('');
  for (const f of failures.slice(0, 20)) {
    lines.push(`- **${f.title}**`);
    if (f.file) lines.push(`  \`${f.file}\``);
    if (f.error) lines.push(`  > ${f.error.replace(/\|/g, '\\|')}`);
  }
  if (failures.length > 20) lines.push(`\n_…and ${failures.length - 20} more._`);
  lines.push('');
}

lines.push(`📎 **Artifacts:** HTML report and traces are attached to the workflow run.`);
lines.push('');
lines.push(`[🔗 View full run logs & download report](${runUrl})`);
lines.push('');

writeFileSync(output, lines.join('\n'));
console.log(`Wrote summary to ${output}`);
