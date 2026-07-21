# Onda Storage 19 — Runbooks executáveis

**Status:** ✅ 10/10 — 43/43 validações aprovadas

## Entregas
- `docs/runbooks/README.md` — índice com severidade, alerta e caminho.
- 6 runbooks (`VisaoTieringSloViolated`, `VisaoTieringSloAtRisk`, `VisaoTieringSuccessRatioLow`, `VisaoGlacierRestoreStuck`, `VisaoGlacierStuckAlertsSpike`, `VisaoTieringMetricsAbsent`) com estrutura padrão: Sintomas → Diagnóstico → Mitigação → Escalonamento → Pós-incidente.
- Comandos prontos: SQL (`get_storage_tiering_slo`, `storage_tiering_runs`, `glacier_stuck_alerts`, `pg_locks`, `cron.alter_job`), `supabase functions logs/deploy/secrets`, `curl` para exporter e resolver, `aws s3api` para triagem Glacier.
- Cross-check automatizado com `visao-tiering.rules.yml` (todos os 6 alertas referenciados).

## Validação
- Cada runbook contém as 5 seções obrigatórias + bloco de código executável.
- Alertas do YAML batem 1:1 com arquivos em `docs/runbooks/`.
- Script: `scripts/simulate-wave-storage-19-scenarios.mjs` (43 checks, 0 unsafe).

## Próxima onda (20)
Dead-man's switch para o exporter Prometheus + alerta de scrape ausente.
