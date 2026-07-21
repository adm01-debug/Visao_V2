# Onda Storage 18 — Alertmanager + Grafana Provisioning

**Status:** ✅ 10/10 — 697/697 cenários aprovados

## Entregas
- `observability/prometheus/visao-tiering.rules.yml` — 6 alertas (SLO violated/risk, success ratio, Glacier stuck, spike de alertas, métricas ausentes) com `for`, `severity`, `runbook`.
- `observability/prometheus/alertmanager.yml` — routing por severidade (critical→PagerDuty, warning→Telegram Ops) + inibição.
- `observability/grafana/visao-tiering-dashboard.json` — dashboard `visao-tiering` (schemaVersion 39) com 6 painéis, variável `$operation`, mapeamento de status SLO, thresholds visuais.
- `observability/README.md` — instruções de provisionamento.

## Cobertura de simulação
- YAML parse + presença dos 6 alertas obrigatórios
- `for` / `severity` / `annotations` em todas as regras
- Dashboard: UID, schema, refresh, targets com expr em todos os painéis
- 700 cenários sintéticos de threshold (violated/risk/no_data/success_low/glacier_stuck/spike + ruído)

## Próxima onda (19)
Runbooks executáveis em Markdown versionados em `docs/runbooks/` referenciados pelos alertas.
