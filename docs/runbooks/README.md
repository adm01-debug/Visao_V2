# Runbooks — VISÃO Storage Tiering

Runbooks executáveis para cada alerta configurado em `observability/prometheus/visao-tiering.rules.yml`. Cada arquivo segue o mesmo esqueleto: **Sintomas → Diagnóstico → Mitigação → Escalonamento → Pós-incidente**, com comandos prontos para copiar (psql, curl, supabase CLI).

## Alertas cobertos

| Severidade | Alerta | Runbook |
|---|---|---|
| 🔴 critical | `VisaoTieringSloViolated` | [`VisaoTieringSloViolated.md`](./VisaoTieringSloViolated.md) |
| 🟡 warning | `VisaoTieringSloAtRisk` | [`VisaoTieringSloAtRisk.md`](./VisaoTieringSloAtRisk.md) |
| 🟡 warning | `VisaoTieringSuccessRatioLow` | [`VisaoTieringSuccessRatioLow.md`](./VisaoTieringSuccessRatioLow.md) |
| 🔴 critical | `VisaoGlacierRestoreStuck` | [`VisaoGlacierRestoreStuck.md`](./VisaoGlacierRestoreStuck.md) |
| 🟡 warning | `VisaoGlacierStuckAlertsSpike` | [`VisaoGlacierStuckAlertsSpike.md`](./VisaoGlacierStuckAlertsSpike.md) |
| 🟡 warning | `VisaoTieringMetricsAbsent` | [`VisaoTieringMetricsAbsent.md`](./VisaoTieringMetricsAbsent.md) |
| 🔴 critical | `VisaoMetricsExporterDown` / `Absent` / `HeartbeatStale` | [`VisaoMetricsExporterDown.md`](./VisaoMetricsExporterDown.md) |

## Convenções

- Comandos assumem `PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (fora do Lovable Cloud) exportados no shell do operador.
- Consultas SQL rodam via `psql` conectado ao banco Postgres do backend ou via SQL Editor.
- Painéis de referência: dashboard Grafana `visao-tiering` e página `/operations` (admin).
- Escalonamento default: **critical → PagerDuty (SRE on-call) em 15min**, **warning → canal Telegram Ops em 30min**.
