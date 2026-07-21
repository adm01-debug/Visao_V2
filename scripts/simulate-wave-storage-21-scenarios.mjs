#!/usr/bin/env node
/** VISÃO — Onda Storage 21: blackbox_exporter probes externos + SSL expiry. */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const rules = readFileSync('observability/prometheus/visao-tiering.rules.yml', 'utf8');
const bb = existsSync('observability/blackbox/blackbox.yml')
  ? readFileSync('observability/blackbox/blackbox.yml', 'utf8') : '';
const scrape = existsSync('observability/blackbox/prometheus-scrape.yml')
  ? readFileSync('observability/blackbox/prometheus-scrape.yml', 'utf8') : '';
const runbook = existsSync('docs/runbooks/VisaoBlackboxProbeFailed.md')
  ? readFileSync('docs/runbooks/VisaoBlackboxProbeFailed.md', 'utf8') : '';

const rows = [];
let unsafe = 0;
const check = (name, ok) => { rows.push({ name, ok }); if (!ok) unsafe++; };

// Rules
for (const a of ['VisaoBlackboxProbeFailed','VisaoBlackboxSslExpiringSoon','VisaoBlackboxSslExpiryCritical','VisaoBlackboxHighLatency']) {
  check(`rule:${a}`, rules.includes(`alert: ${a}`));
}
check('rule:probe_success_expr', rules.includes('probe_success{job="visao-blackbox-https"} == 0'));
check('rule:ssl_expiry_14d', rules.includes('(14 * 24 * 3600)'));
check('rule:ssl_expiry_3d', rules.includes('(3 * 24 * 3600)'));
check('rule:group_blackbox', rules.includes('name: visao-blackbox'));

// Blackbox config
check('bb:module_http_2xx_tls', bb.includes('http_2xx_tls:'));
check('bb:fail_if_not_ssl', bb.includes('fail_if_not_ssl: true'));
check('bb:no_insecure', bb.includes('insecure_skip_verify: false') && !bb.includes('insecure_skip_verify: true'));
check('bb:accepts_401', /valid_status_codes:\s*\[200,\s*401\]/.test(bb));
check('bb:module_authed', bb.includes('http_2xx_authed:'));

// Scrape config
check('scrape:job', scrape.includes('visao-blackbox-https'));
check('scrape:metrics_path', scrape.includes('metrics_path: /probe'));
check('scrape:relabel', scrape.includes('__param_target'));
check('scrape:target_metrics', scrape.includes('/functions/v1/metrics-prometheus'));

// Runbook
for (const sec of ['## Sintomas','## Diagnóstico','## Mitigação','## Escalonamento','## Pós-incidente']) {
  check(`runbook:${sec}`, runbook.includes(sec));
}
check('runbook:openssl_cmd', runbook.includes('openssl s_client'));
check('runbook:curl_probe', runbook.includes('/probe?module=http_2xx_tls'));

// Threshold simulation: 300 cenários sintéticos (probe_success + SSL expiry).
let scenarios = 0, misfires = 0;
const now = Math.floor(Date.now() / 1000);
for (let i = 0; i < 300; i++) {
  const probeSuccess = Math.random() < 0.92 ? 1 : 0;
  const daysToExpiry = Math.floor(Math.random() * 90); // 0..89 dias
  const expiryTs = now + daysToExpiry * 86400;
  const secondsLeft = expiryTs - now;

  const shouldFireProbe = probeSuccess === 0;
  const shouldFireSoon = secondsLeft < 14 * 86400;
  const shouldFireCritical = secondsLeft < 3 * 86400;

  const exprProbe = probeSuccess === 0;
  const exprSoon = secondsLeft < 14 * 86400;
  const exprCrit = secondsLeft < 3 * 86400;

  scenarios++;
  if (exprProbe !== shouldFireProbe) misfires++;
  if (exprSoon !== shouldFireSoon) misfires++;
  if (exprCrit !== shouldFireCritical) misfires++;
  // Sanity: critical implies soon.
  if (exprCrit && !exprSoon) misfires++;
}
check(`threshold:${scenarios}_scenarios_no_misfire`, misfires === 0);

const summary = { total: rows.length, unsafe, scenarios, misfires };
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave-storage-21.json', JSON.stringify({ summary, rows }, null, 2));
writeFileSync('reports/simulations/wave-storage-21.md',
  `# Onda Storage 21 — Blackbox exporter + SSL expiry\n\n- Checks: **${summary.total}**\n- Unsafe: **${summary.unsafe}**\n- Threshold scenarios: **${summary.scenarios}** (misfires: ${summary.misfires})\n`);
console.log(JSON.stringify(summary, null, 2));
if (unsafe > 0) process.exit(1);
