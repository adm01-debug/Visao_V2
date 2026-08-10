# QA Run — Onda Storage 25 (Alertmanager Routing + Deploy Freeze)

**Data:** 2026-07-21 · **Engenheiro:** SRE Bot · **Status:** ✅ Aprovado

## Entregas

| Item                  | Arquivo                                                      |
| --------------------- | ------------------------------------------------------------ |
| Routing Alertmanager  | `observability/alertmanager/visao-routing.yml`               |
| Recording rule freeze | `observability/prometheus/visao-deploy-freeze.recording.yml` |
| Script CI             | `scripts/ci/check-deploy-freeze.mjs`                         |
| Workflow GHA          | `.github/workflows/deploy-freeze-check.yml`                  |
| Runbook               | `docs/runbooks/VisaoDeployFreezeActive.md`                   |
| Simulação             | `scripts/simulate-wave-storage-25-scenarios.mjs`             |

## Matriz de decisão de routing

| Severity | Janela         | Team     | Receiver                                       |
| -------- | -------------- | -------- | ---------------------------------------------- |
| critical | qualquer       | qualquer | telegram-oncall + pagerduty-oncall (repeat 1h) |
| warning  | business_hours | storage  | slack-storage                                  |
| warning  | business_hours | backend  | slack-backend                                  |
| warning  | business_hours | sre      | slack-warnings                                 |
| warning  | after_hours    | qualquer | ticket-jira                                    |
| info     | qualquer       | qualquer | ticket-jira                                    |

## Inhibitions validadas

- fast burn (crit) → silencia medium/slow do mesmo SLO ✅
- medium (crit) → silencia slow ✅
- critical → silencia warning (alertname+slo+region) ✅
- deploy freeze → silencia BudgetLow do mesmo SLO ✅

## Freeze logic

`visao:deploy_freeze:active = 1` sse:

- error budget consumido > 50% (metrics 30d, app 30d ou tiering 7d), **OU**
- fast burn (≥ 14.4x) em janela curta E longa simultaneamente por ≥ 2m.

## CI resiliência

| Estado Prometheus         | fail_mode=open  | fail_mode=closed |
| ------------------------- | --------------- | ---------------- |
| 200 · value=0             | exit 0          | exit 0           |
| 200 · value=1             | exit 1          | exit 1           |
| 200 · value=null          | exit 0          | exit 1           |
| 500                       | exit 0          | exit 1           |
| timeout                   | exit 0          | exit 1           |
| BYPASS_DEPLOY_FREEZE=true | exit 0 (logado) | exit 0 (logado)  |

## Comandos de reprodução

```bash
node scripts/simulate-wave-storage-25-scenarios.mjs
PROMETHEUS_URL=https://prom.internal FREEZE_FAIL_MODE=closed \
  node scripts/ci/check-deploy-freeze.mjs
```

## Critério de aceite

- [x] 100% dos checks estruturais.
- [x] 0 misfires em ≥ 500 cenários.
- [x] Fast burn + budget < 50% → deploy bloqueado.
- [x] Inhibitions eliminam ruído multi-burn-rate.
- [x] CI resiliente a Prometheus indisponível.
