#!/usr/bin/env node
/**
 * VISÃO — Onda Storage 25: CI Deploy Freeze Guard
 *
 * Consulta Prometheus pela métrica `visao:deploy_freeze:active`.
 * Se == 1 → exit 1 (bloqueia pipeline).
 * Se PROMETHEUS_URL não estiver configurado → exit 0 (aviso, nada a consultar).
 * Se Prometheus indisponível → comportamento depende de FREEZE_FAIL_MODE
 *   - "closed" (default em produção): exit 1 (fail-safe, prioriza segurança)
 *   - "open"   (default em preview): exit 0 (não bloqueia builds de PR)
 *
 * Bypass emergencial: variável BYPASS_DEPLOY_FREEZE=true (auditado nos logs).
 */
const PROM_URL = process.env.PROMETHEUS_URL || '';
const PROM_TOKEN = process.env.PROMETHEUS_TOKEN || '';
const FAIL_MODE = (process.env.FREEZE_FAIL_MODE || 'closed').toLowerCase();
const BYPASS = String(process.env.BYPASS_DEPLOY_FREEZE || '').toLowerCase() === 'true';
const QUERY = 'visao:deploy_freeze:active';
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RUNBOOK = 'https://github.com/visao/docs/runbooks/VisaoDeployFreezeActive.md';
const DASHBOARD = 'https://grafana/d/visao-slo';

function log(level, msg, extra = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...extra };
  console.log(JSON.stringify(entry));
}

if (BYPASS) {
  log('warn', 'deploy_freeze_bypassed', {
    actor: process.env.GITHUB_ACTOR || 'local',
    runbook: RUNBOOK,
  });
  process.exit(0);
}

// Sem PROMETHEUS_URL o monitoramento de SLO não está configurado neste
// repositório: não existe freeze a consultar. Falhar aqui deixava todo push
// na main vermelho sem proteger nada. "closed" continua valendo quando o
// Prometheus está configurado mas indisponível ou responde com erro.
if (!PROM_URL) {
  log('warn', 'prometheus_not_configured_skip', { fail_mode: FAIL_MODE });
  process.exit(0);
}

async function queryPrometheus() {
  const url = `${PROM_URL.replace(/\/$/, '')}/api/v1/query?query=${encodeURIComponent(QUERY)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { Accept: 'application/json' };
    if (PROM_TOKEN) headers.Authorization = `Bearer ${PROM_TOKEN}`;
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body?.status !== 'success') throw new Error(`prom_status_${body?.status}`);
    const val = body?.data?.result?.[0]?.value?.[1];
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const value = await queryPrometheus();
      if (value === null) {
        log('warn', 'metric_absent', { query: QUERY, attempt });
        // Métrica ausente é tratada como indisponibilidade.
        lastErr = new Error('metric_null');
      } else if (value >= 1) {
        log('error', 'deploy_freeze_active', { value, runbook: RUNBOOK, dashboard: DASHBOARD });
        console.error(
          `\n🚫 DEPLOY BLOQUEADO — SLO em estado de freeze.\n   Runbook: ${RUNBOOK}\n   Dashboard: ${DASHBOARD}\n`
        );
        process.exit(1);
      } else {
        log('info', 'deploy_freeze_inactive', { value });
        process.exit(0);
      }
    } catch (err) {
      lastErr = err;
      log('warn', 'prometheus_query_failed', { attempt, error: String(err?.message || err) });
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
  }
  log('error', 'prometheus_unreachable', {
    fail_mode: FAIL_MODE,
    error: String(lastErr?.message || lastErr),
  });
  process.exit(FAIL_MODE === 'open' ? 0 : 1);
}

main().catch((err) => {
  log('error', 'unexpected_error', { error: String(err?.message || err) });
  process.exit(FAIL_MODE === 'open' ? 0 : 1);
});
